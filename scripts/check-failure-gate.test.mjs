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
const baselineFile = path.join(root, "docs/validation/failure-baseline.json");
const valid = `# Valid

## Pre-existing failures to ignore
None known at plan time.

## Validation
**Command:** \`test-standard\`
**Why:** The standard tier covers this task's checks.
**Do not escalate:** Run exactly this command.
`;

function baselineRecord(id, overrides = {}) {
  return {
    id,
    status: "active",
    suite: "test-standard",
    test: "example test",
    signature: "example failure",
    owner: "Failure Gate maintainers",
    firstObserved: "2026-01-01T00:00:00.000Z",
    lastVerified: "2026-08-01T00:00:00.000Z",
    reviewDeadline: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function planWithReference(ownership, id = "BASE-EXAMPLE") {
  return valid.replace("None known at plan time.", `- **${ownership}:** \`${id}\` — recorded failure.`);
}

function withCatalog(records, callback) {
  const original = fs.readFileSync(baselineFile, "utf8");
  try {
    fs.writeFileSync(baselineFile, JSON.stringify({ version: 1, records }, null, 2));
    return callback();
  } finally {
    fs.writeFileSync(baselineFile, original);
  }
}

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

test("accepts an active, unexpired ignored baseline", () => {
  const errors = withCatalog([baselineRecord("BASE-ACTIVE")], () =>
    validatePlanText(planWithReference("Ignored baseline", "BASE-ACTIVE"), "active baseline plan"));
  assert.deepEqual(errors, []);
});

test("rejects an expired ignored baseline and names the repair action", () => {
  const errors = withCatalog([baselineRecord("BASE-EXPIRED", {
    reviewDeadline: "2020-01-01T00:00:00.000Z",
  })], () => validatePlanText(planWithReference("Ignored baseline", "BASE-EXPIRED"), "expired baseline plan"));
  assert.ok(errors.some((error) => error.includes("BASE-EXPIRED") && error.includes("deadline has passed")));
  assert.ok(errors.some((error) => error.includes("Owned baseline repair")));
});

for (const status of ["needs-review", "intermittent", "environment-limited", "resolved"]) {
  test(`rejects a ${status} ignored baseline`, () => {
    const errors = withCatalog([baselineRecord(`BASE-${status.toUpperCase()}`, { status })], () =>
      validatePlanText(planWithReference("Ignored baseline", `BASE-${status.toUpperCase()}`), `${status} baseline plan`));
    assert.ok(errors.some((error) => error.includes(`BASE-${status.toUpperCase()}`) && error.includes(`status: ${status}`)));
    assert.ok(errors.some((error) => error.includes("Owned baseline repair")));
  });
}

test("allows owned repair of an expired or non-active baseline", () => {
  const errors = withCatalog([baselineRecord("BASE-REPAIR", {
    status: "needs-review",
    reviewDeadline: "2020-01-01T00:00:00.000Z",
  })], () => validatePlanText(planWithReference("Owned baseline repair", "BASE-REPAIR"), "owned repair plan"));
  assert.deepEqual(errors, []);
});

test("rejects duplicate ownership references", () => {
  const plan = planWithReference("Ignored baseline", "BASE-DUPLICATE")
    .replace("## Validation", "- **Owned baseline repair:** `BASE-DUPLICATE` — repair it.\n\n## Validation");
  const errors = withCatalog([baselineRecord("BASE-DUPLICATE")], () => validatePlanText(plan, "duplicate ownership plan"));
  assert.ok(errors.some((error) => error.includes("BASE-DUPLICATE") && error.includes("more than one ownership")));
  assert.ok(errors.some((error) => error.includes("choose one repair action")));
});

test("rejects duplicate catalog IDs instead of authorizing the first record", () => {
  const errors = withCatalog([
    baselineRecord("BASE-CATALOG-DUPLICATE"),
    baselineRecord("BASE-CATALOG-DUPLICATE", { status: "resolved" }),
  ], () => validatePlanText(planWithReference("Ignored baseline", "BASE-CATALOG-DUPLICATE"), "duplicate catalog plan"));
  assert.ok(errors.some((error) => error.includes("BASE-CATALOG-DUPLICATE") && error.includes("duplicated in the catalog")));
});

test("rejects malformed baseline records", () => {
  const errors = withCatalog([
    baselineRecord("BASE-MALFORMED", { status: "not-a-status" }),
    { id: "BASE-NO-DEADLINE", status: "active" },
    "not a record",
  ], () => validatePlanText(planWithReference("Ignored baseline", "BASE-MALFORMED"), "malformed baseline plan"));
  assert.ok(errors.some((error) => error.includes("BASE-MALFORMED") && error.includes("invalid status")));
  assert.ok(errors.some((error) => error.includes("BASE-NO-DEADLINE") && error.includes("valid reviewDeadline")));
  assert.ok(errors.some((error) => error.includes("record at index 2") && error.includes("malformed")));
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