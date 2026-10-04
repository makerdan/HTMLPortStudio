# Project task-plan guidance

The canonical Failure Gate skill source is
`.agents/skills/failure-gate-v4/SKILL.md`. Its uploaded bytes are preserved.
This document owns the project's generated Regression Guard guidance; the
updater must never append host policy to the canonical skill.

These blocks describe existing project validation, not complete Failure Gate
v4 enforcement. Installation alone does not implement the project-local
allocator, authorization registry, approval adapters, runner, or completion
machinery. The existing commands and validation ceilings documented in
`replit.md` remain unchanged.

Refresh these blocks explicitly with
`node scripts/update-regression-guard-guidance.mjs`. Validation uses `--check`
and is read-only. Both this document and `replit.md` share the renderer in
`scripts/lib/regression-guard-guidance.mjs`.

## Regression Guard policy

<!-- BEGIN GENERATED REGRESSION GUARD POLICY -->
Regression Guard is an additive plan contract enforced by `scripts/check-regression-guard.mjs`.
When a task fixes or materially changes existing behavior, the plan must classify the change and name the concrete recurrence test, or use one of the documented N/A reasons.
The guard section follows the plan's baseline and validation sections and does not change the selected validation tier. The validation entry point scopes both guards to `TASK_PLAN_FILE`, remediates missing stubs, then runs both strict checks.
The permitted exceptions are: a race condition requiring real timing, an unmockable external API behavior, a visual regression with no screenshot infrastructure, or a fix that removes the feature entirely.
A guard-writing task may instead declare `**Self-satisfying**` and identify its guard or test deliverable.
Placeholder, vague, wrong-layer, and misplaced declarations fail strict validation. Regression Guard never replaces Failure Gate or raises the plan's validation ceiling.
<!-- END GENERATED REGRESSION GUARD POLICY -->

## Regression Guard examples

<!-- BEGIN GENERATED REGRESSION GUARD EXAMPLES -->
```sh
# Concrete guard
node scripts/new-plan.mjs --guard-covers "A concrete scenario or invariant." \
  --guard-test-location "path/to/recurrence.test.mjs" \
  --guard-checks "The assertion that fails if the old behavior returns."

# N/A guard
node scripts/new-plan.mjs --guard-na-reason "The failure is a race condition requiring real timing: genuine wall-clock concurrency cannot be faithfully reproduced with fake timers."

# Self-satisfying guard
node scripts/new-plan.mjs --guard-self-satisfying "the Regression Guard checker and focused recurrence test"
```
<!-- END GENERATED REGRESSION GUARD EXAMPLES -->