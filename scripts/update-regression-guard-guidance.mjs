#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
export const updaterCommand =
  "node scripts/update-regression-guard-guidance.mjs";
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

function readFailureMessage(relativeFile, error) {
  const missing = error?.code === "ENOENT";
  const kind = missing ? "Missing" : "Unreadable";
  const sections = generatedBlocks.map(({ section }) => section).join(", ");
  const repair = missing
    ? "Restore the document"
    : "Restore access to the document";
  return (
    `[REGRESSION-GUARD-DOCS] ${kind} guidance document: ${relativeFile}. ` +
    `Affected Regression Guard guidance sections: ${sections}. ` +
    `${missing ? "This is a missing document, not stale generated content." : "This is an unreadable document, not stale generated content."} ` +
    `${repair}, then run ${updaterCommand}.`
  );
}

export function updateRegressionGuardGuidance({
  root = ROOT,
  guidanceFiles = files,
  checkOnly = false,
  readFile = fs.readFileSync,
  writeFile = fs.writeFileSync,
  reportError = console.error,
  reportOutput = console.log,
} = {}) {
  let changed = false;
  let failed = false;
  for (const relativeFile of guidanceFiles) {
    const file = path.isAbsolute(relativeFile)
      ? relativeFile
      : path.join(root, relativeFile);
    let text;
    try {
      text = readFile(file, "utf8");
    } catch (error) {
      failed = true;
      reportError(readFailureMessage(relativeFile, error));
      continue;
    }

    let next = text;
    for (const block of generatedBlocks) {
      const matches =
        text.match(blockPattern(block.start, block.end, "g")) ?? [];
      if (matches.length !== 1) {
        failed = true;
        reportError(
          `[REGRESSION-GUARD-DOCS] ${relativeFile} § ${block.section} must contain exactly one generated guidance block. ` +
            `Run ${updaterCommand} after restoring its markers.`,
        );
        continue;
      }
      const expected = block.render();
      if (matches[0] !== expected) {
        if (checkOnly) {
          failed = true;
          reportError(
            `[REGRESSION-GUARD-DOCS] ${relativeFile} § ${block.section} is stale or malformed. ` +
              `This is stale generated content, not a missing or unreadable document. ` +
              `Run ${updaterCommand}.`,
          );
        } else {
          next = next.replace(blockPattern(block.start, block.end), expected);
        }
      }
    }

    if (next !== text) {
      writeFile(file, next);
      changed = true;
    }
  }

  if (failed) return 1;
  if (checkOnly) {
    reportOutput(
      "[REGRESSION-GUARD-DOCS] Generated guidance is current (read-only).",
    );
  } else {
    reportOutput(
      changed
        ? "[REGRESSION-GUARD-DOCS] Updated generated guidance."
        : "[REGRESSION-GUARD-DOCS] Generated guidance is current.",
    );
  }
  return 0;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const guidanceFiles = process.argv
    .slice(2)
    .filter((argument) => argument !== "--check");
  process.exit(
    updateRegressionGuardGuidance({
      checkOnly: process.argv.includes("--check"),
      guidanceFiles: guidanceFiles.length > 0 ? guidanceFiles : files,
    }),
  );
}
