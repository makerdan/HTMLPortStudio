import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  addMissingRegressionGuardStub,
  classifyRegressionGuardInspection,
  inspectRegressionGuardFile,
  validateRegressionGuardText,
} from "./lib/regression-guard.mjs";
import {
  REGRESSION_GUARD_GUIDANCE_END,
  REGRESSION_GUARD_GUIDANCE_START,
  REGRESSION_GUARD_POLICY_END,
  REGRESSION_GUARD_POLICY_START,
  renderDocumentationGuardExamples,
  renderDocumentationGuardPolicy,
  renderPlannerGuardExamples,
  renderPlannerGuardPolicy,
} from "./lib/regression-guard-guidance.mjs";
import { updateRegressionGuardGuidance } from "./update-regression-guard-guidance.mjs";

const root = path.resolve(import.meta.dirname, "..");
const checker = path.join(root, "scripts/check-regression-guard.mjs");
const planner = path.join(root, "scripts/new-plan.mjs");
const failureGateSkill = path.join(
  root,
  ".agents/skills/failure-gate/SKILL.md",
);
const projectGuidance = path.join(root, "replit.md");

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

function extractGuardExamples(text, sourceLabel) {
  const blocks = [
    ...text.matchAll(
      /<!-- BEGIN GENERATED REGRESSION GUARD EXAMPLES -->\n([\s\S]*?)\n<!-- END GENERATED REGRESSION GUARD EXAMPLES -->/g,
    ),
  ];
  assert.equal(
    blocks.length,
    1,
    `[REGRESSION-GUARD-DOCS] ${sourceLabel} must contain exactly one generated guidance block.`,
  );
  const block = blocks[0]?.[1].trim();
  assert.ok(
    block?.startsWith("```sh\n") &&
      block.includes("# Concrete guard") &&
      block.includes("# N/A guard") &&
      block.includes("# Self-satisfying guard"),
    `[REGRESSION-GUARD-DOCS] ${sourceLabel} is missing the complete Concrete, N/A, and self-satisfying examples.`,
  );
  return block;
}

function extractGeneratedBlock(text, start, end, sourceLabel, section) {
  const blocks = [
    ...text.matchAll(new RegExp(`${start}\\n([\\s\\S]*?)\\n${end}`, "g")),
  ];
  assert.equal(
    blocks.length,
    1,
    `[REGRESSION-GUARD-DOCS] ${sourceLabel} § ${section} must contain exactly one generated guidance block.`,
  );
  return `${start}\n${blocks[0]?.[1]}\n${end}`;
}

function withFileText(file, mutate, callback) {
  const original = fs.readFileSync(file, "utf8");
  try {
    fs.writeFileSync(file, mutate(original));
    return callback();
  } finally {
    fs.writeFileSync(file, original);
  }
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
  assert.deepEqual(
    validateRegressionGuardText(plan, "self-satisfying plan"),
    [],
  );
});

test("rejects a missing guard section", () => {
  assert.ok(
    validateRegressionGuardText(baseline, "missing plan").some((error) =>
      error.includes('missing "## Regression Guard"'),
    ),
  );
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
  assert.ok(
    validateRegressionGuardText(beforeValidation, "misplaced plan").some(
      (error) => error.includes("after"),
    ),
  );

  const duplicate = `${concrete}
## Regression Guard
**Self-satisfying** — this task's deliverable is a guard script.
`;
  assert.ok(
    validateRegressionGuardText(duplicate, "duplicate plan").some((error) =>
      error.includes("more than one"),
    ),
  );

  const afterRelevant = `${baseline}
## Relevant files
- scripts/example.mjs

## Regression Guard
**Self-satisfying** — this task's deliverable is a guard script.
`;
  assert.ok(
    validateRegressionGuardText(afterRelevant, "wrong-order plan").some(
      (error) => error.includes("before"),
    ),
  );
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
  assert.ok(
    result.text.indexOf("## Regression Guard") >
      result.text.indexOf("## Validation"),
  );
  assert.ok(
    result.text.indexOf("## Regression Guard") <
      result.text.indexOf("## Relevant files"),
  );
  assert.ok(
    validateRegressionGuardText(result.text, "stub plan").some((error) =>
      error.includes("placeholder"),
    ),
  );
});

