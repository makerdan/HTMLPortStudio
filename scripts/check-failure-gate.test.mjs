import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { validatePlanText } from "./lib/failure-gate.mjs";

const root = path.resolve(import.meta.dirname, "..");
const checker = path.join(root, "scripts/check-failure-gate.mjs");
const runner = path.join(root, "scripts/run-locked-tier.mjs");
const valid = `# Valid

## Pre-existing failures to ignore
None known at plan time.

## Validation
**Command:** \`test-standard\`
**Why:** The standard tier covers this task's checks.
**Do not escalate:** Run exactly this command.
`;

test("accepts a valid plan", () => {
  assert.deepEqual(validatePlanText(valid, "valid plan"), []);
});

test("rejects a plan missing required sections", () => {
  const result = validatePlanText("# Missing", "missing plan");
  assert.ok(result.some((error) => error.includes("Pre-existing failures")));
  assert.ok(result.some((error) => error.includes("Validation")));
});

test("rejects an invalid tier", () => {
  const result = validatePlanText(valid.replace("test-standard", "not-a-tier"), "invalid plan");
  assert.ok(result.some((error) => error.includes("invalid validation tier")));
});

test("rejects placeholder explanations", () => {
  const result = validatePlanText(valid.replace("The standard tier covers this task's checks.", "TBD"), "placeholder plan");
  assert.ok(result.some((error) => error.includes("placeholder")));
});

test("TASK_PLAN_FILE selects exactly one plan", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-"));
  const file = path.join(directory, "plan.md");
  fs.writeFileSync(file, valid);
  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    env: { ...process.env, TASK_PLAN_FILE: file },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed strict plan validation/);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("fix-stub adds structure but strict mode still catches placeholders", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-stub-"));
  const file = path.join(directory, "plan.md");
  fs.writeFileSync(file, "# Missing sections\n");
  const fixed = spawnSync(process.execPath, [checker, "--fix-stub", "--plan", file], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  assert.notEqual(fixed.status, 0);
  assert.match(fs.readFileSync(file, "utf8"), /## Pre-existing failures to ignore/);
  assert.match(fixed.stderr, /placeholder/);
  const stubsOnlyFile = path.join(directory, "stubs-only.md");
  fs.writeFileSync(stubsOnlyFile, "# Missing sections\n");
  const stubsOnly = spawnSync(process.execPath, [checker, "--stubs-only", "--plan", stubsOnlyFile], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  assert.equal(stubsOnly.status, 0, stubsOnly.stderr);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("locked runner rejects a plan with an invalid tier before running", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-lock-"));
  const file = path.join(directory, "plan.md");
  fs.writeFileSync(file, valid.replace("test-standard", "heavier-than-allowed"));
  const result = spawnSync(process.execPath, [runner, file], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TIER-LOCK VIOLATION/);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("locked runner rejects a structurally invalid plan before running", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-lock-"));
  const file = path.join(directory, "plan.md");
  fs.writeFileSync(file, "# Missing baseline\n\n## Validation\n**Command:** `test-standard`\n**Why:** A real reason.\n**Do not escalate:** Run exactly this command.\n");
  const result = spawnSync(process.execPath, [runner, file], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /strict Failure Gate lint/);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("scaffold creates a compliant plan with a real rationale", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-scaffold-"));
  const file = path.join(directory, "scaffold.md");
  execFileSync(process.execPath, [path.join(root, "scripts/new-plan.mjs"), "--title", "Scaffold case", "--why", "The task needs a reproducible validation ceiling.", "--output", file], { cwd: root });
  assert.deepEqual(validatePlanText(fs.readFileSync(file, "utf8"), file), []);
  fs.rmSync(directory, { recursive: true, force: true });
});