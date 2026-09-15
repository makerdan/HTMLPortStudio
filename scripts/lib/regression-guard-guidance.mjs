const REGRESSION_GUARD_EXAMPLES = Object.freeze([
  Object.freeze({
    label: "Concrete guard",
    lines: Object.freeze([
      'node scripts/new-plan.mjs --guard-covers "A concrete scenario or invariant." \\',
      '  --guard-test-location "path/to/recurrence.test.mjs" \\',
      '  --guard-checks "The assertion that fails if the old behavior returns."',
    ]),
  }),
  Object.freeze({
    label: "N/A guard",
    lines: Object.freeze([
      'node scripts/new-plan.mjs --guard-na-reason "The failure is a race condition requiring real timing: genuine wall-clock concurrency cannot be faithfully reproduced with fake timers."',
    ]),
  }),
  Object.freeze({
    label: "Self-satisfying guard",
    lines: Object.freeze([
      'node scripts/new-plan.mjs --guard-self-satisfying "the Regression Guard checker and focused recurrence test"',
    ]),
  }),
]);

const REGRESSION_GUARD_POLICY = Object.freeze([
  "Regression Guard is an additive plan contract enforced by `scripts/check-regression-guard.mjs`.",
  "When a task fixes or materially changes existing behavior, the plan must classify the change and name the concrete recurrence test, or use one of the documented N/A reasons.",
  "The guard section follows the plan's baseline and validation sections and does not change the selected validation tier. The validation entry point scopes both guards to `TASK_PLAN_FILE`, remediates missing stubs, then runs both strict checks.",
  "The permitted exceptions are: a race condition requiring real timing, an unmockable external API behavior, a visual regression with no screenshot infrastructure, or a fix that removes the feature entirely.",
  "A guard-writing task may instead declare `**Self-satisfying**` and identify its guard or test deliverable.",
  "Placeholder, vague, wrong-layer, and misplaced declarations fail strict validation. Regression Guard never replaces Failure Gate or raises the plan's validation ceiling.",
]);

export const REGRESSION_GUARD_GUIDANCE_START =
  "<!-- BEGIN GENERATED REGRESSION GUARD EXAMPLES -->";
export const REGRESSION_GUARD_GUIDANCE_END =
  "<!-- END GENERATED REGRESSION GUARD EXAMPLES -->";
export const REGRESSION_GUARD_POLICY_START =
  "<!-- BEGIN GENERATED REGRESSION GUARD POLICY -->";
export const REGRESSION_GUARD_POLICY_END =
  "<!-- END GENERATED REGRESSION GUARD POLICY -->";

export function renderPlannerGuardExamples() {
  return REGRESSION_GUARD_EXAMPLES.map(({ label, lines }) =>
    [`  ${label}:`, ...lines.map((line) => `    ${line}`)].join("\n"),
  ).join("\n\n");
}

export function renderPlannerGuardPolicy() {
  return REGRESSION_GUARD_POLICY.join("\n");
}

export function renderDocumentationGuardExamples() {
  return [
    REGRESSION_GUARD_GUIDANCE_START,
    "```sh",
    REGRESSION_GUARD_EXAMPLES.map(({ label, lines }) =>
      [`# ${label}`, ...lines].join("\n"),
    ).join("\n\n"),
    "```",
    REGRESSION_GUARD_GUIDANCE_END,
  ].join("\n");
}

export function renderDocumentationGuardPolicy() {
  return [
    REGRESSION_GUARD_POLICY_START,
    ...REGRESSION_GUARD_POLICY,
    REGRESSION_GUARD_POLICY_END,
  ].join("\n");
}
