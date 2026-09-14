#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadTierRegistry } from "./lib/tier-lock-check.mjs";
import { validatePlanText } from "./lib/failure-gate.mjs";
import { validateRegressionGuardText } from "./lib/regression-guard.mjs";
import { renderPlannerGuardExamples } from "./lib/regression-guard-guidance.mjs";

const args = process.argv.slice(2);

function planHelp() {
  const tierNames = [...loadTierRegistry().keys()];
  return `Usage:
  node scripts/new-plan.mjs --title "<title>" --why "<why>" <guard decision> [non-guard options]

Required plan inputs:
  --title "<title>"              Short plan title.
  --why "<why>"                  Why the work is needed and what it should accomplish.

Non-guard options:
  --slug "<slug>"                Override the output filename slug derived from --title.
  --validation-tier "<tier>"     Select the registered validation tier for the plan.
                                  Defaults to test-standard. Available tiers include
                                  ${tierNames.join(", ")}.
  --baseline-id "<id>"           Record an active catalog baseline to ignore; repeat for multiple
                                  unrelated baselines. This does not lower the validation tier.
  --owned-baseline-id "<id>"     Record an active or repairable catalog baseline this task owns;
                                  repeat for multiple repairs.
  --pre-existing "<evidence>"    Add task-local evidence about a suspected pre-existing failure;
                                  repeat as needed. This is evidence, not permission to ignore a failure.
  --environment-observation "<observation>"
                                  Record a temporary harness or resource observation; repeat as needed.
                                  This does not weaken the execution gate.
  --output "<path>"              Write the plan to this path instead of .local/tasks/<slug>.md.

Examples:
  # Select a registered tier and document a known unrelated baseline.
  node scripts/new-plan.mjs --title "Refresh imports" --why "Keep imported content current." \\
    --validation-tier test-standard-plus --baseline-id BASE-ACTIVE \\
    --guard-self-satisfying "the Regression Guard checker and focused recurrence test" \\
    --output .local/tasks/refresh-imports.md

  # Record environment evidence without changing the selected validation tier.
  node scripts/new-plan.mjs --title "Fix browser startup" --why "Make browser checks reliable." \\
    --validation-tier test-standard --environment-observation "The headed browser is unavailable in this container." \\
    --guard-na-reason "The failure is a visual regression with no screenshot infrastructure."

Regression Guard decision (provide exactly one):

${renderPlannerGuardExamples()}

Use --help or -h to print this guidance.`;
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(planHelp());
  process.exit(0);
}

function option(name, fallback = undefined) {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
}
function many(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1] && !args[index + 1].startsWith("--")) values.push(args[index + 1]);
  }
  return values;
}
function missingValue(name) {
  return args.some((value, index) => value === name
    && (!args[index + 1] || args[index + 1].startsWith("--")));
}
function fail(message) {
  console.error(`[PLAN-SCAFFOLD] ${message}`);
  process.exit(1);
}
function helpHint(section = "the non-guard options and examples") {
  return ` Run \`node scripts/new-plan.mjs --help\` to review ${section}.`;
}
function guardHint(example) {
  return ` Run \`node scripts/new-plan.mjs --help\` to see ${example}.`;
}
function guardText(value, label, example) {
  if (!value?.trim() || /(?:<[^>]+>|\b(?:TODO|TBD|FIXME|REQUIRED)\b|\.\.\.)/i.test(value)) {
    fail(`${label} must be a real, non-placeholder value.${guardHint(example)}`);
  }
  return value.trim();
}
function realText(value, label) {
  if (!value?.trim() || /(?:<[^>]+>|\b(?:TODO|TBD|FIXME|REQUIRED)\b|\.\.\.)/i.test(value)) {
    fail(`${label} must be a real, non-placeholder value.${helpHint()}`);
  }
  return value.trim();
}
function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
function firstOption(names) {
  for (const name of names) {
    const value = option(name);
    if (value !== undefined) return { name, value };
  }
  return { name: names[0], value: undefined };
}
function hasOption(names) {
  return names.some((name) => args.includes(name));
}

const title = realText(option("--title"), "--title");
const why = realText(option("--why"), "--why");
for (const name of ["--slug", "--validation-tier", "--baseline-id", "--owned-baseline-id", "--pre-existing", "--environment-observation", "--output"]) {
  if (missingValue(name)) fail(`${name} requires a value.${helpHint()}`);
}
const slug = slugify(option("--slug", title));
if (!slug) fail(`Unable to derive a plan filename; provide --slug.${helpHint()}`);

