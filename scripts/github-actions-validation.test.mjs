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
  assert.match(pullRequestWorkflow, /run: pnpm run production-build/);
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
  assert.match(postMergeWorkflow, /run: pnpm run production-build/);
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
