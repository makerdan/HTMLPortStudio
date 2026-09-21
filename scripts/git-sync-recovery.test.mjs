import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  decideGitSyncRecovery,
  formatGitSyncRecoveryReport,
  inspectGitSyncRecovery,
} from "./git-sync-recovery.mjs";

function git(directory, ...args) {
  const result = spawnSync("git", args, {
    cwd: directory,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function gitResult(directory, ...args) {
  return spawnSync("git", args, {
    cwd: directory,
    encoding: "utf8",
  });
}

function createFixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "git-sync-recovery-"),
  );
  git(directory, "init", "--initial-branch=main");
  git(directory, "config", "user.name", "Git Sync Recovery Test");
  git(directory, "config", "user.email", "git-sync-recovery@example.invalid");

  fs.writeFileSync(path.join(directory, "base.txt"), "base\n");
  git(directory, "add", "base.txt");
  git(directory, "commit", "-m", "base");
  const base = git(directory, "rev-parse", "HEAD");

  fs.writeFileSync(path.join(directory, "local.txt"), "local\n");
  git(directory, "add", "local.txt");
  git(directory, "commit", "-m", "local-only");
  const local = git(directory, "rev-parse", "HEAD");

  git(directory, "branch", "remote-main", base);
  git(directory, "switch", "remote-main");
  fs.writeFileSync(path.join(directory, "remote.txt"), "remote\n");
  git(directory, "add", "remote.txt");
  git(directory, "commit", "-m", "remote-only");
  const remote = git(directory, "rev-parse", "HEAD");
  git(directory, "switch", "main");

  return {
    directory,
    base,
    local,
    remote,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

function createConflictingFixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "git-sync-recovery-conflict-"),
  );
  git(directory, "init", "--initial-branch=main");
  git(directory, "config", "user.name", "Git Sync Recovery Test");
  git(directory, "config", "user.email", "git-sync-recovery@example.invalid");

  fs.writeFileSync(path.join(directory, "shared.txt"), "base\n");
  git(directory, "add", "shared.txt");
  git(directory, "commit", "-m", "base");
  const base = git(directory, "rev-parse", "HEAD");

  fs.writeFileSync(path.join(directory, "shared.txt"), "local\n");
  git(directory, "add", "shared.txt");
  git(directory, "commit", "-m", "local-edit");
  const local = git(directory, "rev-parse", "HEAD");

  git(directory, "branch", "remote-main", base);
  git(directory, "switch", "remote-main");
  fs.writeFileSync(path.join(directory, "shared.txt"), "remote\n");
  git(directory, "add", "shared.txt");
  git(directory, "commit", "-m", "remote-edit");
  const remote = git(directory, "rev-parse", "HEAD");
  git(directory, "switch", "main");

  return {
    directory,
    base,
    local,
    remote,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

test("divergent recovery preserves both histories and never selects force push", () => {
  const fixture = createFixture();
  try {
    const plan = decideGitSyncRecovery({
      remoteAuthenticated: true,
      localIsAncestorOfRemote: false,
      remoteIsAncestorOfLocal: false,
    });
    assert.equal(plan.action, "reconcile-divergent-history");
    assert.equal(plan.pushMode, "none");
    assert.equal(plan.preservesRemoteHistory, true);

    git(fixture.directory, "merge", "--no-edit", "remote-main");
    const reconciled = git(fixture.directory, "rev-parse", "HEAD");
    assert.equal(
      git(
        fixture.directory,
        "merge-base",
        "--is-ancestor",
        fixture.local,
        reconciled,
      ),
      "",
    );
    assert.equal(
      git(
        fixture.directory,
        "merge-base",
        "--is-ancestor",
        fixture.remote,
        reconciled,
      ),
      "",
    );
    assert.equal(
      git(fixture.directory, "show", `${reconciled}:local.txt`),
      "local",
    );
    assert.equal(
      git(fixture.directory, "show", `${reconciled}:remote.txt`),
      "remote",
    );
    assert.equal(
      git(fixture.directory, "show", `${fixture.remote}:remote.txt`),
      "remote",
    );
  } finally {
    fixture.cleanup();
  }
});

test("conflicting divergent recovery stops before pushing and keeps both tips reachable", () => {
  const fixture = createConflictingFixture();
  try {
    const plan = decideGitSyncRecovery({
      remoteAuthenticated: true,
      localIsAncestorOfRemote: false,
      remoteIsAncestorOfLocal: false,
    });
    assert.equal(plan.action, "reconcile-divergent-history");
    assert.equal(plan.pushMode, "none");
    assert.equal(plan.preservesRemoteHistory, true);

    const merge = gitResult(
      fixture.directory,
      "merge",
      "--no-edit",
      "remote-main",
    );
    assert.notEqual(merge.status, 0, merge.stderr);
    assert.match(
      git(fixture.directory, "status", "--porcelain"),
      /^UU shared\.txt$/m,
    );
    assert.notEqual(git(fixture.directory, "ls-files", "-u"), "");
    assert.match(
      fs.readFileSync(path.join(fixture.directory, "shared.txt"), "utf8"),
      /local/,
    );
    assert.match(
      fs.readFileSync(path.join(fixture.directory, "shared.txt"), "utf8"),
      /remote/,
    );

    assert.equal(git(fixture.directory, "rev-parse", "main"), fixture.local);
    assert.equal(
      git(fixture.directory, "rev-parse", "remote-main"),
      fixture.remote,
    );
    assert.equal(
      git(
        fixture.directory,
        "merge-base",
        "--is-ancestor",
        fixture.local,
        "main",
      ),
      "",
    );
    assert.equal(
      git(
        fixture.directory,
        "merge-base",
        "--is-ancestor",
        fixture.remote,
        "remote-main",
      ),
      "",
    );
  } finally {
    fixture.cleanup();
  }
});

test("remote-ahead recovery stops for reconciliation instead of force pushing", () => {
  const plan = decideGitSyncRecovery({
    remoteAuthenticated: true,
    localIsAncestorOfRemote: true,
    remoteIsAncestorOfLocal: false,
  });
  assert.equal(plan.action, "reconcile-remote-ahead");
  assert.equal(plan.pushMode, "none");
  assert.equal(plan.preservesRemoteHistory, true);
});

test("local-ahead recovery permits only a normal push", () => {
  const plan = decideGitSyncRecovery({
    remoteAuthenticated: true,
    localIsAncestorOfRemote: false,
    remoteIsAncestorOfLocal: true,
  });
  assert.equal(plan.action, "normal-push");
  assert.equal(plan.pushMode, "normal");
  assert.equal(plan.preservesRemoteHistory, true);
});

test("rejected authentication stops before any push mode is selected", () => {
  const plan = decideGitSyncRecovery({
    remoteAuthenticated: false,
    localIsAncestorOfRemote: false,
    remoteIsAncestorOfLocal: false,
  });
  assert.equal(plan.action, "blocked-authentication");
  assert.equal(plan.pushMode, "none");
  assert.equal(plan.preservesRemoteHistory, true);
});

test("read-only report identifies a local-ahead branch and backup references", () => {
  const fixture = createFixture();
  const remoteDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "git-sync-recovery-remote-"),
  );
  try {
    git(remoteDirectory, "init", "--bare");
    git(fixture.directory, "remote", "add", "publish", remoteDirectory);
    git(fixture.directory, "push", "-u", "publish", "HEAD:refs/heads/main");
    fs.writeFileSync(path.join(fixture.directory, "after-push.txt"), "ahead\n");
    git(fixture.directory, "add", "after-push.txt");
    git(fixture.directory, "commit", "-m", "local-ahead");
    git(fixture.directory, "update-ref", "refs/backup/rejected-push", "HEAD");
    const refsBefore = git(
      fixture.directory,
      "for-each-ref",
      "--format=%(refname)",
    );

    const report = inspectGitSyncRecovery({ cwd: fixture.directory });
    const output = formatGitSyncRecoveryReport(report);

    assert.equal(report.readOnly, true);
    assert.equal(report.pushTarget.remote, "publish");
    assert.equal(report.pushTarget.ref, "refs/heads/main");
    assert.equal(report.history, "ahead");
    assert.equal(report.readiness, "ready");
    assert.equal(report.workingTree.state, "clean");
    assert.deepEqual(report.backupReferences, ["refs/backup/rejected-push"]);
    assert.match(output, /Fresh remote tip: [0-9a-f]{40}/);
    assert.match(output, /Ready for a normal push/);
    assert.equal(
      git(fixture.directory, "for-each-ref", "--format=%(refname)"),
      refsBefore,
    );
  } finally {
    fixture.cleanup();
    fs.rmSync(remoteDirectory, { recursive: true, force: true });
  }
});