const guardCovers = firstOption(["--guard-covers", "--regression-guard-covers"]);
const guardLocation = firstOption(["--guard-test-location", "--regression-guard-test-location"]);
const guardAssertion = firstOption(["--guard-checks", "--guard-assertion", "--guard-what-it-checks", "--regression-guard-checks", "--regression-guard-assertion"]);
const guardNaReason = firstOption(["--guard-na-reason", "--guard-na", "--regression-guard-na-reason"]);
const guardSelfSatisfying = firstOption(["--guard-self-satisfying", "--guard-self-satisfying-deliverable", "--regression-guard-self-satisfying"]);
const concreteGuardOptions = [
  ["--guard-covers", "--regression-guard-covers"],
  ["--guard-test-location", "--regression-guard-test-location"],
  ["--guard-checks", "--guard-assertion", "--guard-what-it-checks", "--regression-guard-checks", "--regression-guard-assertion"],
];
const concreteGuardPresent = concreteGuardOptions.some((names) => hasOption(names));
const naGuardPresent = hasOption(["--guard-na-reason", "--guard-na", "--regression-guard-na-reason"]);
const selfGuardPresent = hasOption(["--guard-self-satisfying", "--guard-self-satisfying-deliverable", "--regression-guard-self-satisfying"]);
const guardModes = [
  concreteGuardPresent,
  naGuardPresent,
  selfGuardPresent,
].filter(Boolean).length;
if (guardModes !== 1) {
  fail(`Provide exactly one Regression Guard decision: --guard-covers with --guard-test-location and --guard-checks, --guard-na-reason, or --guard-self-satisfying.${guardHint("the concrete, N/A, and self-satisfying examples")}`);
}

let regressionGuard;
if (concreteGuardPresent) {
  if (guardCovers.value === undefined || guardLocation.value === undefined || guardAssertion.value === undefined) {
    fail(`A concrete Regression Guard requires --guard-covers, --guard-test-location, and --guard-checks.${guardHint("the complete concrete guard example")}`);
  }
  regressionGuard = `## Regression Guard
**Covers:** ${guardText(guardCovers.value, guardCovers.name, "the complete concrete guard example")}
**Test location:** ${guardText(guardLocation.value, guardLocation.name, "the complete concrete guard example")}
**What it checks:** ${guardText(guardAssertion.value, guardAssertion.name, "the complete concrete guard example")}
`;
} else if (naGuardPresent) {
  regressionGuard = `## Regression Guard
**N/A**
**Why N/A:** ${guardText(guardNaReason.value, guardNaReason.name, "the N/A guard example")}
`;
} else if (selfGuardPresent) {
  regressionGuard = `## Regression Guard
**Self-satisfying** — this task's deliverable is ${guardText(guardSelfSatisfying.value, guardSelfSatisfying.name, "the self-satisfying guard example")}.
`;
}

const tierName = option("--validation-tier", "test-standard");
const tiers = loadTierRegistry();
const tier = tiers.get(tierName);
if (!tier) fail(`Unknown validation tier "${tierName}".${helpHint("the validation-tier option and registered tier examples")}`);

const baselineIds = many("--baseline-id");
const ownedIds = many("--owned-baseline-id");
if (new Set([...baselineIds, ...ownedIds]).size !== baselineIds.length + ownedIds.length) {
  fail(`A baseline ID may be declared only once.${helpHint("the baseline and evidence options")}`);
}
const baselineLines = [...baselineIds.map((id) => `- **Ignored baseline:** \`${realText(id, "--baseline-id")}\` — match the exact recorded suite, test, and signature.`),
  ...ownedIds.map((id) => `- **Owned baseline repair:** \`${realText(id, "--owned-baseline-id")}\` — this task owns repair of the exact recorded suite, test, and signature.`)];
const preExisting = many("--pre-existing").map((entry) => realText(entry, "--pre-existing"));
const observations = many("--environment-observation").map((entry) => realText(entry, "--environment-observation"));
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

${regressionGuard}`;
const planErrors = validatePlanText(plan, path.relative(ROOT, output));
if (planErrors.length) fail(`${planErrors.join("\n")}${helpHint("the non-guard options and examples")}`);
const guardErrors = validateRegressionGuardText(plan, path.relative(ROOT, output));
if (guardErrors.length) fail(`${guardErrors.join("\n")}${guardHint("the guard examples")}`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${plan.trimEnd()}\n`);
console.log(`[PLAN-SCAFFOLD] Created ${path.relative(ROOT, output)} using tier "${tierName}".`);