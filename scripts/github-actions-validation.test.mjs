import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decidePostMergeBuild } from "./post-merge-build-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const pullRequestWorkflow = fs.readFileSync(
  `${root}/.github/workflows/validation.yml`,
  "utf8",
);
const postMergeWorkflow = fs.readFileSync(
  `${root}/.github/workflows/production-build.yml`,
  "utf8",
);
const githubActionsDocumentation = fs.readFileSync(
  `${root}/docs/validation/github-actions.md`,
  "utf8",
);
const ciEvidenceSource = fs.readFileSync(
  `${root}/scripts/ci-evidence.mjs`,
  "utf8",
);

function jobBlock(workflow, jobName) {
  const marker = `\n  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing ${jobName} job`);
  const remainder = workflow.slice(start + marker.length);
  const next = remainder.search(/\n  [A-Za-z0-9_-]+:\n/);
  return workflow.slice(
    start,
    next === -1 ? undefined : start + marker.length + next,
  );
}

function stableJobBlock(workflow, jobName) {
  const marker = `\n  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  const guidance =
    "See docs/validation/github-actions.md: Checkpoint operating procedure and Rollback procedure.";
  assert.notEqual(
    start,
    -1,
    `stable GitHub job "${jobName}" is missing or renamed. ${guidance}`,
  );
  const block = jobBlock(workflow, jobName);
  assert.match(
    block,
    new RegExp(`\\n\\s+name:\\s+${jobName.replaceAll("-", "[-]")}(?:\\s|$)`),
    `stable GitHub job "${jobName}" display name drifted. ${guidance}`,
  );
  return block;
}

function cleanDiagnosticsScript(workflow, jobName) {
  const diagnostics = jobBlock(workflow, jobName);
  const startMarker = "node <<'NODE'\n";
  const endMarker = "\n          NODE";
  const start = diagnostics.indexOf(startMarker);
  const end = diagnostics.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing clean diagnostics script in ${jobName}`);
  assert.notEqual(end, -1, `unterminated clean diagnostics script in ${jobName}`);
  return diagnostics
    .slice(start + startMarker.length, end)
    .split("\n")
    .map((line) => line.replace(/^          /, ""))
    .join("\n");
}

function runCleanDiagnostics(workflow, jobName, upstream) {
  const directory = fs.mkdtempSync(join(tmpdir(), "ci-diagnostics-"));
  const output = join(directory, "evidence.json");
  const outputCommands = join(directory, "github-output");
  const summary = join(directory, "summary");
  const result = spawnSync(
    process.execPath,
    ["-e", cleanDiagnosticsScript(workflow, jobName)],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        EVIDENCE_OUTPUT: output,
        EVIDENCE_WORKFLOW: "<workflow>\nprovider-secret",
        EVIDENCE_JOB: "<job>\nprovider-secret",
        EVIDENCE_EVENT: "<event>\nprovider-secret",
        EVIDENCE_RUN_ID: "123\nprovider-secret",
        EVIDENCE_RUN_ATTEMPT: "not-an-integer",
        EVIDENCE_SHA: "provider-secret",
        EVIDENCE_REF: "refs/heads/main\nprovider-secret",
        EVIDENCE_ARTIFACT_NAME: "<artifact>\nprovider-secret",
        EVIDENCE_TIER: "<tier>\nprovider-secret",
        EVIDENCE_EXPECTED_SKIPS: "post-merge-build,provider-secret",
        EVIDENCE_UPSTREAM: JSON.stringify(upstream),
        GITHUB_OUTPUT: outputCommands,
        GITHUB_STEP_SUMMARY: summary,
      },
    },
  );
  assert.equal(
    result.status,
    0,
    `${jobName} diagnostics failed: ${result.stderr}`,
  );
  return {
    envelope: JSON.parse(fs.readFileSync(output, "utf8")),
    outputName: fs.readFileSync(outputCommands, "utf8").trim(),
    artifact: fs.readFileSync(output, "utf8"),
  };
}

function decision(overrides = {}) {
  return decidePostMergeBuild({
    currentSha: "current-head",
    currentVerified: false,
    newestCommitUnix: 1_000,
    nowUnix: 1_000 + 1_799,
    commitsSinceLastSuccess: 3,
    ...overrides,
  });
}

