#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  REGRESSION_GUARD_GUIDANCE_END,
  REGRESSION_GUARD_GUIDANCE_START,
  renderDocumentationGuardExamples,
} from "./lib/regression-guard-guidance.mjs";
import { ROOT } from "./lib/tier-lock-check.mjs";

const files = [".agents/skills/failure-gate/SKILL.md", "replit.md"];
const generatedBlockPattern = new RegExp(
  `${REGRESSION_GUARD_GUIDANCE_START}[\\s\\S]*?${REGRESSION_GUARD_GUIDANCE_END}`,
);

let changed = false;
for (const relativeFile of files) {
  const file = path.join(ROOT, relativeFile);
  const text = fs.readFileSync(file, "utf8");
  const matches =
    text.match(
      new RegExp(
        `${REGRESSION_GUARD_GUIDANCE_START}[\\s\\S]*?${REGRESSION_GUARD_GUIDANCE_END}`,
        "g",
      ),
    ) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `[REGRESSION-GUARD-DOCS] ${relativeFile} must contain exactly one generated guidance block. ` +
        `Add the markers before running this updater.`,
    );
  }
  const next = text.replace(
    generatedBlockPattern,
    renderDocumentationGuardExamples(),
  );
  if (next !== text) {
    fs.writeFileSync(file, next);
    changed = true;
  }
}

console.log(
  changed
    ? "[REGRESSION-GUARD-DOCS] Updated generated guidance."
    : "[REGRESSION-GUARD-DOCS] Generated guidance is current.",
);
