import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  MAX_EVIDENCE_BYTES,
  publishEvidence,
  recordPhase,
  runPhase,
} from "./ci-evidence.mjs";

function envFor(file, overrides = {}) {
  return {
    CI_EVIDENCE_FILE: file,
    CI_EVIDENCE_ARTIFACT_FILE: `${file}.artifact`,
    CI_JOB_NAME: "test-standard",
    CI_JOB_STATUS: "failure",
    CI_ARTIFACT_NAME: "ci-diagnostic-123",
    CI_TIER_NAME: "test-standard",
    CI_COMMAND: "pnpm run test-standard",
    CI_JOB_DURATION_MS: "1234",
    CI_BROWSER_PROJECT: "chromium firefox-recovery mobile-recovery",
    CI_API_SCOPE: "not-applicable",
    CI_VALIDATION_SCOPE: "primary-browser-validation",
    GITHUB_WORKFLOW: "GitHub Validation",
    GITHUB_EVENT_NAME: "pull_request",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "0123456789abcdef0123456789abcdef01234567",
    GITHUB_REF: "refs/pull/1/merge",
    ...overrides,
  };
}

test("CI evidence is bounded and records safe phase measurements", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  recordPhase({
    env: envFor(file),
    phase: "command",
    durationMs: 99_999_999,
    status: "failure",
    exitCode: 1,
  });
  const evidence = publishEvidence({ env: envFor(file) });
  assert.equal(evidence.lifecycle.status, "failure");
  assert.equal(evidence.outcome.authoritative, "unchanged");
  assert.equal(evidence.metrics.phases[0].durationMs, 15 * 60 * 1000);
  assert.equal(evidence.metrics.jobDurationMs, 1234);
  assert.equal(evidence.metrics.commandDurationMs, 15 * 60 * 1000);
  assert.ok(evidence.metrics.artifactSizeBytes > 0);
  assert.equal(
    evidence.metadata.browserProject,
    "chromium firefox-recovery mobile-recovery",
  );
  assert.equal(evidence.metadata.apiScope, "not-applicable");
  assert.equal(evidence.metadata.validationScope, "primary-browser-validation");
  assert.ok(
    Buffer.byteLength(readFileSync(`${file}.artifact`)) <= MAX_EVIDENCE_BYTES,
  );
  assert.ok(
    !readFileSync(`${file}.artifact`, "utf8").includes("CI_JOB_STATUS"),
  );
});

test("CI evidence separates install, browser, command, and upload cost signals", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  const env = envFor(file, {
    CI_JOB_DURATION_MS: "999999999",
    CI_UPLOAD_DURATION_MS: "42",
  });
  recordPhase({
    env,
    phase: "setup",
    durationMs: 10,
    status: "success",
    exitCode: 0,
  });
  recordPhase({
    env,
    phase: "dependency-install",
    durationMs: 20,
    status: "success",
    exitCode: 0,
  });
  recordPhase({
    env,
    phase: "browser-install",
    durationMs: 30,
    status: "success",
    exitCode: 0,
  });
  recordPhase({
    env,
    phase: "command",
    durationMs: 40,
    status: "success",
    exitCode: 0,
  });
  const evidence = publishEvidence({ env });
  assert.equal(evidence.metrics.jobDurationMs, 60 * 60 * 1000);
  assert.equal(evidence.metrics.setupDurationMs, 10);
  assert.equal(evidence.metrics.dependencyInstallDurationMs, 20);
  assert.equal(evidence.metrics.browserInstallDurationMs, 30);
  assert.equal(evidence.metrics.commandDurationMs, 40);
  assert.equal(evidence.metrics.uploadDurationMs, 42);
});

test("CI summaries expose scope, durations, and retained artifact bytes", () => {
  const directory = mkdtempSync(join(tmpdir(), "ci-evidence-"));
  const file = join(directory, "evidence.json");
  const summary = join(directory, "summary.md");
  const evidence = publishEvidence({
    env: envFor(file, { GITHUB_STEP_SUMMARY: summary }),
  });
  const summaryText = readFileSync(summary, "utf8");
  assert.match(summaryText, /Scope: validation `primary-browser-validation`/);
  assert.match(summaryText, /Duration: job=1234ms/);
  assert.ok(
    summaryText.includes(
      `size \`${evidence.metrics.artifactSizeBytes} bytes\``,
    ),
  );
});