test("pull-request aggregate requires the production build and fails closed", () => {
  assert.match(
    pullRequestWorkflow,
    /needs:\n(?:\s+- [^\n]+\n)*\s+- production-build/,
  );
  assert.match(
    pullRequestWorkflow,
    /PRODUCTION_BUILD_RESULT: \$\{\{ needs\.production-build\.result \}\}/,
  );
  assert.match(pullRequestWorkflow, /if \[ "\$result" != "success" \]/);
  assert.match(pullRequestWorkflow, /github\.event_name == 'pull_request'/);
  assert.match(pullRequestWorkflow, /github\.event_name == 'merge_group'/);
});

test("pull requests run the canonical production build with the pinned toolchain", () => {
  assert.match(pullRequestWorkflow, /name: production-build/);
  assert.match(pullRequestWorkflow, /pnpm run production-build/);
  assert.match(pullRequestWorkflow, /pnpm install --frozen-lockfile/);
  assert.match(pullRequestWorkflow, /node-version: 24/);
  assert.match(pullRequestWorkflow, /npm install --global pnpm@10\.26\.1/);
});

test("stable required and post-merge job names stay aligned with checkpoint guidance", () => {
  const aggregate = stableJobBlock(pullRequestWorkflow, "validation");
  for (const jobName of ["test-standard", "validate-api", "production-build"]) {
    stableJobBlock(pullRequestWorkflow, jobName);
    assert.match(
      aggregate,
      new RegExp(`\\n\\s+- ${jobName}\\n`),
      `stable GitHub aggregate no longer requires "${jobName}". See docs/validation/github-actions.md: Checkpoint operating procedure and Rollback procedure.`,
    );
  }
  stableJobBlock(postMergeWorkflow, "post-merge-build");
});

test("post-merge workflow is limited to main pushes and a 30-minute schedule", () => {
  assert.match(postMergeWorkflow, /push:\n\s+branches:\n\s+\s+- main/);
  assert.match(postMergeWorkflow, /schedule:\n\s+- cron: "\*\/30 \* \* \* \*"/);
  assert.doesNotMatch(postMergeWorkflow, /^\s+pull_request:/m);
  assert.match(postMergeWorkflow, /cancel-in-progress: true/);
});

test("post-merge jobs use read-only permissions and no privileged credentials", () => {
  assert.match(
    postMergeWorkflow,
    /permissions:\n\s+contents: read\n\s+actions: read/,
  );
  assert.doesNotMatch(postMergeWorkflow, /secrets\.[A-Z_]+/);
  assert.doesNotMatch(postMergeWorkflow, /CLERK|POE|DATABASE|DEPLOY/i);
  assert.match(postMergeWorkflow, /status=success/);
  assert.match(postMergeWorkflow, /select\(\.name == "post-merge-build"\)/);
  assert.match(postMergeWorkflow, /\[ "\$conclusion" = "success" \]/);
  assert.match(postMergeWorkflow, /pnpm install --frozen-lockfile/);
  assert.match(postMergeWorkflow, /pnpm run production-build/);
});

test("post-merge history inspection uses one bounded successful-run page", () => {
  assert.match(
    postMergeWorkflow,
    /history_page_size=100[\s\S]*status=success&per_page=\$\{history_page_size\}/,
  );
  assert.doesNotMatch(
    postMergeWorkflow,
    /gh api --paginate[\s\S]*actions\/workflows\/production-build\.yml\/runs/,
  );
});

test("post-merge policy requires four commits or a quiet window", () => {
  assert.equal(decision().run, false);
  assert.equal(decision({ commitsSinceLastSuccess: 4 }).run, true);
  assert.equal(decision({ nowUnix: 1_000 + 1_800 }).run, true);
});

test("a successful current head is deduplicated before eligibility checks", () => {
  assert.deepEqual(
    decision({
      currentVerified: true,
      commitsSinceLastSuccess: 99,
      nowUnix: 99_999,
    }),
    {
      run: false,
      reason: "current head already has a successful verification",
    },
  );
});

test("failed or cancelled prior runs do not remove retry eligibility", () => {
  assert.equal(
    decision({ currentVerified: false, commitsSinceLastSuccess: 4 }).run,
    true,
  );
  assert.equal(
    decision({ currentVerified: false, nowUnix: 1_000 + 1_800 }).run,
    true,
  );
});

