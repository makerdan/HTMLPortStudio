import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const TIER_REGISTRY_FILE = path.join(ROOT, "docs/validation/validation-tiers.json");

export function loadTierRegistry() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(TIER_REGISTRY_FILE, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read validation-tier registry ${path.relative(ROOT, TIER_REGISTRY_FILE)}: ${error.message}`);
  }
  if (!Array.isArray(parsed?.tiers) || parsed.tiers.length === 0) {
    throw new Error("Validation-tier registry must contain at least one tier.");
  }
  const tiers = new Map();
  for (const tier of parsed.tiers) {
    if (!tier || typeof tier.name !== "string" || !tier.name.trim() ||
        typeof tier.command !== "string" || !tier.command.trim() ||
        tiers.has(tier.name)) {
      throw new Error("Validation-tier registry contains an invalid or duplicate tier.");
    }
    tiers.set(tier.name, tier);
  }
  return tiers;
}

export function resolvePlanFile(planFile) {
  const value = planFile || process.env.TASK_PLAN_FILE;
  if (!value) return null;
  return path.resolve(ROOT, value);
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
  const resolved = resolvePlanFile(planFile);
  if (!resolved) throw new Error("TASK_PLAN_FILE is required for a task-driven tier lock.");
  let text;
  try {
    text = fs.readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`Cannot read task plan ${path.relative(ROOT, resolved)}: ${error.message}`);
  }
  const tierName = extractValidationCommand(text);
  if (!tierName) {
    throw new Error(`TIER-LOCK VIOLATION: ${path.relative(ROOT, resolved)} has no parseable Validation command.`);
  }
  const tiers = loadTierRegistry();
  const tier = tiers.get(tierName);
  if (!tier) {
    throw new Error(`TIER-LOCK VIOLATION: unknown validation tier "${tierName}".`);
  }
  return { planFile: resolved, planText: text, tierName, tier };
}