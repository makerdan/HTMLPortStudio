import assert from "node:assert/strict";
import fs from "node:fs";
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
      new RegExp(exclusion.replace("dependency-install ", "dependency-install\\s+"), "i"),
      `missing evidence exclusion: ${exclusion}`,
    );
  }
  for (const workflow of [pullRequestWorkflow, postMergeWorkflow]) {
    assert.match(workflow, /repository dumps, source bundles, and imported HTML/);
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
  for (const producer of [ciEvidenceSource, pullRequestWorkflow, postMergeWorkflow]) {
    assert.match(producer, /repository dumps, source bundles, and imported HTML/);
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
  assert.match(
    githubActionsDocumentation,
    /exit `124`|exit 124/i,
  );
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
