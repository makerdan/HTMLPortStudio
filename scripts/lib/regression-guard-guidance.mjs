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

export const REGRESSION_GUARD_GUIDANCE_START =
  "<!-- BEGIN GENERATED REGRESSION GUARD EXAMPLES -->";
export const REGRESSION_GUARD_GUIDANCE_END =
  "<!-- END GENERATED REGRESSION GUARD EXAMPLES -->";

export function renderPlannerGuardExamples() {
  return REGRESSION_GUARD_EXAMPLES.map(({ label, lines }) =>
    [`  ${label}:`, ...lines.map((line) => `    ${line}`)].join("\n"),
  ).join("\n\n");
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
