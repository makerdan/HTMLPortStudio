import fs from "node:fs";
import path from "node:path";
import { ROOT, extractSectionBody, loadTierRegistry, validatePlanPath } from "./tier-lock-check.mjs";

const SUPPORTED_BASELINE_VERSION = 1;
const REQUIRED_SECTIONS = ["Pre-existing failures to ignore", "Validation"];
const PLACEHOLDER = /(?:<[^>]+>|\b(?:TODO|TBD|FIXME|REQUIRED)\b|\[(?:fill|choose|reason|command)[^\]]*\]|\.\.\.)/i;
const BASELINE_STATUSES = new Set(["active", "needs-review", "intermittent", "environment-limited", "resolved"]);
const BASELINE_TEXT_FIELDS = ["suite", "test", "signature", "owner"];
const BASELINE_DATE_FIELDS = ["firstObserved", "lastVerified", "reviewDeadline"];

export const BASELINE_STUB = `## Pre-existing failures to ignore
None known at plan time. Treat every failure as a potential regression.

**Flaky-test rule:** A passing retry establishes intermittency, not pre-existing provenance. Use the execution evidence rules before assigning ownership.
`;

export const VALIDATION_STUB = `## Validation
**Command:** \`test-standard\`
**Why:** REQUIRED: explain why this registered tier covers the task.
**Do not escalate:** Run exactly this command. Pre-existing failures are not a reason to run a heavier tier.
`;

function baselineFile() {
  return process.env.FAILURE_BASELINE_FILE
    ? path.resolve(process.env.FAILURE_BASELINE_FILE)
    : path.join(ROOT, "docs/validation/failure-baseline.json");
}

function sectionExists(text, heading) {
  return extractSectionBody(text, heading) !== null;
}

export function loadBaselineCatalog() {
  const catalogFile = baselineFile();
  try {
    const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
    if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
      return {
        records: [],
        errors: [`baseline catalog ${path.relative(ROOT, catalogFile)} must be an object with version ${SUPPORTED_BASELINE_VERSION} and a records array.`],
      };
    }

    const errors = [];
    if (catalog.version !== SUPPORTED_BASELINE_VERSION) {
      const catalogPath = path.relative(ROOT, catalogFile);
      if (Object.hasOwn(catalog, "version")) {
        errors.push(`baseline catalog ${catalogPath} has unsupported version ${JSON.stringify(catalog.version)}; expected supported version ${SUPPORTED_BASELINE_VERSION}.`);
      } else {
        errors.push(`baseline catalog ${catalogPath} is missing its version; expected supported version ${SUPPORTED_BASELINE_VERSION}.`);
      }
    }
    if (!Array.isArray(catalog.records)) {
      errors.push(`baseline catalog ${path.relative(ROOT, catalogFile)} must contain a records array.`);
      return { records: [], errors };
    }

    const ids = new Map();
    for (const [index, record] of catalog.records.entries()) {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        errors.push(`baseline record at index ${index} is malformed.`);
        continue;
      }
      const id = typeof record.id === "string" ? record.id.trim() : "";
      if (!id) {
        errors.push(`baseline record at index ${index} is malformed: it has no ID.`);
        continue;
      }
      if (ids.has(id)) {
        errors.push(`baseline ${id} is duplicated in the catalog (records ${ids.get(id)} and ${index}).`);
      } else {
        ids.set(id, index);
      }
      if (typeof record.status !== "string" || !BASELINE_STATUSES.has(record.status)) {
        errors.push(`baseline ${id} has an invalid status.`);
      }
      for (const field of BASELINE_TEXT_FIELDS) {
        if (typeof record[field] !== "string" || !record[field].trim()) {
          errors.push(`baseline ${id} is malformed: it has no valid ${field}.`);
        }
      }
      for (const field of BASELINE_DATE_FIELDS) {
        if (!record[field] || Number.isNaN(new Date(record[field]).getTime())) {
          errors.push(`baseline ${id} is malformed: it has no valid ${field}.`);
        }
      }
    }
    return { records: catalog.records, errors };
  } catch (error) {
    throw new Error(`Cannot read baseline catalog ${path.relative(ROOT, catalogFile)}: ${error.message}`);
  }
}

function repairAction(id) {
  return `declare **Owned baseline repair:** \`${id}\` and repair the recorded failure`;
}

function checkBaselineReferences(text, errors) {
  const baseline = extractSectionBody(text, REQUIRED_SECTIONS[0]) || "";
  const references = [...baseline.matchAll(/^\s*-\s*\*\*(Ignored baseline|Owned baseline repair):\*\*\s*`([^`]+)`/gm)];
  const ownershipById = new Map();
  const { records: catalog, errors: catalogErrors } = loadBaselineCatalog();
  errors.push(...catalogErrors);
  for (const [, ownership, id] of references) {
    if (ownershipById.has(id)) {
      errors.push(`baseline ${id} declares more than one ownership; choose one repair action.`);
      continue;
    }
    ownershipById.set(id, ownership);
    const record = catalog.find((candidate) => candidate?.id === id);
    if (!record) {
      errors.push(`baseline ${id} is not present in the catalog; ${repairAction(id)}.`);
      continue;
    }
    if (ownership === "Owned baseline repair") continue;
    if (record.status !== "active") {
      errors.push(`baseline ${id} cannot authorize an ignored failure because it is not active (status: ${record.status || "missing"}); ${repairAction(id)}.`);
    } else if (new Date(record.reviewDeadline).getTime() < Date.now()) {
      errors.push(`baseline ${id} cannot authorize an ignored failure because its review deadline has passed; ${repairAction(id)}.`);
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
  const resolved = validatePlanPath(planFile);
  let text;
  try {
    text = fs.readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`Cannot read task plan ${path.relative(ROOT, resolved)}: ${error.message}`);
  }
  return { file: resolved, text, errors: validatePlanText(text, path.relative(ROOT, resolved)) };
}