test("fix-stub is remediation-only while strict mode rejects the stub", () => {
  const { directory, file } = temporaryPlan(baseline);
  try {
    const fixed = spawnSync(
      process.execPath,
      [checker, "--fix-stub", "--plan", file],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(fixed.status, 0, fixed.stderr);
    assert.match(fs.readFileSync(file, "utf8"), /## Regression Guard/);

    const strict = spawnSync(process.execPath, [checker, "--plan", file], {
      cwd: root,
      encoding: "utf8",
    });
    assert.notEqual(strict.status, 0);
    assert.match(strict.stderr, /placeholder/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("stubs-only skips missing sections but still adds a stub", () => {
  const { directory, file } = temporaryPlan(baseline);
  try {
    const result = spawnSync(
      process.execPath,
      [checker, "--stubs-only", "--plan", file],
      { cwd: root, encoding: "utf8" },
    );
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
      env: {
        ...process.env,
        TASK_PLAN_FILE: path.join(directory, "missing.md"),
      },
      encoding: "utf8",
    });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /does not exist/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("archive classification names historical gaps without turning them into current failures", () => {
  const cases = [
    {
      label: "missing",
      text: baseline,
      category: "missing",
    },
    {
      label: "misplaced",
      text: `## Regression Guard
${concrete.split("## Regression Guard\n")[1]}
${baseline}`,
      category: "misplaced",
    },
    {
      label: "placeholder",
      text: `${baseline}
## Regression Guard
**Covers:** REQUIRED: describe the scenario.
**Test location:** scripts/example.test.mjs
**What it checks:** Asserts the expected behavior.
`,
      category: "placeholder",
    },
    {
      label: "malformed",
      text: `${baseline}
## Regression Guard
**Covers:** A concrete scenario is described here.
**Test location:** the relevant test
**What it checks:** This is a specific assertion with enough detail.
`,
      category: "malformed",
    },
  ];

  for (const entry of cases) {
    const { directory, file } = temporaryPlan(entry.text);
    try {
      const classified = classifyRegressionGuardInspection(
        inspectRegressionGuardFile(file),
      );
      assert.ok(
        classified.categories.includes(entry.category),
        `${entry.label} was not classified`,
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("archive mode reports historical findings as read-only", () => {
  const archiveDir = path.join(root, ".local/tasks");
  const before = new Map(
    fs
      .readdirSync(archiveDir)
      .filter((name) => name.endsWith(".md"))
      .map((name) => [
        name,
        fs.readFileSync(path.join(archiveDir, name), "utf8"),
      ]),
  );
  const result = spawnSync(process.execPath, [checker, "--archive"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /HISTORICAL ARCHIVE REPORT \(read-only\)/);
  assert.match(result.stdout, /not current-task validation failures/);
  for (const [name, text] of before) {
    assert.equal(
      fs.readFileSync(path.join(archiveDir, name), "utf8"),
      text,
      `${name} was modified`,
    );
  }
});

test("plan creation rejects a missing or incomplete guard before creating a file", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-plan-"),
  );
  const file = path.join(directory, "incomplete.md");
  try {
    const result = spawnSync(
      process.execPath,
      [
        planner,
        "--title",
        "Incomplete guard",
        "--why",
        "The plan must reject incomplete guard decisions before writing.",
        "--guard-covers",
        "A concrete scenario is described here.",
        "--output",
        file,
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /requires --guard-covers, --guard-test-location, and --guard-checks/,
    );
    assert.match(result.stderr, /node scripts\/new-plan\.mjs --help/);
    assert.match(result.stderr, /complete concrete guard example/);
    assert.equal(fs.existsSync(file), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("plan creation help lists all supported guard decisions", () => {
  for (const flag of ["--help", "-h"]) {
    const result = spawnSync(process.execPath, [planner, flag], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Concrete guard:/);
    assert.match(
      result.stdout,
      /--guard-covers .*--guard-test-location .*--guard-checks/s,
    );
    assert.match(result.stdout, /N\/A guard:/);
    assert.match(result.stdout, /--guard-na-reason/);
    assert.match(result.stdout, /Self-satisfying guard:/);
    assert.match(result.stdout, /--guard-self-satisfying/);
  }
});

test("plan creation help lists non-guard options and safe evidence examples", () => {
  const result = spawnSync(process.execPath, [planner, "--help"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  for (const option of [
    "--title",
    "--why",
    "--slug",
    "--validation-tier",
    "--baseline-id",
    "--owned-baseline-id",
    "--pre-existing",
    "--environment-observation",
    "--output",
  ]) {
    assert.match(result.stdout, new RegExp(option.replaceAll("-", "\\-")));
  }
  assert.match(result.stdout, /test-standard-plus/);
  assert.match(result.stdout, /does not lower the validation tier/);
  assert.match(result.stdout, /BASE-ACTIVE/);
  assert.match(result.stdout, /environment-observation/);
});

test("plan creation help lists exactly the registered validation tiers", () => {
  const registry = JSON.parse(
    fs.readFileSync(
      path.join(root, "docs/validation/validation-tiers.json"),
      "utf8",
    ),
  );
  const result = spawnSync(process.execPath, [planner, "--help"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);

  const helpTierMatch = result.stdout.match(
    /Available tiers include\s+([^.]+)\./,
  );
  assert.ok(
    helpTierMatch,
    "plan help must include its registered validation tier list",
  );
  const tierList = helpTierMatch[1].split(",").map((tier) => tier.trim());
  assert.deepEqual(
    tierList,
    registry.tiers.map((tier) => tier.name),
    "plan help must stay synchronized with docs/validation/validation-tiers.json",
  );
});

test("keeps guard examples synchronized across the planner and canonical guidance", () => {
  const help = spawnSync(process.execPath, [planner, "--help"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  const plannerExamples = help.stdout.match(
    /(?:^|\n)(  Concrete guard:[\s\S]*?)(?=\n\nUse --help)/,
  )?.[1];
  assert.equal(
    plannerExamples,
    renderPlannerGuardExamples(),
    "[REGRESSION-GUARD-DOCS] planner help examples drifted from the shared definition.",
  );

  for (const [sourceLabel, file] of [
    [".agents/skills/failure-gate/SKILL.md", failureGateSkill],
    ["replit.md", projectGuidance],
  ]) {
    const documentation = fs.readFileSync(file, "utf8");
    const documentationExamples = extractGuardExamples(
      documentation,
      sourceLabel,
    );
    assert.equal(
      `${REGRESSION_GUARD_GUIDANCE_START}\n${documentationExamples}\n${REGRESSION_GUARD_GUIDANCE_END}`,
      renderDocumentationGuardExamples(),
      `[REGRESSION-GUARD-DOCS] ${sourceLabel} generated examples are stale. ` +
        "Run node scripts/update-regression-guard-guidance.mjs.",
    );
    assert.equal(
      extractGeneratedBlock(
        documentation,
        REGRESSION_GUARD_POLICY_START,
        REGRESSION_GUARD_POLICY_END,
        sourceLabel,
        "Regression Guard policy",
      ),
      renderDocumentationGuardPolicy(),
      `[REGRESSION-GUARD-DOCS] ${sourceLabel} generated policy drifted.`,
    );
  }

  const plannerPolicy = help.stdout.match(
    /Regression Guard decision \(provide exactly one\):\n\n([\s\S]*?)\n\n  Concrete guard:/,
  )?.[1];
  assert.equal(
    plannerPolicy,
    renderPlannerGuardPolicy(),
    "[REGRESSION-GUARD-DOCS] planner help policy drifted from the shared definition.",
  );
});

test("guidance freshness reports the document and section without rewriting tracked guidance", () => {
  const original = fs.readFileSync(projectGuidance, "utf8");
  const stale = original.replace(
    "The permitted exceptions are:",
    "The permitted exceptions have drifted:",
  );
  fs.writeFileSync(projectGuidance, stale);
  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "scripts/update-regression-guard-guidance.mjs"),
        "--check",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /replit\.md § Regression Guard policy/);
    assert.match(result.stderr, /stale generated content/);
    assert.match(
      result.stderr,
      /node scripts\/update-regression-guard-guidance\.mjs/,
    );
    assert.equal(fs.readFileSync(projectGuidance, "utf8"), stale);

    const validation = spawnSync(
      process.execPath,
      [path.join(root, "scripts/validation-steps.mjs")],
      {
        cwd: root,
        encoding: "utf8",
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            ([key]) => key !== "TASK_PLAN_FILE",
          ),
        ),
      },
    );
    assert.notEqual(validation.status, 0);
    assert.match(validation.stderr, /replit\.md § Regression Guard policy/);
    assert.equal(fs.readFileSync(projectGuidance, "utf8"), stale);
  } finally {
    fs.writeFileSync(projectGuidance, original);
  }
});

test("guidance freshness explains missing documents without mutating tracked guidance", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-missing-"),
  );
  const before = new Map(
    [failureGateSkill, projectGuidance].map((file) => [
      file,
      fs.readFileSync(file, "utf8"),
    ]),
  );
  const errors = [];
  try {
    const status = updateRegressionGuardGuidance({
      root: directory,
      guidanceFiles: ["missing-guidance.md"],
      checkOnly: true,
      reportError: (message) => errors.push(message),
    });
    assert.equal(status, 1);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Missing guidance document: missing-guidance\.md/);
    assert.match(
      errors[0],
      /Affected Regression Guard guidance sections: Regression Guard policy, Regression Guard examples/,
    );
    assert.match(errors[0], /missing document, not stale generated content/);
    assert.match(
      errors[0],
      /node scripts\/update-regression-guard-guidance\.mjs/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    for (const [file, text] of before)
      assert.equal(fs.readFileSync(file, "utf8"), text);
  }
});

test("guidance freshness explains unreadable documents without mutating tracked guidance", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-unreadable-"),
  );
  const unreadablePath = path.join(directory, "unreadable-guidance.md");
  const before = new Map(
    [failureGateSkill, projectGuidance].map((file) => [
      file,
      fs.readFileSync(file, "utf8"),
    ]),
  );
  const errors = [];
  fs.mkdirSync(unreadablePath);
  try {
    const status = updateRegressionGuardGuidance({
      root: directory,
      guidanceFiles: ["unreadable-guidance.md"],
      checkOnly: true,
      reportError: (message) => errors.push(message),
    });
    assert.equal(status, 1);
    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /Unreadable guidance document: unreadable-guidance\.md/,
    );
    assert.match(
      errors[0],
      /Affected Regression Guard guidance sections: Regression Guard policy, Regression Guard examples/,
    );
    assert.match(errors[0], /unreadable document, not stale generated content/);
    assert.match(
      errors[0],
      /node scripts\/update-regression-guard-guidance\.mjs/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    for (const [file, text] of before)
      assert.equal(fs.readFileSync(file, "utf8"), text);
  }
});

test("guidance freshness reports every missing and unreadable document in one run", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-multiple-broken-"),
  );
  const missingFile = "missing-guidance.md";
  const unreadableFile = "unreadable-guidance.md";
  const before = new Map(
    [failureGateSkill, projectGuidance].map((file) => [
      file,
      fs.readFileSync(file, "utf8"),
    ]),
  );
  const errors = [];
  fs.mkdirSync(path.join(directory, unreadableFile));
  try {
    const status = updateRegressionGuardGuidance({
      root: directory,
      guidanceFiles: [missingFile, unreadableFile],
      checkOnly: true,
      reportError: (message) => errors.push(message),
    });

    assert.equal(status, 1);
    assert.equal(errors.length, 2);
    assert.match(
      errors[0],
      new RegExp(`Missing guidance document: ${missingFile}`),
    );
    assert.match(
      errors[0],
      /Affected Regression Guard guidance sections: Regression Guard policy, Regression Guard examples/,
    );
    assert.match(errors[0], /missing document, not stale generated content/);
    assert.match(
      errors[0],
      /node scripts\/update-regression-guard-guidance\.mjs/,
    );
    assert.match(
      errors[1],
      new RegExp(`Unreadable guidance document: ${unreadableFile}`),
    );
    assert.match(
      errors[1],
      /Affected Regression Guard guidance sections: Regression Guard policy, Regression Guard examples/,
    );
    assert.match(errors[1], /unreadable document, not stale generated content/);
    assert.match(
      errors[1],
      /node scripts\/update-regression-guard-guidance\.mjs/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    for (const [file, text] of before)
      assert.equal(fs.readFileSync(file, "utf8"), text);
  }
});

test("guidance CLI reports every broken fixture document without mutating tracked guidance", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-cli-broken-"),
  );
  const missingFile = path.join(directory, "missing-guidance.md");
  const unreadableFile = path.join(directory, "unreadable-guidance.md");
  const before = new Map(
    [failureGateSkill, projectGuidance].map((file) => [
      file,
      fs.readFileSync(file, "utf8"),
    ]),
  );
  fs.mkdirSync(unreadableFile);

  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "scripts/update-regression-guard-guidance.mjs"),
        "--check",
        missingFile,
        unreadableFile,
      ],
      { cwd: root, encoding: "utf8" },
    );

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      new RegExp(`Missing guidance document: ${missingFile}`),
    );
    assert.match(
      result.stderr,
      /Affected Regression Guard guidance sections: Regression Guard policy, Regression Guard examples/,
    );
    assert.match(
      result.stderr,
      /missing document, not stale generated content/,
    );
    assert.match(
      result.stderr,
      /Restore the document, then run node scripts\/update-regression-guard-guidance\.mjs/,
    );
    assert.match(
      result.stderr,
      new RegExp(`Unreadable guidance document: ${unreadableFile}`),
    );
    assert.match(
      result.stderr,
      /unreadable document, not stale generated content/,
    );
    assert.match(
      result.stderr,
      /Restore access to the document, then run node scripts\/update-regression-guard-guidance\.mjs/,
    );
    assert.equal(result.stdout, "");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
    for (const [file, text] of before) {
      assert.equal(fs.readFileSync(file, "utf8"), text);
    }
  }
});

test("guidance updater rolls back earlier repairs when a later write fails", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-write-failure-"),
  );
  const firstFile = "first-guidance.md";
  const secondFile = "second-guidance.md";
  const firstPath = path.join(directory, firstFile);
  const secondPath = path.join(directory, secondFile);
  const source = fs.readFileSync(projectGuidance, "utf8");
  const stale = source.replace(
    "The permitted exceptions are:",
    "The permitted exceptions have drifted:",
  );
  const errors = [];
  const writes = [];
  fs.writeFileSync(firstPath, stale);
  fs.writeFileSync(secondPath, stale);

  try {
    const status = updateRegressionGuardGuidance({
      root: directory,
      guidanceFiles: [firstFile, secondFile],
      reportError: (message) => errors.push(message),
      writeFile: (file, text) => {
        writes.push(file);
        if (file === secondPath) {
          throw new Error("simulated permission failure");
        }
        fs.writeFileSync(file, text);
      },
    });

    assert.equal(status, 1);
    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /Could not write guidance document: second-guidance\.md/,
    );
    assert.match(errors[0], /Earlier document changes were rolled back/);
    assert.match(
      errors[0],
      /Run node scripts\/update-regression-guard-guidance\.mjs/,
    );
    assert.deepEqual(writes, [firstPath, secondPath, firstPath]);
    assert.equal(fs.readFileSync(firstPath, "utf8"), stale);
    assert.equal(fs.readFileSync(secondPath, "utf8"), stale);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("guidance freshness rejects malformed generated blocks with an updater command", () => {
  const original = fs.readFileSync(projectGuidance, "utf8");
  const malformed = original.replace(
    "\n<!-- END GENERATED REGRESSION GUARD POLICY -->",
    "",
  );
  fs.writeFileSync(projectGuidance, malformed);
  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "scripts/update-regression-guard-guidance.mjs"),
        "--check",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /replit\.md § Regression Guard policy/);
    assert.match(result.stderr, /exactly one generated guidance block/);
    assert.match(
      result.stderr,
      /node scripts\/update-regression-guard-guidance\.mjs/,
    );
    assert.equal(fs.readFileSync(projectGuidance, "utf8"), malformed);
  } finally {
    fs.writeFileSync(projectGuidance, original);
  }
});

test("validation runs guidance freshness before ad-hoc plan checks and leaves documents unchanged", () => {
  const before = new Map(
    [failureGateSkill, projectGuidance].map((file) => [
      file,
      fs.readFileSync(file, "utf8"),
    ]),
  );
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/validation-steps.mjs")],
    {
      cwd: root,
      encoding: "utf8",
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== "TASK_PLAN_FILE"),
      ),
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Generated guidance is current \(read-only\)/);
  assert.match(
    result.stdout,
    /No TASK_PLAN_FILE set; validation is running in ad-hoc mode/,
  );
  assert.ok(
    result.stdout.indexOf("Generated guidance is current") <
      result.stdout.indexOf("No TASK_PLAN_FILE set"),
    "guidance freshness must run before plan checks",
  );
  for (const [file, text] of before)
    assert.equal(fs.readFileSync(file, "utf8"), text);
});

