/**
 * Decide how a checked-out branch may recover after a rejected push.
 *
 * This function deliberately does not run Git commands or push anything. The
 * caller must first inspect the authenticated remote and establish the
 * ancestry facts from fresh refs.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function decideGitSyncRecovery({
  remoteAuthenticated,
  localIsAncestorOfRemote,
  remoteIsAncestorOfLocal,
  tipsMatch = false,
}) {
  if (!remoteAuthenticated) {
    return {
      action: "blocked-authentication",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  if (tipsMatch) {
    return {
      action: "already-synced",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  if (localIsAncestorOfRemote) {
    return {
      action: "reconcile-remote-ahead",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  if (!remoteIsAncestorOfLocal) {
    return {
      action: "reconcile-divergent-history",
      pushMode: "none",
      preservesRemoteHistory: true,
    };
  }

  return {
    action: "normal-push",
    pushMode: "normal",
    preservesRemoteHistory: true,
  };
}

function runGit(cwd, args, env = process.env) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...env,
      GIT_TERMINAL_PROMPT: "0",
    },
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.error?.message || result.stderr || "",
  };
}

function firstLine(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function configValue(cwd, key, git = runGit) {
  const result = git(cwd, ["config", "--get", key]);
  return result.status === 0 ? firstLine(result.stdout) || null : null;
}

function configValues(cwd, key, git = runGit) {
  const result = git(cwd, ["config", "--get-all", key]);
  return result.status === 0
    ? result.stdout
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
}

function redactUrl(value) {
  if (!value) return value;

  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      parsed.username = "<redacted>";
      parsed.password = "<redacted>";
    }
    for (const key of [
      "access_token",
      "auth",
      "authorization",
      "password",
      " token",
    ]) {
      if (parsed.searchParams.has(key.trim())) {
        parsed.searchParams.set(key.trim(), "<redacted>");
      }
    }
    return parsed.toString();
  } catch {
    return value.replace(
      /([a-z][a-z0-9+.-]*:\/\/)([^/\s:@]+)(?::[^/\s@]*)?@/gi,
      "$1<redacted>@",
    );
  }
}

function redactText(value) {
  return String(value ?? "")
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^\s'"]+)/gi, (url) => redactUrl(url))
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+)\b/g,
      "<redacted>",
    )
    .replace(
      /\b(password|passwd|token|secret|authorization|credential)(\s*[:=]\s*)\S+/gi,
      "$1$2<redacted>",
    );
}

function remoteBranchRef(value, fallback) {
  if (!value) return `refs/heads/${fallback}`;
  return value.startsWith("refs/") ? value : `refs/heads/${value}`;
}

function selectedPushTarget(cwd, branch, git = runGit) {
  const remote =
    configValue(cwd, `branch.${branch}.pushRemote`, git) ||
    configValue(cwd, "remote.pushDefault", git) ||
    configValue(cwd, `branch.${branch}.remote`, git) ||
    "origin";
  const configuredBranch =
    configValue(cwd, `branch.${branch}.merge`, git) || `refs/heads/${branch}`;
  const remoteRef = remoteBranchRef(configuredBranch, branch);
  const pushUrls = configValues(cwd, `remote.${remote}.pushurl`, git);
  const fetchUrls = configValues(cwd, `remote.${remote}.url`, git);
  const url = pushUrls[0] || fetchUrls[0] || null;

  return {
    remote,
    branch: remoteRef.replace(/^refs\/heads\//, ""),
    ref: remoteRef,
    url,
    displayUrl: redactUrl(url),
  };
}

function workingTreeState(cwd, git = runGit) {
  const result = git(cwd, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  if (result.status !== 0) {
    return {
      ok: false,
      state: "unknown",
      error:
        redactText(result.stderr) || "Git could not inspect the working tree.",
    };
  }

  const entries = result.stdout.split(/\r?\n/).filter(Boolean);
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  for (const entry of entries) {
    const index = entry[0];
    const worktree = entry[1];
    if (index === "?" && worktree === "?") {
      untracked += 1;
    } else {
      if (index && index !== " ") staged += 1;
      if (worktree && worktree !== " ") unstaged += 1;
    }
  }

  return {
    ok: true,
    state: entries.length === 0 ? "clean" : "dirty",
    changedEntries: entries.length,
    staged,
    unstaged,
    untracked,
  };
}

function backupReferences(cwd, git = runGit) {
  const result = git(cwd, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/backup/",
    "refs/original/",
    "refs/rewritten/",
    "refs/safety/",
    "refs/heads/backup/",
  ]);
  if (result.status !== 0) {
    return {
      ok: false,
      refs: [],
      error:
        redactText(result.stderr) || "Git could not inspect backup references.",
    };
  }

  return {
    ok: true,
    refs: [
      ...new Set(
        result.stdout
          .split(/\r?\n/)
          .map((ref) => ref.trim())
          .filter(Boolean),
      ),
    ],
  };
}

function historyRelationship({
  tipsMatch,
  localIsAncestorOfRemote,
  remoteIsAncestorOfLocal,
}) {
  if (tipsMatch) return "synchronized";
  if (remoteIsAncestorOfLocal) return "ahead";
  if (localIsAncestorOfRemote) return "behind";
  return "divergent";
}

function blockerReport(report, code, message, detail = null) {
  return {
    ...report,
    readiness: "blocked",
    blocker: {
      code,
      message,
      detail: detail ? redactText(detail) : null,
    },
    recommendation:
      "Do not push and do not force-push. Resolve the blocker, then run this read-only report again.",
    forcePush: "never",
  };
}

/**
 * Gather fresh, read-only evidence for a rejected push.
 *
 * The remote tip is read from the configured push URL with `git ls-remote`;
 * this intentionally does not update tracking refs. The returned report only
 * contains commit IDs, ref names, counts, and redacted diagnostics.
 */
