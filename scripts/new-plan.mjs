#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadTierRegistry } from "./lib/tier-lock-check.mjs";
import { validatePlanText } from "./lib/failure-gate.mjs";

const args = process.argv.slice(2);
function option(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}
function many(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}
function fail(message) {
  console.error(`[PLAN-SCAFFOLD] ${message}`);
  process.exit(1);
}
function realText(value, label) {
  if (!value?.trim() || /(?:<[^>]+>|\b(?:TODO|TBD|FIXME|REQUIRED)\b|\.\.\.)/i.test(value)) {
    fail(`${label} must be a real, non-placeholder value.`);
  }
  return value.trim();
}
function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const title = realText(option("--title"), "--title");
const why = realText(option("--why"), "--why");
const slug = slugify(option("--slug", title));
if (!slug) fail("Unable to derive a plan filename; provide --slug.");
const tierName = option("--validation-tier", "test-standard");
const tiers = loadTierRegistry();
const tier = tiers.get(tierName);
if (!tier) fail(`Unknown validation tier "${tierName}".`);

const baselineIds = many("--baseline-id");
const ownedIds = many("--owned-baseline-id");
if (new Set([...baselineIds, ...ownedIds]).size !== baselineIds.length + ownedIds.length) {
  fail("A baseline ID may be declared only once.");
}
const baselineLines = [...baselineIds.map((id) => `- **Ignored baseline:** \`${realText(id, "--baseline-id")}\` — match the exact recorded suite, test, and signature.`),
  ...ownedIds.map((id) => `- **Owned baseline repair:** \`${realText(id, "--owned-baseline-id")}\` — this task owns repair of the exact recorded suite, test, and signature.`)];
const preExisting = many("--pre-existing");
const observations = many("--environment-observation");
const output = path.resolve(ROOT, option("--output", path.join(".local/tasks", `${slug}.md`)));
if (fs.existsSync(output)) fail(`Plan already exists: ${path.relative(ROOT, output)}.`);

const baseline = baselineLines.length
  ? baselineLines.join("\n")
  : "None known at plan time. Treat every failure as a potential regression.";
const plan = `# ${title}

## What & Why
${why}

## Done looks like
- The planned behavior is implemented and verified.

## Pre-existing failures to ignore
${baseline}

**Flaky-test rule:** A passing retry establishes intermittency, not pre-existing provenance. For an unlisted failure, retry it three times in isolation and require two-factor provenance before assigning ownership.
${preExisting.length ? `\n**Task-local evidence:** ${preExisting.join(" ")}` : ""}
${observations.length ? `\n## Task-local environment observations\n${observations.map((entry) => `- ${entry}`).join("\n")}` : ""}

## Validation
**Command:** \`${tierName}\`
**Why:** ${why}
**Do not escalate:** Run exactly this command. Pre-existing, intermittent, or environment-limited failures are not a reason to run a heavier tier.
`;
const errors = validatePlanText(plan, path.relative(ROOT, output));
if (errors.length) fail(errors.join("\n"));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${plan.trimEnd()}\n`);
console.log(`[PLAN-SCAFFOLD] Created ${path.relative(ROOT, output)} using tier "${tierName}".`);