test("blocked remote inspection explains the access blocker without credentials", () => {
  const gitCalls = [];
  const fakeGit = (_cwd, args) => {
    gitCalls.push(args);
    const command = args[0];
    if (command === "symbolic-ref") {
      return { status: 0, stdout: "main\n", stderr: "" };
    }
    if (command === "status" || command === "for-each-ref") {
      return { status: 0, stdout: "", stderr: "" };
    }
    if (command === "rev-parse") {
      return {
        status: 0,
        stdout: "0123456789012345678901234567890123456789\n",
        stderr: "",
      };
    }
    if (command === "cat-file") {
      return { status: 0, stdout: "", stderr: "" };
    }
    if (command === "config") {
      const key = args.at(-1);
      if (key === "branch.main.remote") {
        return { status: 0, stdout: "publish\n", stderr: "" };
      }
      if (key === "branch.main.merge") {
        return { status: 0, stdout: "refs/heads/main\n", stderr: "" };
      }
      if (key === "remote.publish.url") {
        return {
          status: 0,
          stdout: "https://user:secret@example.invalid/repo.git\n",
          stderr: "",
        };
      }
      return { status: 1, stdout: "", stderr: "" };
    }
    if (command === "ls-remote") {
      return {
        status: 128,
        stdout: "",
        stderr:
          "fatal: Authentication failed for 'https://user:secret@example.invalid/repo.git'",
      };
    }
    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };

  const report = inspectGitSyncRecovery({ cwd: "/tmp/recovery", git: fakeGit });
  const output = formatGitSyncRecoveryReport(report);

  assert.equal(report.readiness, "blocked");
  assert.equal(report.blocker.code, "remote-inspection-failed");
  assert.match(report.blocker.message, /Authentication or access/);
  assert.equal(
    report.pushTarget.url,
    "https://%3Credacted%3E:%3Credacted%3E@example.invalid/repo.git",
  );
  assert.doesNotMatch(output, /secret|user/);
  assert.match(output, /Do not push and do not force-push/);
  assert.equal(
    gitCalls.some((args) => args[0] === "push" || args[0] === "update-ref"),
    false,
  );
});
