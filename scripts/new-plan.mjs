#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadTierRegistry } from "./lib/tier-lock-check.mjs";
import { validatePlanText } from "./lib/failure-gate.mjs";
import { validateRegressionGuardText } from "./lib/regression-guard.mjs";

const args = process.argv.slice(2);
const GUARD_HELP = `Usage:
  node scripts/new-plan.mjs --title "<title>" --why "<why>" <guard decision> [options]

Regression Guard decision (provide exactly one):

  Concrete guard:
    --guard-covers "A concrete scenario or invariant."
    --guard-test-location "path/to/recurrence.test.mjs"
    --guard-checks "The assertion that fails if the old behavior returns."

  N/A guard:
    --guard-na-reason "The failure is a race condition requiring real timing: genuine wall-clock concurrency cannot be faithfully reproduced with fake timers."

  Self-satisfying guard:
    --guard-self-satisfying "the Regression Guard checker and focused recurrence test"

Use --help or -h to print this guidance.`;

if (args.includes("--help") || args.includes("-h")) {
  console.log(GUARD_HELP);
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
function fail(message) {
  console.error(`[PLAN-SCAFFOLD] ${message}`);
  process.exit(1);
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
    fail(`${label} must be a real, non-placeholder value.`);
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
const slug = slugify(option("--slug", title));
if (!slug) fail("Unable to derive a plan filename; provide --slug.");

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

${regressionGuard}`;
const errors = [
  ...validatePlanText(plan, path.relative(ROOT, output)),
  ...validateRegressionGuardText(plan, path.relative(ROOT, output)),
];
if (errors.length) fail(errors.join("\n"));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${plan.trimEnd()}\n`);
console.log(`[PLAN-SCAFFOLD] Created ${path.relative(ROOT, output)} using tier "${tierName}".`);