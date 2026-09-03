#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tier-lock-check.mjs";
import { addMissingStubs, inspectPlanFile } from "./lib/failure-gate.mjs";

const args = process.argv.slice(2);
const fixStub = args.includes("--fix-stub");
const stubsOnly = args.includes("--stubs-only");
const archive = args.includes("--archive");
const planOptionIndex = args.indexOf("--plan");
const explicitPlan = planOptionIndex === -1 ? null : args[planOptionIndex + 1];
const planFile = explicitPlan || (planOptionIndex === -1 ? process.env.TASK_PLAN_FILE : null);

function filesToCheck() {
  if (planFile) return [planFile];
  if (archive) {
    const archiveDir = path.join(ROOT, ".local/tasks");
    return fs.existsSync(archiveDir)
      ? fs.readdirSync(archiveDir).filter((name) => name.endsWith(".md")).map((name) => path.join(archiveDir, name))
      : [];
  }
  return [];
}

const files = filesToCheck();
if (files.length === 0) {
  if (planOptionIndex !== -1 && !explicitPlan) {
    console.error("[FAILURE-GATE] --plan requires a plan file.");
    process.exit(2);
  }
  if (archive) {
    console.log("[FAILURE-GATE] No task plans found in the local archive.");
    process.exit(0);
  }
  console.log("[FAILURE-GATE] No TASK_PLAN_FILE set; skipping task-plan lint in ad-hoc mode.");
  process.exit(0);
}

let failed = false;
for (const file of files) {
  let current;
  try {
    current = inspectPlanFile(file);
  } catch (error) {
    console.error(`[FAILURE-GATE] ${error.message}`);
    failed = true;
    continue;
  }
  if (fixStub || stubsOnly) {
    const fixed = addMissingStubs(current.text);
    if (fixed.changed) {
      fs.writeFileSync(current.file, fixed.text);
      console.log(`[FAILURE-GATE] Added missing plan structure to ${path.relative(ROOT, current.file)}.`);
      current = inspectPlanFile(file);
    }
  }
  if (stubsOnly) continue;
  if (current.errors.length) {
    failed = true;
    console.error(`[FAILURE-GATE] ${path.relative(ROOT, current.file)} is not compliant:`);
    for (const error of current.errors) console.error(`  - ${error}`);
  } else {
    console.log(`[FAILURE-GATE] ${path.relative(ROOT, current.file)} passed strict plan validation.`);
  }
}
process.exit(failed ? 1 : 0);