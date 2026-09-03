import fs from "node:fs";
import path from "node:path";
import { ROOT, extractSectionBody, loadTierRegistry, resolvePlanFile } from "./tier-lock-check.mjs";

const BASELINE_FILE = path.join(ROOT, "docs/validation/failure-baseline.json");
const REQUIRED_SECTIONS = ["Pre-existing failures to ignore", "Validation"];
const PLACEHOLDER = /(?:<[^>]+>|\b(?:TODO|TBD|FIXME|REQUIRED)\b|\[(?:fill|choose|reason|command)[^\]]*\]|\.\.\.)/i;

export const BASELINE_STUB = `## Pre-existing failures to ignore
None known at plan time. Treat every failure as a potential regression.

**Flaky-test rule:** A passing retry establishes intermittency, not pre-existing provenance. Use the execution evidence rules before assigning ownership.
`;

export const VALIDATION_STUB = `## Validation
**Command:** \`test-standard\`
**Why:** REQUIRED: explain why this registered tier covers the task.
**Do not escalate:** Run exactly this command. Pre-existing failures are not a reason to run a heavier tier.
`;

function sectionExists(text, heading) {
  return extractSectionBody(text, heading) !== null;
}

function loadBaselineCatalog() {
  try {
    const catalog = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
    return Array.isArray(catalog.records) ? catalog.records : [];
  } catch (error) {
    throw new Error(`Cannot read baseline catalog ${path.relative(ROOT, BASELINE_FILE)}: ${error.message}`);
  }
}

function checkBaselineReferences(text, errors) {
  const baseline = extractSectionBody(text, REQUIRED_SECTIONS[0]) || "";
  const references = [...baseline.matchAll(/^\s*-\s*\*\*(Ignored baseline|Owned baseline repair):\*\*\s*`([^`]+)`/gm)];
  const ownershipById = new Map();
  const catalog = loadBaselineCatalog();
  for (const [, ownership, id] of references) {
    if (ownershipById.has(id)) {
      errors.push(`baseline ${id} declares more than one ownership.`);
      continue;
    }
    ownershipById.set(id, ownership);
    const record = catalog.find((candidate) => candidate?.id === id);
    if (!record) {
      errors.push(`baseline ${id} is not present in the catalog.`);
      continue;
    }
    if (record.status !== "active") {
      errors.push(`baseline ${id} is not active (status: ${record.status || "missing"}).`);
    }
    if (!record.reviewDeadline || Number.isNaN(new Date(record.reviewDeadline).getTime())) {
      errors.push(`baseline ${id} has no valid review deadline.`);
    } else if (new Date(record.reviewDeadline).getTime() < Date.now()) {
      errors.push(`baseline ${id} has passed its review deadline.`);
    }
  }
}

export function validatePlanText(text, planFile = "task plan") {
  const errors = [];
  if (!text.trim()) errors.push(`${planFile} is empty.`);
  for (const heading of REQUIRED_SECTIONS) {
    if (!sectionExists(text, heading)) {
      errors.push(`${planFile} is missing "## ${heading}".`);
    } else if (!extractSectionBody(text, heading)) {
      errors.push(`${planFile} has an empty "## ${heading}" section.`);
    }
  }
  const validation = extractSectionBody(text, "Validation") || "";
  if (validation) {
    const commandMatch = validation.match(/^\*\*Command:\*\*\s*(?:`([^`]+)`|(.+?))\s*$/m);
    const command = commandMatch?.[1]?.trim() || commandMatch?.[2]?.trim();
    let tiers;
    try {
      tiers = loadTierRegistry();
    } catch (error) {
      errors.push(error.message);
      tiers = new Map();
    }
    if (!command) errors.push(`${planFile} Validation has no **Command:**.`);
    else if (!tiers.has(command)) errors.push(`${planFile} uses invalid validation tier "${command}".`);
    for (const field of ["Why", "Do not escalate"]) {
      const fieldMatch = validation.match(new RegExp(`^\\*\\*${field.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}:\\*\\*\\s*(.+?)\\s*$`, "mi"));
      if (!fieldMatch || PLACEHOLDER.test(fieldMatch[1])) {
        errors.push(`${planFile} Validation has a missing or placeholder **${field}:**.`);
      }
    }
  }
  if (sectionExists(text, REQUIRED_SECTIONS[0])) checkBaselineReferences(text, errors);
  return errors;
}

export function addMissingStubs(text) {
  let result = text.trimEnd();
  const additions = [];
  if (!sectionExists(result, REQUIRED_SECTIONS[0])) additions.push(BASELINE_STUB);
  if (!sectionExists(result, REQUIRED_SECTIONS[1])) additions.push(VALIDATION_STUB);
  if (additions.length) result += `\n\n${additions.join("\n")}\n`;
  return { text: result, changed: additions.length > 0 };
}

export function inspectPlanFile(planFile) {
  const resolved = resolvePlanFile(planFile);
  if (!resolved) throw new Error("TASK_PLAN_FILE is not set; ad-hoc validation has no plan to lint.");
  let text;
  try {
    text = fs.readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`Cannot read task plan ${path.relative(ROOT, resolved)}: ${error.message}`);
  }
  return { file: resolved, text, errors: validatePlanText(text, path.relative(ROOT, resolved)) };
}