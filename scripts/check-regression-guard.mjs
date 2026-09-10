#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/tier-lock-check.mjs";
import {
  addMissingRegressionGuardStub,
  classifyRegressionGuardInspection,
  inspectRegressionGuardFile,
} from "./lib/regression-guard.mjs";

const args = process.argv.slice(2);
const fixStub = args.includes("--fix-stub");
const stubsOnly = args.includes("--stubs-only");
const archive = args.includes("--archive");
const planOptionIndex = args.indexOf("--plan");
const explicitPlan = planOptionIndex === -1 ? null : args[planOptionIndex + 1];
const planFile = archive ? null : explicitPlan || (planOptionIndex === -1 ? process.env.TASK_PLAN_FILE : null);

if (archive && (explicitPlan || fixStub || stubsOnly)) {
  console.error("[REGRESSION-GUARD] --archive is a read-only historical report and cannot be combined with --plan, --fix-stub, or --stubs-only.");
  process.exit(2);
}

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
    console.error("[REGRESSION-GUARD] --plan requires a plan file.");
    process.exit(2);
  }
  if (archive) {
    console.log("[REGRESSION-GUARD] HISTORICAL ARCHIVE REPORT (read-only)");
    console.log("[REGRESSION-GUARD] No task plans found in the local archive; no files were modified.");
    process.exit(0);
  }
  console.log("[REGRESSION-GUARD] No TASK_PLAN_FILE set; skipping task-plan lint in ad-hoc mode.");
  process.exit(0);
}

if (archive) {
  console.log("[REGRESSION-GUARD] HISTORICAL ARCHIVE REPORT (read-only)");
  console.log("[REGRESSION-GUARD] Findings describe archived plans only; they are not current-task validation failures.");
  let findings = 0;
  for (const file of files) {
    try {
      const inspection = inspectRegressionGuardFile(file);
      const classified = classifyRegressionGuardInspection(inspection);
      if (!classified.categories.length) continue;
      findings += 1;
      console.log(`[REGRESSION-GUARD] HISTORICAL ${path.relative(ROOT, file)} — ${classified.categories.join(", ")}`);
      for (const error of classified.errors) console.log(`  - ${error}`);
    } catch (error) {
      findings += 1;
      console.log(`[REGRESSION-GUARD] HISTORICAL ${path.relative(ROOT, file)} — malformed`);
      console.log(`  - ${error.message}`);
    }
  }
  console.log(`[REGRESSION-GUARD] Historical archive report complete: ${findings} plan(s) with findings; no files were modified.`);
  process.exit(0);
}

let failed = false;
for (const file of files) {
  let current;
  try {
    current = inspectRegressionGuardFile(file, { requireSection: !stubsOnly, placeholdersOnly: stubsOnly });
  } catch (error) {
    console.error(`[REGRESSION-GUARD] ${error.message}`);
    failed = true;
    continue;
  }

  if (fixStub || stubsOnly) {
    const fixed = addMissingRegressionGuardStub(current.text);
    if (fixed.changed) {
      fs.writeFileSync(current.file, fixed.text);
      console.log(`[REGRESSION-GUARD] Added missing plan structure to ${path.relative(ROOT, current.file)}.`);
    }
  }

  // --fix-stub is intentionally remediation-only. The validation pipeline
  // follows it with strict mode so a human decision is still required.
  if (fixStub || stubsOnly) continue;
  current = inspectRegressionGuardFile(file);
  if (current.errors.length) {
    failed = true;
    console.error(`[REGRESSION-GUARD] ${path.relative(ROOT, current.file)} is not compliant:`);
    for (const error of current.errors) console.error(`  - ${error}`);
  } else {
    console.log(`[REGRESSION-GUARD] ${path.relative(ROOT, current.file)} passed strict plan validation.`);
  }
}
process.exit(failed ? 1 : 0);