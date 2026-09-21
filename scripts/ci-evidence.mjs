#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export const EVIDENCE_VERSION = 1;
export const MAX_EVIDENCE_BYTES = 16 * 1024;
export const MAX_PHASES = 32;
export const MAX_PHASE_DURATION_MS = 15 * 60 * 1000;
export const MAX_JOB_DURATION_MS = 60 * 60 * 1000;

const PHASES = new Set([
  "setup",
  "dependency-install",
  "browser-install",
  "command",
  "eligibility",
  "upload",
]);
const STATUSES = new Set([
  "success",
  "failure",
  "cancelled",
  "skipped",
  "timed_out",
  "retrying",
]);
const COMPARISON_STATUSES = new Set([
  "match",
  "mismatch",
  "not-compared",
  "not-applicable",
]);
const UPLOAD_STATUSES = new Set([
  "workflow-diagnostic-only",
  "success",
  "failure",
  "cancelled",
  "skipped",
  "not-run",
  "not-uploaded",
]);
const CHILD_REDACTED_ENV = [
  "CI_EVIDENCE_FILE",
  "CI_EVIDENCE_ARTIFACT_FILE",
  "CI_JOB_NAME",
  "CI_JOB_STARTED_AT_MS",
  "CI_JOB_DURATION_MS",
  "CI_JOB_STATUS",
  "CI_ARTIFACT_NAME",
  "CI_BROWSER_PROJECT",
  "CI_API_SCOPE",
  "CI_VALIDATION_SCOPE",
  "CI_TIER_NAME",
  "CI_UPSTREAM_RESULTS",
  "CI_EXPECTED_SKIPS",
  "CI_LOCAL_COMPARISON_STATUS",
  "CI_LIFECYCLE_STATUS",
  "CI_RETRY_COUNT",
  "CI_UPLOAD_DURATION_MS",
  "CI_UPLOAD_STATUS",
  "CI_SKIP_SUMMARY",
  "CI_COMMAND",
  "GITHUB_STEP_SUMMARY",
];

function evidencePath(env) {
  if (!env.CI_EVIDENCE_FILE) {
    throw new Error("CI_EVIDENCE_FILE is required");
  }
  return env.CI_EVIDENCE_FILE;
}

function artifactPath(env) {
  if (!env.CI_EVIDENCE_ARTIFACT_FILE) {
    throw new Error("CI_EVIDENCE_ARTIFACT_FILE is required");
  }
  if (resolve(env.CI_EVIDENCE_ARTIFACT_FILE) === resolve(evidencePath(env))) {
    throw new Error("CI evidence state and artifact paths must be separate");
  }
  return env.CI_EVIDENCE_ARTIFACT_FILE;
}

function safeStatus(value, fallback = "failure") {
  return STATUSES.has(value) ? value : fallback;
}

function safeComparison(value) {
  return COMPARISON_STATUSES.has(value) ? value : "not-compared";
}

function safeName(value, fallback) {
  const name = String(value || fallback);
  return /^[A-Za-z0-9._-]{1,100}$/.test(name) ? name : fallback;
}

