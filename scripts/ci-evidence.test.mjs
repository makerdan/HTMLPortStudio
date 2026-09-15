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
  assert.ok(
    Buffer.byteLength(readFileSync(`${file}.artifact`)) <= MAX_EVIDENCE_BYTES,
  );
  assert.ok(
    !readFileSync(`${file}.artifact`, "utf8").includes("CI_JOB_STATUS"),
  );
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
      "process.exit(process.env.CI_EVIDENCE_FILE || process.env.GITHUB_STEP_SUMMARY ? 99 : 7)",
    ],
  });
  assert.equal(exitCode, 7);
  const evidence = publishEvidence({ env: envFor(file) });
  assert.equal(evidence.metrics.phases[0].exitCode, 7);
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
