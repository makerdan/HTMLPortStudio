import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const TIER_REGISTRY_FILE = path.join(ROOT, "docs/validation/validation-tiers.json");
export const TIER_REGISTRY_LABEL = path.relative(ROOT, TIER_REGISTRY_FILE);

function registryFile() {
  return process.env.VALIDATION_TIER_REGISTRY_FILE
    ? path.resolve(ROOT, process.env.VALIDATION_TIER_REGISTRY_FILE)
    : TIER_REGISTRY_FILE;
}

export function loadTierRegistry(registryPath) {
  const file = registryPath ? path.resolve(registryPath) : registryFile();
  const label = path.relative(ROOT, file) || file;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read validation-tier registry ${label}: ${error.message}`);
  }
  if (!Object.hasOwn(parsed ?? {}, "tiers")) {
    throw new Error(`Validation-tier registry ${label} is missing tier data: expected a "tiers" array.`);
  }
  if (!Array.isArray(parsed.tiers)) {
    throw new Error(`Validation-tier registry ${label} has malformed tier data: expected "tiers" to be an array.`);
  }
  if (parsed.tiers.length === 0) {
    throw new Error(`Validation-tier registry ${label} has an empty tier registry: "tiers" must contain at least one tier.`);
  }
  const tiers = new Map();
  const tierIndexes = new Map();
  for (const [index, tier] of parsed.tiers.entries()) {
    if (!tier || typeof tier !== "object" || Array.isArray(tier)) {
      throw new Error(`Validation-tier registry ${label} has malformed tier at index ${index}: expected an object with non-empty string "name" and "command".`);
    }
    if (typeof tier.name !== "string" || !tier.name.trim()) {
      throw new Error(`Validation-tier registry ${label} has malformed tier at index ${index}: tier name must be a non-empty string.`);
    }
    if (typeof tier.command !== "string" || !tier.command.trim()) {
      throw new Error(`Validation-tier registry ${label} has malformed tier at index ${index}: tier command must be a non-empty string.`);
    }
    if (tiers.has(tier.name)) {
      throw new Error(`Validation-tier registry ${label} has duplicate tier name "${tier.name}" at index ${index}; already declared at index ${tierIndexes.get(tier.name)}.`);
    }
    if (!Number.isSafeInteger(tier.timeoutMs) || tier.timeoutMs <= 0) {
      throw new Error(`Validation-tier registry ${label} has malformed tier at index ${index}: tier timeoutMs must be a positive safe integer.`);
    }
    tiers.set(tier.name, tier);
    tierIndexes.set(tier.name, index);
  }
  return tiers;
}

export function resolvePlanFile(planFile) {
  const value = planFile || process.env.TASK_PLAN_FILE;
  if (!value) return null;
  return path.resolve(ROOT, value);
}

export function validatePlanPath(planFile) {
  const resolved = resolvePlanFile(planFile);
  if (!resolved) throw new Error("TASK_PLAN_FILE is not set; ad-hoc validation has no plan to lint.");
  if (!resolved.endsWith(".md")) {
    throw new Error(`Task plan path must end in .md: ${path.relative(ROOT, resolved) || resolved}.`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Task plan does not exist: ${path.relative(ROOT, resolved) || resolved}.`);
  }
  return resolved;
}

export function extractSectionBody(planText, heading) {
  const lines = planText.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (headingIndex === -1) return null;
  const nextHeading = lines.slice(headingIndex + 1).findIndex((line) => /^##\s+/.test(line));
  const end = nextHeading === -1 ? lines.length : headingIndex + 1 + nextHeading;
  return lines.slice(headingIndex + 1, end).join("\n").trim();
}

export function extractValidationCommand(planText) {
  const body = extractSectionBody(planText, "Validation");
  if (body === null) return null;
  const command = body.match(/^\*\*Command:\*\*\s*(?:`([^`]+)`|(.+?))\s*$/m);
  return command?.[1]?.trim() || command?.[2]?.trim() || null;
}

export function readPlanTier(planFile) {
  const explicitPlan = typeof planFile === "string" && planFile.trim().length > 0;
  const sourceLabel = explicitPlan ? "explicit plan argument" : "TASK_PLAN_FILE";
  const requestedPlan = explicitPlan ? planFile : process.env.TASK_PLAN_FILE;
  if (!requestedPlan) {
    throw new Error("TIER-LOCK VIOLATION: TASK_PLAN_FILE is not set and no explicit plan argument was provided; pass a readable .md task plan path explicitly or set TASK_PLAN_FILE before validation.");
  }
  const resolved = path.resolve(ROOT, requestedPlan);
  const planLabel = path.relative(ROOT, resolved);
  let text;
  try {
    text = fs.readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`TIER-LOCK VIOLATION: Cannot read task plan ${planLabel} (exact path: ${resolved}; source: ${sourceLabel}): ${error.message}. Repair the ${sourceLabel} value to point to a readable .md task plan before validation.`);
  }
  const tierName = extractValidationCommand(text);
  if (!tierName) {
    throw new Error(`TIER-LOCK VIOLATION: ${planLabel} has no parseable Validation **Command:**; provide one registered validation tier name.`);
  }
  let tiers;
  try {
    tiers = loadTierRegistry();
  } catch (error) {
    throw new Error(`TIER-LOCK VIOLATION: ${planLabel} requests validation tier "${tierName}" via Validation **Command:**, but the validation-tier registry is invalid: ${error.message}`);
  }
  const tier = tiers.get(tierName);
  if (!tier) {
    throw new Error(`TIER-LOCK VIOLATION: ${planLabel} requests unknown validation tier "${tierName}" via Validation **Command:**; check the registered tiers in ${TIER_REGISTRY_LABEL}.`);
  }
  return { planFile: resolved, planText: text, tierName, tier };
}