test("compact evidence carries explicit handoff fields and sanitizes upload metadata", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  const evidence = publishEvidence({
    env: envFor(file, {
      CI_JOB_STATUS: "cancelled",
      CI_RETRY_COUNT: "99",
      CI_UPLOAD_STATUS: "SECRET_VALUE=should-not-appear",
      CI_COMMAND: "pnpm run test-standard",
    }),
  });
  assert.equal(evidence.metadata.workflow, "GitHub Validation");
  assert.equal(evidence.metadata.branchOrPullRequest, "refs/pull/1/merge");
  assert.equal(evidence.metadata.changedFiles, "not-collected");
  assert.equal(evidence.metadata.command, "pnpm run test-standard");
  assert.equal(evidence.outcome.result, "cancelled");
  assert.equal(evidence.outcome.exitCode, null);
  assert.equal(evidence.metrics.cancelled, true);
  assert.equal(evidence.metrics.retryCount, 10);
  assert.equal(evidence.metrics.uploadStatus, "not-run");
  assert.deepEqual(evidence.retainedArtifactIds, ["ci-diagnostic-123"]);
  assert.deepEqual(evidence.failureExcerpt, evidence.excerpts);
  assert.ok(!readFileSync(`${file}.artifact`, "utf8").includes("SECRET_VALUE"));
});

test("expected skips do not become false failure evidence", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  const evidence = publishEvidence({
    env: envFor(file, {
      CI_JOB_STATUS: "success",
      CI_UPSTREAM_RESULTS:
        '{"post-merge-build":"skipped","eligibility":"success"}',
      CI_EXPECTED_SKIPS: "post-merge-build",
    }),
  });
  assert.equal(evidence.lifecycle.status, "success");
  assert.deepEqual(evidence.lifecycle.upstream, {
    "post-merge-build": "skipped",
    eligibility: "success",
  });
});

test("unexpected skips remain non-success evidence", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  const evidence = publishEvidence({
    env: envFor(file, {
      CI_JOB_STATUS: "success",
      CI_UPSTREAM_RESULTS:
        '{"post-merge-build":"skipped","eligibility":"success"}',
      CI_EXPECTED_SKIPS: "",
    }),
  });
  assert.equal(evidence.lifecycle.status, "skipped");
});

test("timed-out phases keep their exact lifecycle status", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  recordPhase({
    env: envFor(file),
    phase: "command",
    durationMs: 1_000,
    status: "timed_out",
    exitCode: 124,
  });
  const evidence = publishEvidence({ env: envFor(file) });
  assert.equal(evidence.lifecycle.status, "timed_out");
  assert.equal(evidence.metrics.phases[0].exitCode, 124);
});

test("unknown comparison and phase values fail closed to safe metadata", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  assert.throws(
    () =>
      recordPhase({
        env: envFor(file),
        phase: "raw-log",
        durationMs: 1,
        status: "success",
        exitCode: 0,
      }),
    /unsupported CI evidence phase/,
  );
  const evidence = publishEvidence({
    env: envFor(file, { CI_LOCAL_COMPARISON_STATUS: "unknown" }),
  });
  assert.equal(evidence.localComparison.status, "not-compared");
});

test("wrapped commands cannot access evidence paths and keep their exit code", async () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  const exitCode = await runPhase({
    env: envFor(file),
    phase: "command",
    command: process.execPath,
    args: [
      "-e",
      "process.exit(process.env.CI_EVIDENCE_FILE || process.env.GITHUB_STEP_SUMMARY || process.env.CI_COMMAND ? 99 : 7)",
    ],
  });
  assert.equal(exitCode, 7);
  const evidence = publishEvidence({ env: envFor(file) });
  assert.equal(evidence.metrics.phases[0].exitCode, 7);
});

test("spawn failures still record a failed phase with an exit code", async () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  const exitCode = await runPhase({
    env: envFor(file),
    phase: "command",
    command: "/definitely/missing/ci-evidence-command",
    args: [],
  });
  assert.equal(exitCode, 1);
  const evidence = publishEvidence({ env: envFor(file) });
  assert.equal(evidence.metrics.phases[0].status, "failure");
  assert.equal(evidence.metrics.phases[0].exitCode, 1);
  assert.equal(evidence.outcome.exitCode, 1);
});

test("poisoned phase state is rebuilt into a bounded allowlisted artifact", () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "ci-evidence-")),
    "evidence.json",
  );
  writeFileSync(
    file,
    JSON.stringify({
      version: 1,
      metadata: { secret: "DO_NOT_UPLOAD" },
      phases: [
        {
          name: "command",
          durationMs: 99_999_999,
          status: "failure",
          exitCode: 1,
          payload: "DO_NOT_UPLOAD".repeat(10_000),
        },
        {
          name: "raw-log",
          durationMs: 1,
          status: "success",
          exitCode: 0,
        },
      ],
    }),
  );
  const evidence = publishEvidence({ env: envFor(file) });
  const artifact = readFileSync(`${file}.artifact`, "utf8");
  assert.ok(Buffer.byteLength(artifact) <= MAX_EVIDENCE_BYTES);
  assert.ok(!artifact.includes("DO_NOT_UPLOAD"));
  assert.equal(evidence.metrics.phases.length, 1);
  assert.equal(evidence.metrics.phases[0].durationMs, 15 * 60 * 1000);
});
