#!/usr/bin/env node
import { runTier } from "./run-tier.mjs";
import { readPlanTier, resolvePlanFile } from "./lib/tier-lock-check.mjs";
import { inspectPlanFile } from "./lib/failure-gate.mjs";

const args = process.argv.slice(2);
const allowNoPlan = args.includes("--allow-no-plan");
const tierOptionIndex = args.indexOf("--tier");
const suppliedPlan = args.find((arg, index) =>
  !arg.startsWith("--") && (tierOptionIndex === -1 || index !== tierOptionIndex + 1));

try {
  if (allowNoPlan && !suppliedPlan && !process.env.TASK_PLAN_FILE) {
    const tierName = tierOptionIndex === -1 ? null : args[tierOptionIndex + 1];
    if (!tierName) throw new Error("--allow-no-plan requires --tier <registered-tier> for an ad-hoc run.");
    console.warn("[TIER-LOCK] Ad-hoc run explicitly allowed without TASK_PLAN_FILE.");
    process.exit(runTier(tierName, { env: { ...process.env } }));
  }
  const plan = readPlanTier(suppliedPlan || resolvePlanFile());
  const lint = inspectPlanFile(plan.planFile);
  if (lint.errors.length) {
    throw new Error(`Plan failed strict Failure Gate lint:\n${lint.errors.map((error) => `- ${error}`).join("\n")}`);
  }
  const env = { ...process.env, TASK_PLAN_FILE: plan.planFile };
  process.exit(runTier(plan.tierName, { env }));
} catch (error) {
  const message = error.message.startsWith("TIER-LOCK VIOLATION:")
    ? error.message
    : `[TIER-LOCK VIOLATION] ${error.message}`;
  console.error(message);
  process.exit(1);
}