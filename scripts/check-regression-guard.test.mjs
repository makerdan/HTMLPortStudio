import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  addMissingRegressionGuardStub,
  validateRegressionGuardText,
} from "./lib/regression-guard.mjs";

const root = path.resolve(import.meta.dirname, "..");
const checker = path.join(root, "scripts/check-regression-guard.mjs");

const baseline = `## Pre-existing failures to ignore
None known at plan time.

## Validation
**Command:** \`test-standard\`
**Why:** The standard tier covers this task.
**Do not escalate:** Run exactly this command.
`;

const concrete = `${baseline}
## Regression Guard
**Covers:** A stale source replacement response arriving after a newer import must not overwrite the current editor content.
**Test location:** artifacts/html-port-studio/src/lib/source-editor.test.ts
**What it checks:** Asserts that a delayed response for an older revision is ignored and the latest source remains selected.

## Relevant files
- source-editor.ts
`;

const naReasons = [
  "The failure is a race condition requiring real timing: it only appears during genuine wall-clock proxy concurrency that fake timers cannot reproduce.",
  "The failure is unmockable external API behavior: it depends on an upstream endpoint's undocumented drift that cannot be faithfully mocked.",
  "The failure is a visual regression with no screenshot infra: this project has no pixel-diff infrastructure to assert the rendered difference.",
  "The fix removes the feature entirely: the old code path is gone and no behavior remains to guard.",
];

function temporaryPlan(text, extension = ".md") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "regression-guard-"));
  const file = path.join(directory, `plan${extension}`);
  fs.writeFileSync(file, text);
  return { directory, file };
}

test("accepts a concrete guard with the required fields and placement", () => {
  assert.deepEqual(validateRegressionGuardText(concrete, "valid plan"), []);
});

test("accepts every documented N/A reason", () => {
  for (const reason of naReasons) {
    const plan = `${baseline}
## Regression Guard
**N/A**
**Why N/A:** ${reason}
`;
    assert.deepEqual(validateRegressionGuardText(plan, "N/A plan"), []);
  }
});

test("accepts a self-satisfying guard declaration", () => {
  const plan = `${baseline}
## Regression Guard
**Self-satisfying** — this task's deliverable is the Regression Guard checker and its focused recurrence test.
`;
  assert.deepEqual(validateRegressionGuardText(plan, "self-satisfying plan"), []);
});

test("rejects a missing guard section", () => {
  assert.ok(validateRegressionGuardText(baseline, "missing plan").some((error) => error.includes('missing "## Regression Guard"')));
});

test("rejects placeholders, vague fields, and malformed declarations", () => {
  const plan = `${baseline}
## Regression Guard
**Covers:** TBD
**Test location:** the relevant test
**What it checks:** It works.
`;
  const errors = validateRegressionGuardText(plan, "malformed plan");
  assert.ok(errors.some((error) => error.includes("placeholder")));
  assert.ok(errors.some((error) => error.includes("Test location")));
  assert.ok(errors.some((error) => error.includes("What it checks")));
});

test("rejects misplaced, duplicate, and wrong-order guard sections", () => {
  const beforeValidation = `## Regression Guard
${concrete.split("## Regression Guard\n")[1]}
${baseline}`;
  assert.ok(validateRegressionGuardText(beforeValidation, "misplaced plan").some((error) => error.includes("after")));

  const duplicate = `${concrete}
## Regression Guard
**Self-satisfying** — this task's deliverable is a guard script.
`;
  assert.ok(validateRegressionGuardText(duplicate, "duplicate plan").some((error) => error.includes("more than one")));

  const afterRelevant = `${baseline}
## Relevant files
- scripts/example.mjs

## Regression Guard
**Self-satisfying** — this task's deliverable is a guard script.
`;
  assert.ok(validateRegressionGuardText(afterRelevant, "wrong-order plan").some((error) => error.includes("before")));
});

test("rejects invalid and vague N/A declarations", () => {
  const plan = `${baseline}
## Regression Guard
**N/A**
**Why N/A:** This is hard to test and we will cover it later.
`;
  const errors = validateRegressionGuardText(plan, "invalid N/A plan");
  assert.ok(errors.some((error) => error.includes("permitted reasons")));
});

test("stubs missing structure in the correct location", () => {
  const result = addMissingRegressionGuardStub(`${baseline}
## Relevant files
- scripts/example.mjs
`);
  assert.equal(result.changed, true);
  assert.ok(result.text.indexOf("## Regression Guard") > result.text.indexOf("## Validation"));
  assert.ok(result.text.indexOf("## Regression Guard") < result.text.indexOf("## Relevant files"));
  assert.ok(validateRegressionGuardText(result.text, "stub plan").some((error) => error.includes("placeholder")));
});

test("fix-stub is remediation-only while strict mode rejects the stub", () => {
  const { directory, file } = temporaryPlan(baseline);
  try {
    const fixed = spawnSync(process.execPath, [checker, "--fix-stub", "--plan", file], { cwd: root, encoding: "utf8" });
    assert.equal(fixed.status, 0, fixed.stderr);
    assert.match(fs.readFileSync(file, "utf8"), /## Regression Guard/);

    const strict = spawnSync(process.execPath, [checker, "--plan", file], { cwd: root, encoding: "utf8" });
    assert.notEqual(strict.status, 0);
    assert.match(strict.stderr, /placeholder/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("stubs-only skips missing sections but still adds a stub", () => {
  const { directory, file } = temporaryPlan(baseline);
  try {
    const result = spawnSync(process.execPath, [checker, "--stubs-only", "--plan", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(fs.readFileSync(file, "utf8"), /## Regression Guard/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("TASK_PLAN_FILE scopes to one plan and rejects invalid or missing paths", () => {
  const { directory, file } = temporaryPlan(concrete);
  try {
    const scoped = spawnSync(process.execPath, [checker], {
      cwd: root,
      env: { ...process.env, TASK_PLAN_FILE: file },
      encoding: "utf8",
    });
    assert.equal(scoped.status, 0, scoped.stderr);
    assert.match(scoped.stdout, /passed strict plan validation/);

    const wrongExtension = spawnSync(process.execPath, [checker], {
      cwd: root,
      env: { ...process.env, TASK_PLAN_FILE: file.replace(/\.md$/, ".txt") },
      encoding: "utf8",
    });
    assert.notEqual(wrongExtension.status, 0);
    assert.match(wrongExtension.stderr, /must end in \.md/);

    const missing = spawnSync(process.execPath, [checker], {
      cwd: root,
      env: { ...process.env, TASK_PLAN_FILE: path.join(directory, "missing.md") },
      encoding: "utf8",
    });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /does not exist/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});