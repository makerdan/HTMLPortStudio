#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTierRegistry, TIER_REGISTRY_LABEL } from "./lib/tier-lock-check.mjs";

export function runTier(tierName, { env = process.env, tier: lockedTier } = {}) {
  const tier = lockedTier || loadTierRegistry().get(tierName);
  if (!tier) {
    throw new Error(`Validation-tier registry ${TIER_REGISTRY_LABEL} does not define requested tier "${tierName}"; check the registered tiers in ${TIER_REGISTRY_LABEL}.`);
  }
  console.log(`[VALIDATION] Running tier "${tierName}": ${tier.command}`);
  const result = spawnSync(`exec ${tier.command}`, {
    cwd: process.cwd(),
    env,
    shell: true,
    stdio: "inherit",
    timeout: tier.timeoutMs,
  });
  if (result.error?.code === "ETIMEDOUT") {
    console.error(`[VALIDATION] Tier "${tierName}" exceeded its ${tier.timeoutMs}ms timeout and was terminated. Repair the stalled validation or its environment, then rerun the same locked tier; do not substitute another command.`);
    return 124;
  }
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const tierName = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!tierName) {
    console.error("Usage: node scripts/run-tier.mjs <tier-name>");
    process.exit(2);
  }
  try {
    process.exit(runTier(tierName));
  } catch (error) {
    console.error(`[VALIDATION] ${error.message}`);
    process.exit(1);
  }
}