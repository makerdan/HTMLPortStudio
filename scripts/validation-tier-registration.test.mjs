import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageFile = path.join(root, "package.json");
const registryFile = path.join(root, "docs/validation/validation-tiers.json");
const runner = path.join(root, "scripts/run-locked-tier.mjs");
const tierNames = [
  "test-fast",
  "test-standard",
  "test-standard-plus",
  "test-heavy",
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function createRegistry(registry) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "validation-tier-registry-"),
  );
  const file = path.join(directory, "validation-tiers.json");
  fs.writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`);
  return {
    file,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

test("every registered tier has a unique executable root package command", () => {
  const packageJson = readJson(packageFile);
  const registry = readJson(registryFile);
  assert.deepEqual(
    registry.tiers.map((tier) => tier.name),
    tierNames,
  );
  assert.equal(
    new Set(registry.tiers.map((tier) => tier.name)).size,
    tierNames.length,
  );
  for (const tier of registry.tiers) {
    assert.equal(tier.command, `pnpm run ${tier.name}`);
    assert.equal(typeof packageJson.scripts[tier.name], "string");
    assert.ok(packageJson.scripts[tier.name].trim());
  }
});

test("registry loading rejects duplicate names and missing command targets", async () => {
  const { loadTierRegistry } = await import("./lib/tier-lock-check.mjs");
  const duplicate = createRegistry({
    version: 1,
    tiers: [
      { name: "test-fast", command: "pnpm run test-fast" },
      { name: "test-fast", command: "pnpm run test-fast" },
    ],
  });
  const missingCommand = createRegistry({
    version: 1,
    tiers: [{ name: "test-fast" }],
  });
  try {
    assert.throws(
      () => loadTierRegistry(duplicate.file),
      /duplicate tier name "test-fast"/,
    );
    assert.throws(
      () => loadTierRegistry(missingCommand.file),
      /malformed tier at index 0/,
    );
  } finally {
    duplicate.cleanup();
    missingCommand.cleanup();
  }
});

test("locked runner executes exactly the tier selected by the plan", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "validation-tier-lock-"),
  );
  const plan = path.join(directory, "plan.md");
  const marker = path.join(directory, "selected-tier");
  const baseline = path.join(directory, "failure-baseline.json");
  fs.writeFileSync(baseline, '{"version":1,"records":[]}\n');
  const registry = {
    version: 1,
    tiers: [
      {
        name: "test-fast",
        command: `node -e "require('fs').writeFileSync('${marker}', 'fast')"`,
      },
      {
        name: "test-standard",
        command: `node -e "require('fs').writeFileSync('${marker}', 'standard')"`,
      },
      {
        name: "test-standard-plus",
        command: `node -e "require('fs').writeFileSync('${marker}', 'standard-plus')"`,
      },
      {
        name: "test-heavy",
        command: `node -e "require('fs').writeFileSync('${marker}', 'heavy')"`,
      },
    ],
  };
  fs.writeFileSync(
    plan,
    `# Validation tier selection

## Pre-existing failures to ignore
None known at plan time.

## Validation
**Command:** \`test-standard-plus\`
**Why:** This test verifies that the locked runner honors the plan's selected tier.
**Do not escalate:** Run exactly this command.

## Regression Guard
**Covers:** Exact tier selection.
**Test location:** scripts/validation-tier-registration.test.mjs
**What it checks:** The locked runner executes the named tier.
`,
  );
  const customRegistry = createRegistry(registry);
  const result = spawnSync(process.execPath, [runner, plan], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      FAILURE_BASELINE_FILE: baseline,
      VALIDATION_TIER_REGISTRY_FILE: customRegistry.file,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(marker, "utf8"), "standard-plus");
  customRegistry.cleanup();
  fs.rmSync(directory, { recursive: true, force: true });
});