import fs from "node:fs";
import path from "node:path";
import { ROOT, extractSectionBody, validatePlanPath } from "./tier-lock-check.mjs";

const GUARD_SECTION = "Regression Guard";
const PLACEHOLDER = /(?:<[^>]+>|\b(?:TODO|TBD|FIXME|REQUIRED)\b|\[(?:fill|choose|reason|command|describe)[^\]]*\]|\.\.\.|FILL\s*IN)/i;
const REQUIRED_FIELDS = ["Covers", "Test location", "What it checks"];
const FIELD_PATTERN = /^\*\*(Covers|Test location|What it checks):\*\*\s*(.*?)\s*$/;
const VALID_NA_REASONS = [
  {
    label: "race condition requiring real timing",
    pattern: /race condition requiring real timing|real[- ]time timing|wall[- ]clock.*(?:race|concurr|timing)|fake timers.*(?:cannot|can't|do not|don't)/i,
  },
  {
    label: "unmockable external API behavior",
    pattern: /unmockable external api|third[- ]party service|upstream endpoint|cannot be faithfully mocked|undocumented drift/i,
  },
  {
    label: "visual regression with no screenshot infra",
    pattern: /visual regression.*(?:no|without).*screenshot|no screenshot|no pixel[- ]diff|pixel[- ]diff infrastructure/i,
  },
  {
    label: "fix removes the feature entirely",
    pattern: /fix removes the feature entirely|feature (?:is )?(?:removed|gone)|code path (?:is )?(?:gone|removed)/i,
  },
];

export const REGRESSION_GUARD_STUB = `## Regression Guard
**Covers:** REQUIRED: describe the concrete scenario, boundary, invariant, lifecycle, reliability property, or contract.
**Test location:** REQUIRED: name the test file that will catch a recurrence.
**What it checks:** REQUIRED: state the specific assertion that fails if the old behavior returns.
`;

function sectionHeadings(text) {
  return [...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => ({
    name: match[1].trim(),
    index: match.index,
  }));
}

function addError(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function hasPlaceholder(value) {
  return !value.trim() || PLACEHOLDER.test(value);
}

function validateConcreteDeclaration(body, planFile, errors) {
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fields = [];
  for (const line of lines) {
    const match = line.match(FIELD_PATTERN);
    if (!match) {
      addError(errors, `${planFile} Regression Guard contains an unexpected or malformed field; expected Covers, Test location, and What it checks.`);
      continue;
    }
    fields.push({ name: match[1], value: match[2] });
  }

  if (fields.length !== REQUIRED_FIELDS.length) {
    addError(errors, `${planFile} Regression Guard must contain exactly one Covers, Test location, and What it checks field.`);
  }
  for (const [index, name] of REQUIRED_FIELDS.entries()) {
    const matches = fields.filter((field) => field.name === name);
    if (matches.length === 0) {
      addError(errors, `${planFile} Regression Guard is missing **${name}:**.`);
      continue;
    }
    if (matches.length > 1) {
      addError(errors, `${planFile} Regression Guard contains duplicate **${name}:** fields.`);
    }
    if (fields[index]?.name !== name) {
      addError(errors, `${planFile} Regression Guard fields must appear in this order: Covers, Test location, What it checks.`);
    }
    if (matches.some(({ value }) => hasPlaceholder(value))) {
      addError(errors, `${planFile} Regression Guard **${name}:** is missing a real, non-placeholder value.`);
    }
  }

  const covers = fields.find((field) => field.name === "Covers")?.value || "";
  if (/^(?:the|a|an)\s+(?:bug|issue|problem|failure)\.?$/i.test(covers.trim()) || covers.trim().length < 12) {
    addError(errors, `${planFile} Regression Guard **Covers:** must identify a concrete scenario, boundary, invariant, lifecycle, reliability property, or contract.`);
  }

  const location = fields.find((field) => field.name === "Test location")?.value || "";
  const filePath = /(?:^|[/\\])[^/\\\s]+\.[A-Za-z0-9]+(?:\s|$)/.test(location);
  if (location && (!filePath ||
      /^(?:a|the|some|relevant|appropriate)\s+(?:relevant\s+)?(?:test|tests|test file)/i.test(location) ||
      /^(?:tests?|specs?|test file)$/i.test(location))) {
    addError(errors, `${planFile} Regression Guard **Test location:** must name a concrete test file in the layer where the behavior lives.`);
  }

  const assertion = fields.find((field) => field.name === "What it checks")?.value || "";
  if (assertion && assertion.trim().length < 20) {
    addError(errors, `${planFile} Regression Guard **What it checks:** must describe a specific assertion or observable behavior.`);
  }
}

function validateNaDeclaration(body, planFile, errors) {
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0] !== "**N/A**") {
    addError(errors, `${planFile} Regression Guard N/A declarations must start with exactly **N/A**.`);
  }
  const why = lines.find((line) => line.startsWith("**Why N/A:**"));
  if (!why) {
    addError(errors, `${planFile} Regression Guard N/A declaration must include **Why N/A:**.`);
    return;
  }
  const reason = why.replace(/^\*\*Why N\/A:\*\*\s*/, "").trim();
  if (hasPlaceholder(reason) || reason.length < 30) {
    addError(errors, `${planFile} Regression Guard **Why N/A:** must contain a specific, non-placeholder reason.`);
    return;
  }
  if (!VALID_NA_REASONS.some(({ pattern }) => pattern.test(reason))) {
    addError(errors, `${planFile} Regression Guard **Why N/A:** must use one of the permitted reasons: race condition requiring real timing, unmockable external API behavior, visual regression with no screenshot infra, or fix removes the feature entirely.`);
  }
  if (lines.length !== 2) {
    addError(errors, `${planFile} Regression Guard N/A declarations may contain only **N/A** and **Why N/A:**.`);
  }
}

