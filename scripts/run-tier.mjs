#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTierRegistry, TIER_REGISTRY_LABEL } from "./lib/tier-lock-check.mjs";

export const TIMEOUT_GRACE_MS = 250;

function terminateProcessGroup(pid, signal) {
  if (pid === undefined) return;
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.once("end", () => resolve(input));
    process.stdin.once("error", reject);
  });
}

async function superviseTier({ command, timeoutMs }) {
  const child = spawn(`exec ${command}`, {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    detached: true,
    stdio: "inherit",
  });
  let timedOut = false;
  let forceKillTimer;
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    terminateProcessGroup(child.pid, "SIGTERM");
    forceKillTimer = setTimeout(() => {
      terminateProcessGroup(child.pid, "SIGKILL");
    }, TIMEOUT_GRACE_MS);
  }, timeoutMs);

  return new Promise((resolve) => {
    const finish = (status) => {
      clearTimeout(timeoutTimer);
      clearTimeout(forceKillTimer);
      resolve(timedOut ? 124 : status);
    };
    child.once("error", () => finish(1));
    child.once("close", (code, signal) => {
      if (timedOut) {
        finish(124);
        return;
      }
      finish(code ?? (signal ? 1 : 0));
    });
  });
}

export function runTier(tierName, { env = process.env, tier: lockedTier } = {}) {
  const tier = lockedTier || loadTierRegistry().get(tierName);
  if (!tier) {
    throw new Error(`Validation-tier registry ${TIER_REGISTRY_LABEL} does not define requested tier "${tierName}"; check the registered tiers in ${TIER_REGISTRY_LABEL}.`);
  }
  console.log(`[VALIDATION] Running tier "${tierName}"`);
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--supervise"], {
    cwd: process.cwd(),
    env: { ...env },
    input: JSON.stringify({ command: tier.command, timeoutMs: tier.timeoutMs }),
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.error?.code === "ETIMEDOUT") {
    console.error(`[VALIDATION] Tier "${tierName}" exceeded its ${tier.timeoutMs}ms timeout and was terminated. Repair the stalled validation or its environment, then rerun the same locked tier; do not substitute another command.`);
    return 124;
  }
  if (result.error) throw result.error;
  if (result.status === 124) {
    console.error(`[VALIDATION] Tier "${tierName}" exceeded its ${tier.timeoutMs}ms timeout and was terminated. Repair the stalled validation or its environment, then rerun the same locked tier; do not substitute another command.`);
  }
  return result.status ?? 1;
}

if (process.argv.includes("--supervise")) {
  try {
    const { command, timeoutMs } = JSON.parse(await readStdin());
    process.exit(await superviseTier({ command, timeoutMs }));
  } catch (error) {
    console.error(`[VALIDATION] Supervisor failed: ${error.message}`);
    process.exit(1);
  }
} else if (fileURLToPath(import.meta.url) === process.argv[1]) {
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