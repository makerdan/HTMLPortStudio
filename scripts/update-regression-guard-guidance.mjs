#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REGRESSION_GUARD_GUIDANCE_END,
  REGRESSION_GUARD_POLICY_END,
  REGRESSION_GUARD_POLICY_START,
  REGRESSION_GUARD_GUIDANCE_START,
  renderDocumentationGuardExamples,
  renderDocumentationGuardPolicy,
} from "./lib/regression-guard-guidance.mjs";
import { ROOT } from "./lib/tier-lock-check.mjs";

const files = [".agents/skills/failure-gate/SKILL.md", "replit.md"];
const checkOnly = process.argv.includes("--check");
const updaterCommand = "node scripts/update-regression-guard-guidance.mjs";
const generatedBlocks = [
  {
    section: "Regression Guard policy",
    start: REGRESSION_GUARD_POLICY_START,
    end: REGRESSION_GUARD_POLICY_END,
    render: renderDocumentationGuardPolicy,
  },
  {
    section: "Regression Guard examples",
    start: REGRESSION_GUARD_GUIDANCE_START,
    end: REGRESSION_GUARD_GUIDANCE_END,
    render: renderDocumentationGuardExamples,
  },
];

function blockPattern(start, end, flags = "") {
  return new RegExp(`${start}[\\s\\S]*?${end}`, flags);
}

let changed = false;
let failed = false;
for (const relativeFile of files) {
  const file = path.join(ROOT, relativeFile);
  const text = fs.readFileSync(file, "utf8");
  let next = text;
  for (const block of generatedBlocks) {
    const matches = text.match(blockPattern(block.start, block.end, "g")) ?? [];
    if (matches.length !== 1) {
      failed = true;
      console.error(
        `[REGRESSION-GUARD-DOCS] ${relativeFile} § ${block.section} must contain exactly one generated guidance block. ` +
          `Run ${updaterCommand} after restoring its markers.`,
      );
      continue;
    }
    const expected = block.render();
    if (matches[0] !== expected) {
      if (checkOnly) {
        failed = true;
        console.error(
          `[REGRESSION-GUARD-DOCS] ${relativeFile} § ${block.section} is stale or malformed. ` +
            `Run ${updaterCommand}.`,
        );
      } else {
        next = next.replace(blockPattern(block.start, block.end), expected);
      }
    }
  }
  if (next !== text) {
    fs.writeFileSync(file, next);
    changed = true;
  }
}

if (failed) process.exit(1);
if (checkOnly) {
  console.log("[REGRESSION-GUARD-DOCS] Generated guidance is current (read-only).");
} else {
  console.log(
    changed
      ? "[REGRESSION-GUARD-DOCS] Updated generated guidance."
      : "[REGRESSION-GUARD-DOCS] Generated guidance is current.",
  );
}