test("validation jobs publish independent compact evidence without changing authority", () => {
  for (const workflow of [pullRequestWorkflow, postMergeWorkflow]) {
    assert.match(workflow, /scripts\/ci-evidence\.mjs run --phase setup/);
    assert.match(
      workflow,
      /scripts\/ci-evidence\.mjs run --phase dependency-install/,
    );
    assert.match(workflow, /scripts\/ci-evidence\.mjs run --phase command/);
    assert.match(workflow, /scripts\/ci-evidence\.mjs publish/);
    assert.match(workflow, /CI_UPLOAD_STATUS: workflow-diagnostic-only/);
    assert.match(
      workflow,
      /EVIDENCE_UPLOAD_OUTCOME: \$\{\{ steps\.upload\.outcome \}\}/,
    );
    assert.match(workflow, /continue-on-error: true/);
    assert.match(workflow, /retention-days: 3/);
    assert.match(workflow, /steps\.prepare\.outcome == 'success'/);
    assert.match(workflow, /CI_EVIDENCE_ARTIFACT_FILE:/);
    assert.match(
      workflow,
      /path: \$\{\{ runner\.temp \}\}\/[^\n]+\.artifact\.json/,
    );
    assert.equal(
      workflow.match(/uses: actions\/upload-artifact@/g)?.length,
      1,
      "only the clean diagnostics job may upload evidence",
    );
    assert.match(workflow, /const maxBytes = 16 \* 1024/);
    assert.match(workflow, /flag: "wx"/);
    assert.doesNotMatch(workflow, /test-results\/\*\*\/\*\.png/);
    assert.match(workflow, /ci-diagnostic-/);
  }

  for (const [workflow, jobName] of [
    [pullRequestWorkflow, "ci-diagnostics"],
    [postMergeWorkflow, "post-merge-diagnostics"],
  ]) {
    const diagnostics = jobBlock(workflow, jobName);
    assert.doesNotMatch(diagnostics, /actions\/checkout/);
    assert.doesNotMatch(diagnostics, /scripts\/ci-evidence\.mjs/);
    assert.match(diagnostics, /EVIDENCE_OUTPUT:/);
  }
});