function safeLabel(value, fallback, maxLength = 160) {
  const label = String(value || "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9 ._:/-]*$/.test(label) &&
    label.length <= maxLength
    ? label
    : fallback;
}

function safeRef(value) {
  const ref = String(value || "unknown-ref").trim();
  return /^[A-Za-z0-9][A-Za-z0-9._/@:+-]*$/.test(ref)
    ? ref.slice(0, 160)
    : "unknown-ref";
}

function safeCommand(value) {
  return safeLabel(value, "not-specified", 240);
}

function safeUploadStatus(value) {
  return UPLOAD_STATUSES.has(value) ? value : "not-run";
}

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

function boundedDuration(value, maximum = MAX_PHASE_DURATION_MS) {
  return Math.min(numberOr(value), maximum);
}

function phaseDuration(phases, name) {
  return boundedDuration(
    phases
      .filter((phase) => phase.name === name)
      .reduce((total, phase) => total + phase.durationMs, 0),
  );
}

function baseState(env) {
  const now = Date.now();
  return {
    version: EVIDENCE_VERSION,
    metadata: {
      workflow: safeLabel(env.GITHUB_WORKFLOW, "unknown-workflow"),
      job: safeLabel(env.CI_JOB_NAME || env.GITHUB_JOB, "unknown-job"),
      event: safeLabel(env.GITHUB_EVENT_NAME, "unknown-event"),
      runId: safeName(env.GITHUB_RUN_ID, "unknown-run"),
      runAttempt: numberOr(env.GITHUB_RUN_ATTEMPT, 1),
      commitSha: /^[0-9a-f]{7,64}$/i.test(env.GITHUB_SHA || "")
        ? env.GITHUB_SHA
        : "unknown-sha",
      ref: safeRef(env.GITHUB_REF),
      branchOrPullRequest: safeRef(env.GITHUB_REF),
      changedFiles: "not-collected",
      command: safeCommand(env.CI_COMMAND),
      browserProject: safeLabel(env.CI_BROWSER_PROJECT, "not-applicable"),
      apiScope: safeLabel(env.CI_API_SCOPE, "not-applicable"),
      validationScope: safeLabel(env.CI_VALIDATION_SCOPE, "not-specified"),
    },
    phases: [],
    retryCount: numberOr(env.CI_RETRY_COUNT),
    jobStartedAtMs: numberOr(env.CI_JOB_STARTED_AT_MS, now),
  };
}

function loadState(path, env) {
  const state = baseState(env);
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed?.version === EVIDENCE_VERSION && Array.isArray(parsed.phases)) {
      state.phases = parsed.phases
        .filter(
          (phase) =>
            phase &&
            PHASES.has(phase.name) &&
            STATUSES.has(phase.status) &&
            (Number.isInteger(phase.exitCode) || phase.exitCode === null),
        )
        .slice(0, MAX_PHASES)
        .map((phase) => ({
          name: phase.name,
          durationMs: Math.min(
            numberOr(phase.durationMs),
            MAX_PHASE_DURATION_MS,
          ),
          status: phase.status,
          exitCode: phase.exitCode,
        }));
      state.retryCount = Math.min(numberOr(parsed.retryCount), 10);
      state.jobStartedAtMs = numberOr(
        parsed.jobStartedAtMs,
        state.jobStartedAtMs,
      );
    }
  } catch {
    // A missing or interrupted phase file is represented by a fresh envelope.
  }
  return state;
}

function writeBoundedJson(path, value) {
  const serialized = JSON.stringify(value, null, 2);
  if (Buffer.byteLength(serialized, "utf8") > MAX_EVIDENCE_BYTES) {
    const compact = {
      version: EVIDENCE_VERSION,
      metadata: value.metadata,
      lifecycle: value.lifecycle,
      outcome: value.outcome,
      metrics: value.metrics,
      artifacts: value.artifacts,
      localComparison: value.localComparison,
      excerpts: ["Evidence exceeded the bounded envelope and was compacted."],
      redactions: value.redactions,
    };
    const compactSerialized = JSON.stringify(compact, null, 2);
    if (Buffer.byteLength(compactSerialized, "utf8") > MAX_EVIDENCE_BYTES) {
      throw new Error("compact CI evidence envelope exceeds its size limit");
    }
    writeAtomic(path, `${compactSerialized}\n`);
    return compact;
  }
  writeAtomic(path, `${serialized}\n`);
  return value;
}

function writeAtomic(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, content, { flag: "wx" });
  renameSync(temporaryPath, path);
}

export function recordPhase({
  env = process.env,
  phase,
  durationMs,
  status,
  exitCode,
}) {
  if (!PHASES.has(phase)) {
    throw new Error(`unsupported CI evidence phase: ${phase}`);
  }
  const path = evidencePath(env);
  const state = loadState(path, env);
  if (state.phases.length < MAX_PHASES) {
    state.phases.push({
      name: phase,
      durationMs: Math.min(numberOr(durationMs), MAX_PHASE_DURATION_MS),
      status: safeStatus(
        status,
        exitCode === 0 ? "success" : exitCode === 124 ? "timed_out" : "failure",
      ),
      exitCode: Number.isInteger(exitCode) ? exitCode : null,
    });
  }
  writeBoundedJson(path, state);
  return state;
}

function commandArgs(argv) {
  const separator = argv.indexOf("--");
  if (separator < 0 || !argv[separator + 1]) {
    throw new Error(
      "usage: ci-evidence.mjs run --phase <phase> -- <command> [args...]",
    );
  }
  return {
    phase: argv[argv.indexOf("--phase") + 1],
    command: argv[separator + 1],
    args: argv.slice(separator + 2),
  };
}