function validateSelfSatisfying(body, planFile, errors) {
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const declaration = lines[0] || "";
  if (!/^\*\*Self-satisfying\*\*\s+—\s+this task's deliverable is\b/i.test(declaration) ||
      hasPlaceholder(declaration) || lines.length !== 1) {
    addError(errors, `${planFile} Regression Guard self-satisfying declarations must state that this task's deliverable is the guard or test.`);
  }
}

function validatePlacement(text, planFile, errors) {
  const headings = sectionHeadings(text);
  const guards = headings.filter((entry) => entry.name === GUARD_SECTION);
  if (guards.length > 1) {
    addError(errors, `${planFile} contains more than one "## ${GUARD_SECTION}" section.`);
  }
  const guard = guards[0];
  if (!guard) return;

  const validation = headings.find((entry) => entry.name === "Validation");
  const baseline = headings.find((entry) => entry.name === "Pre-existing failures to ignore");
  const relevant = headings.find((entry) => entry.name === "Relevant files");
  if (validation && guard.index < validation.index) {
    addError(errors, `${planFile} "## ${GUARD_SECTION}" must appear after "## Validation".`);
  }
  if (baseline && guard.index < baseline.index) {
    addError(errors, `${planFile} "## ${GUARD_SECTION}" must appear after "## Pre-existing failures to ignore".`);
  }
  if (relevant && guard.index > relevant.index) {
    addError(errors, `${planFile} "## ${GUARD_SECTION}" must appear before "## Relevant files".`);
  }
}

export function validateRegressionGuardText(text, planFile = "task plan", { requireSection = true, placeholdersOnly = false } = {}) {
  const errors = [];
  const body = extractSectionBody(text, GUARD_SECTION);
  if (body === null) {
    if (requireSection) errors.push(`${planFile} is missing "## ${GUARD_SECTION}".`);
    return errors;
  }

  if (placeholdersOnly) {
    if (PLACEHOLDER.test(body)) {
      errors.push(`${planFile} Regression Guard contains an unfilled placeholder.`);
    }
    return errors;
  }

  validatePlacement(text, planFile, errors);
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    errors.push(`${planFile} has an empty "## ${GUARD_SECTION}" section.`);
    return errors;
  }
  if (lines[0] === "**N/A**" || lines.some((line) => line.startsWith("**Why N/A:**"))) {
    validateNaDeclaration(body, planFile, errors);
  } else if (lines[0].startsWith("**Self-satisfying**")) {
    validateSelfSatisfying(body, planFile, errors);
  } else {
    validateConcreteDeclaration(body, planFile, errors);
  }
  return errors;
}

export function addMissingRegressionGuardStub(text) {
  if (extractSectionBody(text, GUARD_SECTION) !== null) return { text, changed: false };
  const lines = text.trimEnd().split(/\r?\n/);
  const validationIndex = lines.findIndex((line) => line.trim() === "## Validation");
  if (validationIndex === -1) {
    return { text: `${text.trimEnd()}\n\n${REGRESSION_GUARD_STUB}`, changed: true };
  }
  const nextHeadingOffset = lines.slice(validationIndex + 1).findIndex((line) => /^##\s+/.test(line));
  const insertionIndex = nextHeadingOffset === -1 ? lines.length : validationIndex + 1 + nextHeadingOffset;
  lines.splice(insertionIndex, 0, "", ...REGRESSION_GUARD_STUB.trimEnd().split("\n"));
  return { text: `${lines.join("\n").trimEnd()}\n`, changed: true };
}

export function inspectRegressionGuardFile(planFile, options = {}) {
  const resolved = validatePlanPath(planFile);
  let text;
  try {
    text = fs.readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`Cannot read task plan ${path.relative(ROOT, resolved)}: ${error.message}`);
  }
  return {
    file: resolved,
    text,
    errors: validateRegressionGuardText(text, path.relative(ROOT, resolved), options),
  };
}