export function inspectGitSyncRecovery({
  cwd = process.cwd(),
  git = runGit,
} = {}) {
  const report = {
    cwd: path.resolve(cwd),
    readOnly: true,
    branch: null,
    localTip: null,
    remoteTip: null,
    pushTarget: null,
    history: "unknown",
    workingTree: null,
    backupReferences: [],
    decision: null,
  };

  const branchResult = git(cwd, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  const branch = firstLine(branchResult.stdout);
  report.workingTree = workingTreeState(cwd, git);
  const backups = backupReferences(cwd, git);
  report.backupReferences = backups.refs;

  if (branchResult.status !== 0 || !branch) {
    return blockerReport(
      report,
      "detached-head",
      "The checkout is not on a named branch, so no configured push target can be selected.",
    );
  }
  report.branch = branch;

  const localResult = git(cwd, ["rev-parse", "--verify", "HEAD^{commit}"]);
  const localTip = firstLine(localResult.stdout);
  if (localResult.status !== 0 || !localTip) {
    return blockerReport(
      report,
      "local-tip-unavailable",
      "The local branch tip could not be read; no push recommendation is safe.",
      localResult.stderr,
    );
  }
  report.localTip = localTip;

  const target = selectedPushTarget(cwd, branch, git);
  report.pushTarget = {
    remote: target.remote,
    branch: target.branch,
    ref: target.ref,
    url: target.displayUrl,
  };
  if (!target.url) {
    return blockerReport(
      report,
      "push-target-unconfigured",
      `No URL is configured for the selected push remote "${target.remote}".`,
    );
  }

  const remoteResult = git(cwd, [
    "ls-remote",
    "--heads",
    "--exit-code",
    target.url,
    target.ref,
  ]);
  const remoteLine = firstLine(remoteResult.stdout);
  const remoteTip = remoteLine?.split(/\s+/)[0];
  if (
    remoteResult.status !== 0 ||
    !remoteTip ||
    !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(remoteTip)
  ) {
    const detail =
      remoteResult.stderr ||
      "Git did not return the configured remote branch tip.";
    return blockerReport(
      report,
      remoteResult.status === 2 && !remoteResult.stderr
        ? "remote-branch-not-found"
        : "remote-inspection-failed",
      remoteResult.status === 2 && !remoteResult.stderr
        ? `The configured remote branch "${target.ref}" was not found.`
        : `Authentication or access prevented inspection of the configured remote "${target.remote}".`,
      detail,
    );
  }
  report.remoteTip = remoteTip;

  const remoteObjectResult = git(cwd, [
    "cat-file",
    "-e",
    `${remoteTip}^{commit}`,
  ]);
  if (remoteObjectResult.status !== 0) {
    return blockerReport(
      report,
      "remote-history-unavailable",
      "The fresh remote tip was read, but its history is not available locally for a safe ancestry comparison.",
      remoteObjectResult.stderr ||
        "Fetch the remote history through your normal review process, then run this report again.",
    );
  }

  const localIsAncestorResult = git(cwd, [
    "merge-base",
    "--is-ancestor",
    localTip,
    remoteTip,
  ]);
  const remoteIsAncestorResult = git(cwd, [
    "merge-base",
    "--is-ancestor",
    remoteTip,
    localTip,
  ]);
  if (
    ![0, 1].includes(localIsAncestorResult.status) ||
    ![0, 1].includes(remoteIsAncestorResult.status)
  ) {
    return blockerReport(
      report,
      "ancestry-unavailable",
      "Git could not compare the local and fresh remote tips; no push recommendation is safe.",
      localIsAncestorResult.stderr || remoteIsAncestorResult.stderr,
    );
  }

  const decision = decideGitSyncRecovery({
    remoteAuthenticated: true,
    localIsAncestorOfRemote: localIsAncestorResult.status === 0,
    remoteIsAncestorOfLocal: remoteIsAncestorResult.status === 0,
    tipsMatch: localTip.toLowerCase() === remoteTip.toLowerCase(),
  });
  report.history = historyRelationship({
    tipsMatch: decision.action === "already-synced",
    localIsAncestorOfRemote: localIsAncestorResult.status === 0,
    remoteIsAncestorOfLocal: remoteIsAncestorResult.status === 0,
  });
  report.decision = decision;
  report.readiness =
    decision.action === "normal-push"
      ? "ready"
      : decision.action === "already-synced"
        ? "synchronized"
        : "blocked";
  report.recommendation =
    decision.action === "normal-push"
      ? "Ready for a normal push. Force push is never recommended."
      : decision.action === "already-synced"
        ? "Already synchronized. No push is needed. Force push is never recommended."
        : decision.action === "reconcile-remote-ahead"
          ? "Reconcile the remote-ahead history before any push. Force push is never recommended."
          : "Reconcile the divergent histories before any push. Force push is never recommended.";
  report.forcePush = "never";
  return report;
}

function reportLine(label, value) {
  return `${label}: ${value ?? "unavailable"}`;
}

/**
 * Render a human-readable report without exposing configured credentials.
 */
export function formatGitSyncRecoveryReport(report) {
  const lines = [
    "Git push recovery report (read-only)",
    reportLine(
      "Status",
      report.readiness === "ready"
        ? "READY"
        : report.readiness === "synchronized"
          ? "SYNCHRONIZED"
          : "BLOCKED",
    ),
    reportLine(
      "Push target",
      report.pushTarget
        ? `${report.pushTarget.remote} ${report.pushTarget.ref} (${redactUrl(report.pushTarget.url) || "URL unavailable"})`
        : "unavailable",
    ),
    reportLine("Local branch", report.branch),
    reportLine("Local tip", report.localTip),
    reportLine("Fresh remote tip", report.remoteTip),
    reportLine("History", report.history),
    reportLine(
      "Working tree",
      report.workingTree?.state === "dirty"
        ? `dirty (${report.workingTree.changedEntries} changed entries)`
        : report.workingTree?.state || "unknown",
    ),
    reportLine(
      "Backup references",
      report.backupReferences.length
        ? report.backupReferences.join(", ")
        : "none found",
    ),
    reportLine("Force push", "never recommended"),
  ];

  if (report.blocker) {
    lines.push(reportLine("Blocker", redactText(report.blocker.message)));
    if (report.blocker.detail) {
      lines.push(reportLine("Git detail", redactText(report.blocker.detail)));
    }
  }
  lines.push(reportLine("Next action", report.recommendation));
  return `${lines.join("\n")}\n`;
}

function parseCliArgs(argv) {
  const args = [...argv];
  let cwd = process.cwd();
  let json = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === "--json") {
      json = true;
    } else if (arg === "--cwd" && args[0]) {
      cwd = args.shift();
    } else if (arg === "--help" || arg === "-h") {
      return { help: true, cwd, json };
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { cwd, json };
}

function cli(argv = process.argv.slice(2)) {
  try {
    const options = parseCliArgs(argv);
    if (options.help) {
      process.stdout.write(
        "Usage: node scripts/git-sync-recovery.mjs [--cwd PATH] [--json]\n",
      );
      return 0;
    }
    const report = inspectGitSyncRecovery({ cwd: options.cwd });
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : formatGitSyncRecoveryReport(report),
    );
    return 0;
  } catch (error) {
    process.stderr.write(
      `Unable to create read-only recovery report: ${redactText(error.message)}\n`,
    );
    return 2;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = cli();
}