export async function runPhase({ env = process.env, phase, command, args }) {
  const started = Date.now();
  const childEnv = { ...env };
  for (const key of CHILD_REDACTED_ENV) delete childEnv[key];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: childEnv,
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve) => {
    let settled = false;
    const finish = (code) => {
      if (settled) return;
      settled = true;
      resolve(code);
    };
    child.once("close", (code, signal) => {
      finish(code ?? (signal ? 1 : 0));
    });
    child.once("error", () => finish(1));
  });
  try {
    recordPhase({
      env,
      phase,
      durationMs: Date.now() - started,
      status:
        exitCode === 0 ? "success" : exitCode === 124 ? "timed_out" : "failure",
      exitCode,
    });
  } catch (error) {
    // Evidence is diagnostic only; never turn a validation result green or
    // red because the optional evidence file could not be written.
    console.error(`[CI-EVIDENCE] Could not record ${phase}: ${error.message}`);
  }
  return exitCode;
}

function upstreamResults(env) {
  if (!env.CI_UPSTREAM_RESULTS) return {};
  try {
    const parsed = JSON.parse(env.CI_UPSTREAM_RESULTS);
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([name]) => /^[A-Za-z0-9._-]{1,100}$/.test(name))
        .map(([name, result]) => [name, safeStatus(result, "failure")]),
    );
  } catch {
    return { "upstream-results": "failure" };
  }
}

