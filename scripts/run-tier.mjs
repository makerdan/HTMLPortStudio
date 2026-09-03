#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTierRegistry } from "./lib/tier-lock-check.mjs";

export function runTier(tierName, { env = process.env } = {}) {
  const tier = loadTierRegistry().get(tierName);
  if (!tier) throw new Error(`Unknown validation tier "${tierName}".`);
  console.log(`[VALIDATION] Running tier "${tierName}": ${tier.command}`);
  const result = spawnSync(tier.command, { cwd: process.cwd(), env, shell: true, stdio: "inherit" });
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