test("plan creation points missing guard decisions to the supported examples", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-plan-help-"),
  );
  const file = path.join(directory, "missing.md");
  try {
    const result = spawnSync(
      process.execPath,
      [
        planner,
        "--title",
        "Missing guard",
        "--why",
        "The plan must explain how to choose a Regression Guard.",
        "--output",
        file,
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Provide exactly one Regression Guard decision/,
    );
    assert.match(result.stderr, /node scripts\/new-plan\.mjs --help/);
    assert.match(result.stderr, /concrete, N\/A, and self-satisfying examples/);
    assert.equal(fs.existsSync(file), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("plan creation points invalid non-guard inputs to the help section", () => {
  const cases = [
    [
      "--validation-tier",
      "unknown-tier",
      /validation-tier option and registered tier examples/,
    ],
    ["--baseline-id", "TODO", /non-guard options and examples/],
    ["--baseline-id", "UNKNOWN-BASELINE", /non-guard options and examples/],
    ["--environment-observation", undefined, /non-guard options and examples/],
  ];
  for (const [option, value, expected] of cases) {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "non-guard-plan-help-"),
    );
    const file = path.join(directory, "invalid.md");
    const args = [
      planner,
      "--title",
      "Invalid non-guard input",
      "--why",
      "The planner should explain how to repair non-guard inputs.",
      "--guard-self-satisfying",
      "the Regression Guard checker and focused recurrence test",
      "--output",
      file,
      option,
    ];
    if (value !== undefined) args.push(value);
    try {
      const result = spawnSync(process.execPath, args, {
        cwd: root,
        encoding: "utf8",
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, expected);
      assert.equal(fs.existsSync(file), false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("plan creation writes a compliant section for every supported decision", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "regression-guard-planner-"),
  );
  const fixtureScripts = path.join(directory, "scripts");
  const fixtureDocs = path.join(directory, "docs");
  fs.cpSync(path.join(root, "scripts"), fixtureScripts, { recursive: true });
  fs.cpSync(path.join(root, "docs"), fixtureDocs, { recursive: true });
  fs.mkdirSync(path.join(directory, ".local/tasks"), { recursive: true });
  const baselineFile = path.join(directory, "failure-baseline.json");
  fs.writeFileSync(baselineFile, JSON.stringify({ version: 1, records: [] }));
  fs.writeFileSync(
    path.join(fixtureDocs, "validation/validation-tiers.json"),
    JSON.stringify({
      version: 1,
      tiers: [{ name: "test-standard", command: "true", timeoutMs: 1000 }],
    }),
  );

  const decisions = [
    [
      "--guard-covers",
      "A delayed response must not replace newer editor content.",
      "--guard-test-location",
      "scripts/check-regression-guard.test.mjs",
      "--guard-checks",
      "Asserts that an older response is ignored and the newest content remains selected.",
      "**Covers:** A delayed response must not replace newer editor content.",
    ],
    [
      "--guard-na-reason",
      "The failure is a race condition requiring real timing: genuine wall-clock concurrency cannot be faithfully reproduced with fake timers.",
      "**N/A**",
    ],
    [
      "--guard-self-satisfying",
      "the Regression Guard checker and focused recurrence test",
      "**Self-satisfying**",
    ],
  ];

  try {
    for (const [index, decision] of decisions.entries()) {
      const output = path.join(directory, ".local/tasks", `plan-${index}.md`);
      const result = spawnSync(
        process.execPath,
        [
          path.join(fixtureScripts, "new-plan.mjs"),
          "--title",
          `Planner decision ${index}`,
          "--why",
          "The generated plan must preserve its validation contract.",
          ...decision.slice(0, decision.length - 1),
          "--output",
          output,
        ],
        {
          cwd: directory,
          encoding: "utf8",
          env: { ...process.env, FAILURE_BASELINE_FILE: baselineFile },
        },
      );
      assert.equal(result.status, 0, result.stderr);
      const text = fs.readFileSync(output, "utf8");
      assert.deepEqual(validateRegressionGuardText(text, output), []);
      assert.match(
        text,
        new RegExp(decision.at(-1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
      assert.match(text, /## Pre-existing failures to ignore/);
      assert.match(text, /## Validation\n\*\*Command:\*\* `test-standard`/);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