function expectedSkips(env) {
  return new Set(
    String(env.CI_EXPECTED_SKIPS || "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^[A-Za-z0-9._-]{1,100}$/.test(value)),
  );
}

function diagnosticStatus(jobStatus, upstream, expected) {
  const statuses = Object.entries(upstream).filter(
    ([name, status]) => !(status === "skipped" && expected.has(name)),
  );
  if (statuses.some(([, status]) => status === "cancelled")) return "cancelled";
  if (statuses.some(([, status]) => status === "timed_out")) return "timed_out";
  if (statuses.some(([, status]) => status === "failure")) return "failure";
  if (statuses.some(([, status]) => status === "skipped")) return "skipped";
  return safeStatus(jobStatus, "success");
}

function summaryLines(envelope, uploadStatus) {
  const upstream = Object.entries(envelope.lifecycle.upstream || {});
  const nonSuccess = upstream.filter(
    ([name, status]) =>
      status !== "success" &&
      !(
        status === "skipped" && envelope.lifecycle.expectedSkips.includes(name)
      ),
  );
  const phaseText =
    envelope.metrics.phases.length === 0
      ? "none recorded"
      : envelope.metrics.phases
          .map((phase) => `${phase.name}=${phase.durationMs}ms/${phase.status}`)
          .join(", ");
  const lines = [
    "## CI diagnostic summary",
    "",
    `- Lifecycle: \`${envelope.lifecycle.status}\` (job status \`${envelope.lifecycle.jobStatus}\`)`,
    `- Diagnostic result: \`${envelope.outcome.diagnostic}\`; authoritative validation is unchanged`,
    `- Scope: validation \`${envelope.metadata.validationScope}\`; browser project \`${envelope.metadata.browserProject}\`; API scope \`${envelope.metadata.apiScope}\``,
    `- Duration: job=${envelope.metrics.jobDurationMs}ms, setup=${envelope.metrics.setupDurationMs}ms, dependency-install=${envelope.metrics.dependencyInstallDurationMs}ms, browser-install=${envelope.metrics.browserInstallDurationMs}ms, eligibility=${envelope.metrics.eligibilityDurationMs}ms, command=${envelope.metrics.commandDurationMs}ms, upload=${envelope.metrics.uploadDurationMs}ms`,
    `- Phases: ${phaseText}`,
    `- Retry count: \`${envelope.metrics.retryCount}\`; cancellation: \`${envelope.metrics.cancelled}\``,
    `- Artifact: \`${uploadStatus || "not-uploaded"}\`; size \`${envelope.metrics.artifactSizeBytes} bytes\` (bounded at ${MAX_EVIDENCE_BYTES} bytes; failure/cancellation only)`,
  ];
  if (nonSuccess.length > 0) {
    lines.push(
      `- Upstream non-success: ${nonSuccess
        .map(([name, status]) => `\`${name}=${status}\``)
        .join(", ")}`,
    );
  }
  lines.push(
    "",
    "This summary contains status metadata only; source, logs, provider payloads, environment values, and secrets are excluded.",
    "",
  );
  return lines.join("\n");
}

export function publishEvidence({ env = process.env } = {}) {
  const stateFile = evidencePath(env);
  const uploadFile = artifactPath(env);
  const state = loadState(stateFile, env);
  const upstream = upstreamResults(env);
  const expected = expectedSkips(env);
  const measuredTimeout = state.phases.some(
    (phase) => phase.status === "timed_out",
  );
  const status =
    env.CI_LIFECYCLE_STATUS && STATUSES.has(env.CI_LIFECYCLE_STATUS)
      ? env.CI_LIFECYCLE_STATUS
      : measuredTimeout
        ? "timed_out"
        : diagnosticStatus(env.CI_JOB_STATUS, upstream, expected);
  const phases = state.phases.slice(0, MAX_PHASES);
  const jobDurationMs = boundedDuration(
    env.CI_JOB_DURATION_MS || Math.max(0, Date.now() - state.jobStartedAtMs),
    MAX_JOB_DURATION_MS,
  );
  const artifactName = safeName(
    env.CI_ARTIFACT_NAME,
    `ci-diagnostic-${state.metadata.runId}`,
  );
  const exitCode =
    [...phases].reverse().find((phase) => phase.exitCode !== null)?.exitCode ??
    null;
  const excerpts = [
    `Job ${state.metadata.job} ended with ${status}.`,
    ...(Object.keys(upstream).length > 0
      ? [
          `Upstream statuses: ${Object.entries(upstream)
            .map(([name, result]) => `${name}=${result}`)
            .join(", ")}`,
        ]
      : []),
  ].slice(0, 4);
  const envelope = {
    version: EVIDENCE_VERSION,
    metadata: state.metadata,
    lifecycle: {
      status,
      jobStatus: safeStatus(env.CI_JOB_STATUS, status),
      conclusion: status,
      expectedSkips: [...expected].slice(0, 12),
      upstream,
    },
    outcome: {
      diagnostic: "independent",
      authoritative: "unchanged",
      result: status,
      exitCode,
    },
    metrics: {
      phases,
      jobDurationMs,
      setupDurationMs: phaseDuration(phases, "setup"),
      dependencyInstallDurationMs: phaseDuration(phases, "dependency-install"),
      browserInstallDurationMs: phaseDuration(phases, "browser-install"),
      eligibilityDurationMs: phaseDuration(phases, "eligibility"),
      commandDurationMs: phaseDuration(phases, "command"),
      uploadDurationMs: boundedDuration(env.CI_UPLOAD_DURATION_MS),
      retryCount: Math.min(numberOr(env.CI_RETRY_COUNT, state.retryCount), 10),
      cancelled: status === "cancelled",
      timeout:
        status === "timed_out" ||
        phases.some((phase) => phase.status === "timed_out"),
      uploadStatus: safeUploadStatus(env.CI_UPLOAD_STATUS),
      artifactSizeBytes: 0,
      artifactSizeLimitBytes: MAX_EVIDENCE_BYTES,
    },
    artifacts: [
      {
        name: artifactName,
        kind: "compact-evidence",
        condition: "failure-or-cancellation",
        retentionDays: 3,
        maxBytes: MAX_EVIDENCE_BYTES,
      },
    ],
    retainedArtifactIds: [artifactName],
    localComparison: {
      status: safeComparison(env.CI_LOCAL_COMPARISON_STATUS),
      tier: safeName(env.CI_TIER_NAME, "not-specified"),
    },
    failureExcerpt: excerpts,
    excerpts,
    redactions: [
      "repository dumps, source bundles, and imported HTML",
      "full logs, full dependency-install logs, and command output",
      "provider payloads, prompts, and request identifiers",
      "environment files and values, credentials, and secrets",
      "unbounded browser traces, videos, DOM snapshots, and screenshots",
    ],
  };
  let written = envelope;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    written = writeBoundedJson(uploadFile, written);
    const size = Buffer.byteLength(readFileSync(uploadFile));
    if (written.metrics.artifactSizeBytes === size) break;
    written.metrics.artifactSizeBytes = size;
  }
  const summary = summaryLines(written, env.CI_UPLOAD_STATUS);
  if (env.GITHUB_STEP_SUMMARY && env.CI_SKIP_SUMMARY !== "true") {
    appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  }
  return written;
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv.shift();
  if (mode === "run") {
    const { phase, command, args } = commandArgs(argv);
    process.exitCode = await runPhase({ phase, command, args });
    return;
  }
  if (mode === "publish") {
    publishEvidence();
    return;
  }
  throw new Error("usage: ci-evidence.mjs <run|publish> ...");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[CI-EVIDENCE] ${error.message}`);
    process.exitCode = 1;
  });
}
