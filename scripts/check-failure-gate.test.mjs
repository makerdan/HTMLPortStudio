import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { validatePlanText } from "./lib/failure-gate.mjs";
import { loadTierRegistry, readPlanTier } from "./lib/tier-lock-check.mjs";

const root = path.resolve(import.meta.dirname, "..");
const checker = path.join(root, "scripts/check-failure-gate.mjs");
const directRunner = path.join(root, "scripts/run-tier.mjs");
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

function withTierRegistry(registry, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-registry-"));
  const file = path.join(directory, "validation-tiers.json");
  const previous = process.env.VALIDATION_TIER_REGISTRY_FILE;
  try {
    fs.writeFileSync(file, JSON.stringify(registry, null, 2));
    process.env.VALIDATION_TIER_REGISTRY_FILE = file;
    return callback();
  } finally {
    if (previous === undefined) delete process.env.VALIDATION_TIER_REGISTRY_FILE;
    else process.env.VALIDATION_TIER_REGISTRY_FILE = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("accepts a valid plan", () => {
  assert.deepEqual(validatePlanText(valid, "valid plan"), []);
});

test("rejects missing and empty tier registry data with specific diagnostics", () => {
  const cases = [
    [{ version: 1 }, /missing tier data.*"tiers" array/],
    [{ version: 1, tiers: [] }, /empty tier registry/],
  ];
  for (const [registry, diagnostic] of cases) {
    assert.throws(() => withTierRegistry(registry, () => loadTierRegistry()), diagnostic);
  }
});

test("rejects empty tier names and commands with field-specific diagnostics", () => {
  const cases = [
    [{ version: 1, tiers: [{ name: "", command: "node -e \"process.exit(0)\"" }] }, /tier name must be a non-empty string/],
    [{ version: 1, tiers: [{ name: "empty-command", command: "  " }] }, /tier command must be a non-empty string/],
  ];
  for (const [registry, diagnostic] of cases) {
    assert.throws(() => withTierRegistry(registry, () => loadTierRegistry()), diagnostic);
  }
});

test("rejects duplicate tier names and identifies both declarations", () => {
  assert.throws(() => withTierRegistry({
    version: 1,
    tiers: [
      { name: "duplicate", command: "node -e \"process.exit(0)\"" },
      { name: "duplicate", command: "node -e \"process.exit(0)\"" },
    ],
  }, () => loadTierRegistry()), /duplicate tier name "duplicate" at index 1; already declared at index 0/);
});

test("resolves every registered tier from a valid plan to its exact command", () => {
  const tiers = loadTierRegistry();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-lock-"));
  const file = path.join(directory, "plan.md");

  try {
    for (const [tierName, registeredTier] of tiers) {
      fs.writeFileSync(file, valid.replace("`test-standard`", `\`${tierName}\``));
      const resolved = readPlanTier(file);

      assert.equal(resolved.tierName, tierName);
      assert.deepEqual(resolved.tier, registeredTier);
      assert.equal(resolved.tier.command, registeredTier.command);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
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

test("maintenance reports schema problems and expired active records without failing", () => {
  const result = withCatalog([
    baselineRecord("BASE-DUPLICATE"),
    baselineRecord("BASE-DUPLICATE", { reviewDeadline: "2020-01-01T00:00:00.000Z" }),
    { id: "BASE-MALFORMED", status: "not-a-status" },
    null,
    "not a record",
  ], () => spawnSync(process.execPath, [path.join(root, "scripts/maintain-validation-baseline.mjs")], {
    cwd: root,
    encoding: "utf8",
  }));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Schema problem: baseline BASE-DUPLICATE is duplicated/);
  assert.match(result.stderr, /Schema problem: baseline BASE-MALFORMED has an invalid status/);
  assert.match(result.stderr, /Schema problem: baseline record at index 3 is malformed/);
  assert.match(result.stderr, /Schema problem: baseline record at index 4 is malformed/);
  assert.match(result.stderr, /Expired active record: BASE-DUPLICATE/);
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

test("locked runner invokes the exact command returned by the registered tier", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-lock-"));
  const file = path.join(directory, "plan.md");
  const marker = path.join(directory, "validation-ran");
  const lockedValid = `${valid}\n## Regression Guard\n**Covers:** The locked runner must execute the selected registered validation command.\n**Test location:** scripts/check-failure-gate.test.mjs\n**What it checks:** The marker is written only when the registry-selected command starts.\n`;
  fs.writeFileSync(file, lockedValid);
  const command = `node -e "require('fs').writeFileSync('${marker}', 'registry-command')"`;
  const result = withTierRegistry({
    version: 1,
    tiers: [{ name: "test-standard", command }],
  }, () => spawnSync(process.execPath, [runner, file], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  }));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`Running tier "test-standard": ${command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.equal(fs.readFileSync(marker, "utf8"), "registry-command");
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
  assert.match(result.stderr, new RegExp(`${path.relative(root, file)}.*unknown validation tier "heavier-than-allowed".*Validation \\*\\*Command:\\*\\*`));
  fs.rmSync(directory, { recursive: true, force: true });
});

test("locked runner explains a missing validation command and stops before running", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-lock-"));
  const file = path.join(directory, "plan.md");
  fs.writeFileSync(file, valid.replace("**Command:** `test-standard`\n", ""));
  const result = spawnSync(process.execPath, [runner, file], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`${path.relative(root, file)}.*no parseable Validation \\*\\*Command:\\*\\*`));
  assert.doesNotMatch(result.stderr, /\[VALIDATION\] Running tier/);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("locked runner explains malformed registry data and stops before running", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-lock-"));
  const file = path.join(directory, "plan.md");
  const marker = path.join(directory, "validation-ran");
  fs.writeFileSync(file, valid);
  const result = withTierRegistry({
    version: 1,
    tiers: [
      {
        name: "test-standard",
        command: `node -e "require('fs').writeFileSync('${marker}', 'ran')"`,
      },
      { name: "malformed-tier" },
    ],
  }, () => spawnSync(process.execPath, [runner, file], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`${path.relative(root, file)}.*validation tier "test-standard".*malformed tier at index 1`));
  assert.doesNotMatch(result.stderr, /\[VALIDATION\] Running tier/);
  assert.equal(fs.existsSync(marker), false);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("locked runner explains missing TASK_PLAN_FILE before running", () => {
  const result = spawnSync(process.execPath, [runner], {
    cwd: root,
    env: { ...process.env, TASK_PLAN_FILE: undefined },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TASK_PLAN_FILE is not set/);
  assert.match(result.stderr, /pass a readable \.md task plan path explicitly/);
  assert.doesNotMatch(result.stderr, /\[VALIDATION\] Running tier/);
});

test("locked runner distinguishes an unreadable explicit plan and stops before running", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-lock-"));
  const file = path.join(directory, "missing.md");
  const result = spawnSync(process.execPath, [runner, file], {
    cwd: root,
    env: { ...process.env, TASK_PLAN_FILE: path.join(directory, "ignored.md") },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`${path.relative(root, file)}.*exact path: ${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*source: explicit plan argument`));
  assert.match(result.stderr, /Repair the explicit plan argument/);
  assert.doesNotMatch(result.stderr, /\[VALIDATION\] Running tier/);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("direct runner explains an unknown tier with the registry context", () => {
  const result = spawnSync(process.execPath, [directRunner, "not-a-registered-tier"], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Validation-tier registry .*does not define requested tier "not-a-registered-tier"/);
  assert.match(result.stderr, /check the registered tiers in docs\/validation\/validation-tiers\.json/);
  assert.doesNotMatch(result.stdout, /\[VALIDATION\] Running tier/);
});

test("direct runner explains malformed registry data and stops before running", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "failure-gate-direct-"));
  const marker = path.join(directory, "validation-ran");
  const result = withTierRegistry({
    version: 1,
    tiers: [
      {
        name: "test-standard",
        command: `node -e "require('fs').writeFileSync('${marker}', 'ran')"`,
      },
      { name: "malformed-tier" },
    ],
  }, () => spawnSync(process.execPath, [directRunner, "test-standard"], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Validation-tier registry .*malformed tier at index 1/);
  assert.doesNotMatch(result.stdout, /\[VALIDATION\] Running tier/);
  assert.equal(fs.existsSync(marker), false);
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
  execFileSync(process.execPath, [
    path.join(root, "scripts/new-plan.mjs"),
    "--title", "Scaffold case",
    "--why", "The task needs a reproducible validation ceiling.",
    "--guard-covers", "A generated plan must retain its selected validation ceiling.",
    "--guard-test-location", "scripts/check-failure-gate.test.mjs",
    "--guard-checks", "Asserts that the generated plan keeps the exact registered validation command.",
    "--output", file,
  ], { cwd: root });
  assert.deepEqual(validatePlanText(fs.readFileSync(file, "utf8"), file), []);
  fs.rmSync(directory, { recursive: true, force: true });
});
