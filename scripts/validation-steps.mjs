#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plan = process.env.TASK_PLAN_FILE;
if (!plan) {
  console.log("[FAILURE-GATE] No TASK_PLAN_FILE set; validation is running in ad-hoc mode.");
  process.exit(0);
}

function run(args) {
  return spawnSync(process.execPath, [path.join(root, "scripts/check-failure-gate.mjs"), ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  }).status ?? 1;
}

// Remediation is deliberately scoped to the current plan. Strict validation
// still runs afterward so placeholders and invalid tiers fail closed.
const regressionGuard = (args) => spawnSync(process.execPath, [path.join(root, "scripts/check-regression-guard.mjs"), ...args], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
}).status ?? 1;

run(["--fix-stub", "--plan", plan]);
regressionGuard(["--fix-stub", "--plan", plan]);
const failureStatus = run(["--strict", "--plan", plan]);
const regressionStatus = regressionGuard(["--strict", "--plan", plan]);
process.exit(failureStatus || regressionStatus ? 1 : 0);