test("workflow diagnostics preserve lifecycle, safe metrics, and fail-closed aggregates", () => {
  assert.match(pullRequestWorkflow, /EVIDENCE_UPSTREAM:/);
  assert.match(
    postMergeWorkflow,
    /EVIDENCE_EXPECTED_SKIPS: \$\{\{ needs\.eligibility\.result == 'success' && needs\.eligibility\.outputs\.run-build != 'true'/,
  );
  assert.match(
    postMergeWorkflow,
    /needs\.post-merge-build\.result == 'skipped' && needs\.eligibility\.outputs\.run-build == 'true'/,
  );
  assert.match(pullRequestWorkflow, /EVIDENCE_TIER: workflow-aggregate/);
  assert.match(postMergeWorkflow, /EVIDENCE_TIER: post-merge-workflow/);
  assert.match(githubActionsDocumentation, /compact evidence envelope/i);
  assert.match(githubActionsDocumentation, /timed_out/);
  assert.match(githubActionsDocumentation, /artifactSizeBytes/);
  assert.match(
    githubActionsDocumentation,
    /authoritative validation.*unchanged/i,
  );
});

test("clean diagnostics sanitize hostile metadata before upload", () => {
  for (const [workflow, expectedJobs] of [
    [
      pullRequestWorkflow,
      ["test-standard", "validate-api", "production-build", "validation"],
    ],
    [postMergeWorkflow, ["eligibility", "post-merge-build"]],
  ]) {
    const diagnostics = jobBlock(
      workflow,
      workflow === pullRequestWorkflow
        ? "ci-diagnostics"
        : "post-merge-diagnostics",
    );
    assert.match(diagnostics, /const safeName =/);
    assert.match(diagnostics, /const safeLabel =/);
    assert.match(diagnostics, /const safeRef =/);
    assert.match(diagnostics, /const safeSha =/);
    assert.match(diagnostics, /const safeRunAttempt =/);
    assert.match(diagnostics, /unknown-workflow/);
    assert.match(diagnostics, /unknown-job/);
    assert.match(diagnostics, /unknown-event/);
    assert.match(diagnostics, /unknown-run/);
    assert.match(diagnostics, /unknown-sha/);
    assert.match(diagnostics, /unknown-ref/);
    assert.match(diagnostics, /try \{/);
    assert.match(diagnostics, /catch \{/);
    assert.match(diagnostics, /!Array\.isArray\(parsed\)/);
    assert.match(diagnostics, /allowedStatuses\.has\(raw\[name\]\)/);
    for (const job of expectedJobs) {
      assert.match(
        diagnostics,
        new RegExp(`"${job}"`),
        `missing upstream allowlist entry: ${job}`,
      );
    }
    assert.match(diagnostics, /authoritative: "unchanged"/);
    assert.match(diagnostics, /tier: safeName/);
    assert.match(diagnostics, /name: safeName/);
    assert.match(diagnostics, /GITHUB_OUTPUT/);
    assert.doesNotMatch(diagnostics, /workflow: process\.env\.EVIDENCE_WORKFLOW/);
    assert.doesNotMatch(diagnostics, /runId: process\.env\.EVIDENCE_RUN_ID/);
    assert.doesNotMatch(diagnostics, /ref: process\.env\.EVIDENCE_REF\.slice/);
    assert.doesNotMatch(diagnostics, /commitSha: process\.env\.EVIDENCE_SHA/);
  }
  assert.match(
    postMergeWorkflow,
    /filter\(\(name\) => allowedExpectedSkips\.has\(name\)\)/,
  );
  assert.match(
    pullRequestWorkflow,
    /name: \$\{\{ steps\.prepare\.outputs\.artifact_name \}\}/,
  );
  assert.match(
    postMergeWorkflow,
    /name: \$\{\{ steps\.prepare\.outputs\.artifact_name \}\}/,
  );
});

test("clean diagnostics emit fixed metadata for hostile provider values", () => {
  for (const [workflow, jobName, upstream, expectedStatus] of [
    [
      pullRequestWorkflow,
      "ci-diagnostics",
      {
        "test-standard": "<status>",
        "validate-api": "success",
        "production-build": "provider-status",
        validation: "cancelled",
        "provider-job": "success",
      },
      "cancelled",
    ],
    [
      postMergeWorkflow,
      "post-merge-diagnostics",
      {
        eligibility: "<status>",
        "post-merge-build": "provider-status",
        "provider-job": "success",
      },
      "failure",
    ],
  ]) {
    const { envelope, outputName, artifact } = runCleanDiagnostics(
      workflow,
      jobName,
      upstream,
    );
    assert.deepEqual(envelope.metadata, {
      workflow: "unknown-workflow",
      job: "unknown-job",
      event: "unknown-event",
      runId: "unknown-run",
      runAttempt: 1,
      commitSha: "unknown-sha",
      ref: "unknown-ref",
      browserProject: "not-applicable",
      apiScope: "not-applicable",
      validationScope:
        jobName === "ci-diagnostics"
          ? "workflow-aggregate"
          : "post-merge-workflow",
    });
    assert.equal(envelope.lifecycle.status, expectedStatus);
    assert.equal(envelope.outcome.authoritative, "unchanged");
    assert.equal(envelope.outcome.diagnostic, "independent");
    assert.equal(envelope.metrics.retryCount, 0);
    assert.equal(outputName, "artifact_name=ci-diagnostic-unknown-run");
    assert.deepEqual(
      Object.keys(envelope.lifecycle.upstream),
      jobName === "ci-diagnostics"
        ? ["test-standard", "validate-api", "production-build", "validation"]
        : ["eligibility", "post-merge-build"],
    );
    assert.ok(!artifact.includes("provider-secret"));
    assert.ok(!artifact.includes("<status>"));
    assert.ok(!artifact.includes("provider-status"));
  }
});

test("compact evidence contract keeps the approved fields and privacy boundary", () => {
  for (const field of [
    "revision",
    "branchOrPullRequest",
    "changedFiles",
    "workflow",
    "job",
    "command",
    "result",
    "exitCode",
    "failureExcerpt",
    "cancellation",
    "retry",
    "skip",
    "timeout",
    "retainedArtifactIds",
    "localComparisonStatus",
    "browserProject",
    "apiScope",
    "validationScope",
    "jobDurationMs",
    "setupDurationMs",
    "dependencyInstallDurationMs",
    "browserInstallDurationMs",
    "commandDurationMs",
    "uploadDurationMs",
    "artifactSizeBytes",
  ]) {
    assert.match(
      githubActionsDocumentation,
      new RegExp(`\\\`${field}\\\``),
      `missing compact evidence field: ${field}`,
    );
  }
  for (const exclusion of [
    "repository dumps",
    "imported HTML",
    "environment files",
    "secrets",
    "provider payloads",
    "full logs",
    "full dependency-install logs",
    "unbounded browser traces",
  ]) {
    assert.match(
      githubActionsDocumentation,
      new RegExp(
        exclusion.replace("dependency-install ", "dependency-install\\s+"),
        "i",
      ),
      `missing evidence exclusion: ${exclusion}`,
    );
  }
  for (const workflow of [pullRequestWorkflow, postMergeWorkflow]) {
    assert.match(
      workflow,
      /repository dumps, source bundles, and imported HTML/,
    );
    assert.match(
      workflow,
      /full logs, full dependency-install logs, and command output/,
    );
    assert.match(
      workflow,
      /environment files and values, credentials, and secrets/,
    );
    assert.match(
      workflow,
      /unbounded browser traces, videos, DOM snapshots, and screenshots/,
    );
  }
  for (const producer of [
    ciEvidenceSource,
    pullRequestWorkflow,
    postMergeWorkflow,
  ]) {
    assert.match(
      producer,
      /repository dumps, source bundles, and imported HTML/,
    );
    assert.match(
      producer,
      /full logs, full dependency-install logs, and command output/,
    );
    assert.match(
      producer,
      /environment files and values, credentials, and secrets/,
    );
    assert.match(
      producer,
      /unbounded browser traces, videos, DOM snapshots, and screenshots/,
    );
  }
  assert.match(
    githubActionsDocumentation,
    /not-collected.*source enumeration is outside this contract/i,
  );
  assert.match(
    githubActionsDocumentation,
    /four status messages of at most 512\s+characters/i,
  );
  assert.match(githubActionsDocumentation, /exit `124`|exit 124/i);
});

test("the evidence contract names every remote validation owner", () => {
  for (const [job, command] of [
    ["test-standard", "pnpm run test-standard"],
    ["validate-api", "pnpm run validate:api"],
    ["production-build", "pnpm run production-build"],
    ["post-merge-build", "production-build.yml"],
    ["validation", "all three upstream jobs"],
  ]) {
    assert.match(
      githubActionsDocumentation,
      new RegExp(job.replaceAll("-", "[-]"), "i"),
      `missing remote validation owner: ${job}`,
    );
    assert.match(
      githubActionsDocumentation,
      new RegExp(command.replaceAll(".", "\\."), "i"),
      `missing owner behavior: ${command}`,
    );
  }
});

test("instrumented jobs provide their canonical command to the evidence envelope", () => {
  for (const [workflow, entries] of [
    [
      pullRequestWorkflow,
      [
        ["test-standard", "pnpm run test-standard"],
        ["validate-api", "pnpm run validate:api"],
        ["production-build", "pnpm run production-build"],
      ],
    ],
    [
      postMergeWorkflow,
      [
        ["eligibility", "post-merge eligibility policy"],
        ["post-merge-build", "pnpm run production-build"],
      ],
    ],
  ]) {
    for (const [job, command] of entries) {
      const block = jobBlock(workflow, job);
      assert.match(
        block,
        new RegExp(`CI_COMMAND: ${command.replaceAll(" ", "\\s+")}`),
      );
    }
  }
});

test("instrumented jobs expose bounded cost timers and scope labels", () => {
  for (const [workflow, entries] of [
    [
      pullRequestWorkflow,
      [
        [
          "test-standard",
          "chromium firefox-recovery mobile-recovery",
          "not-applicable",
        ],
        ["validate-api", "not-applicable", "generated-source-and-declarations"],
        ["production-build", "not-applicable", "not-applicable"],
      ],
    ],
    [
      postMergeWorkflow,
      [
        ["eligibility", "not-applicable", "not-applicable"],
        ["post-merge-build", "not-applicable", "not-applicable"],
      ],
    ],
  ]) {
    for (const [job, browserProject, apiScope] of entries) {
      const block = jobBlock(workflow, job);
      assert.match(block, /Start CI cost timer/);
      assert.match(block, /CI_JOB_STARTED_AT_MS=\$\(date \+%s%3N\)/);
      assert.match(block, new RegExp(`CI_BROWSER_PROJECT: ${browserProject}`));
      assert.match(block, new RegExp(`CI_API_SCOPE: ${apiScope}`));
      assert.match(block, /CI_VALIDATION_SCOPE:/);
    }
  }
  for (const metric of [
    "jobDurationMs",
    "setupDurationMs",
    "dependencyInstallDurationMs",
    "browserInstallDurationMs",
    "commandDurationMs",
    "uploadDurationMs",
  ]) {
    assert.match(ciEvidenceSource, new RegExp(metric));
  }
  for (const workflow of [pullRequestWorkflow, postMergeWorkflow]) {
    assert.match(workflow, /Start diagnostic upload timer/);
    assert.match(workflow, /Upload duration:/);
  }
  assert.match(
    postMergeWorkflow,
    /scripts\/ci-evidence\.mjs run --phase eligibility/,
  );
});

test("the stable validation aggregate publishes its upstream status handoff", () => {
  const aggregate = jobBlock(pullRequestWorkflow, "validation");
  assert.match(aggregate, /Publish compact validation aggregate summary/);
  assert.match(aggregate, /GITHUB_STEP_SUMMARY/);
  assert.match(aggregate, /Changed files:.*not-collected/);
  assert.match(
    aggregate,
    /Retained artifact IDs:.*ci-diagnostic-github-validation-ci-diagnostics-/,
  );
  assert.match(aggregate, /Local comparison status:.*not-compared/);
  assert.match(aggregate, /continue-on-error: true/);
});

test("diagnostic artifact names identify their workflow, job, and run", () => {
  assert.match(
    pullRequestWorkflow,
    /ci-diagnostic-github-validation-ci-diagnostics-\$\{\{ github\.run_id \}\}/,
  );
  assert.match(
    postMergeWorkflow,
    /ci-diagnostic-post-merge-production-build-post-merge-diagnostics-\$\{\{ github\.run_id \}\}/,
  );
  assert.doesNotMatch(
    pullRequestWorkflow,
    /name:\s+ci-diagnostic-workflow-\$\{\{ github\.run_id \}\}/,
  );
  assert.doesNotMatch(
    postMergeWorkflow,
    /name:\s+ci-diagnostic-post-merge-workflow-\$\{\{ github\.run_id \}\}/,
  );
});

test("diagnostics documentation requires bounded evidence before escalation or optimization", () => {
  for (const phrase of [
    "branch isolation",
    "smallest change",
    "local baseline",
    "compact-evidence-first",
    "pre-merge",
    "post-merge",
    "rollback",
    "human authorization",
    "two-factor",
    "evidence window",
  ]) {
    assert.match(githubActionsDocumentation, new RegExp(phrase, "i"));
  }
  assert.match(
    githubActionsDocumentation,
    /must not invoke AI|does not invoke AI|without invoking AI/i,
  );
  assert.match(
    githubActionsDocumentation,
    /must not.*weaken validation|not.*permission to weaken validation/i,
  );
});

test("checkpoint documentation keeps escalation and policy boundaries explicit", () => {
  for (const heading of [
    "Pre-edit baseline",
    "Smallest-change check",
    "Pre-PR local validation",
    "Post-CI diagnosis boundary",
    "Pre-merge aggregate and policy verification",
    "Post-merge monitoring boundary",
    "Rollback procedure",
  ]) {
    assert.match(
      githubActionsDocumentation,
      new RegExp(`^###?\\s+\\d*\\.?\\s*${heading}$`, "im"),
      `missing checkpoint heading: ${heading}`,
    );
  }

  for (const phrase of [
    "one objective",
    "one\\s+validation-contract change",
    "opportunistic refactor",
    "fresh local checkpoint before rebasing or merging",
    "bounded envelope\\s+before\\s+full logs",
    "job has failed",
    "failure is still unclassified",
    "compact evidence is insufficient",
    "human has authorized",
    "stable job names",
    "branch protection or a ruleset references",
    "smallest workflow change",
    "Local validation remains the owner",
  ]) {
    assert.match(
      githubActionsDocumentation,
      new RegExp(phrase, "i"),
      `missing checkpoint contract phrase: ${phrase}`,
    );
  }

  assert.match(
    githubActionsDocumentation,
    /does not copy those policies|does not copy.*policies/i,
  );
  assert.equal(
    (githubActionsDocumentation.match(/BEGIN GENERATED REGRESSION GUARD POLICY/g) || [])
      .length,
    0,
    "GitHub Actions guidance must not copy the generated Regression Guard policy block",
  );
  for (const duplicatedPolicyPhrase of [
    "Every task plan has",
    "The baseline catalog is",
    "Regression Guard is an additive plan contract",
    "The permitted exceptions are",
  ]) {
    assert.doesNotMatch(
      githubActionsDocumentation,
      new RegExp(duplicatedPolicyPhrase, "i"),
      `GitHub Actions guidance copied authoritative policy text: ${duplicatedPolicyPhrase}`,
    );
  }
  for (const unsafeEscalation of [
    "automatically invoke AI",
    "send.*full logs.*AI",
    "AI.*replace.*validation",
    "AI.*change.*GitHub policy",
  ]) {
    assert.doesNotMatch(
      githubActionsDocumentation,
      new RegExp(unsafeEscalation, "i"),
      `unsafe AI escalation wording: ${unsafeEscalation}`,
    );
  }
});
