---
name: Failure Gate
description: >-
  Apply to every task plan and task execution. Establish a test baseline,
  classify failures with evidence, enforce the plan's validation ceiling, and
  report ownership without fixing failures the task did not cause.
---

# Failure Gate

Failure Gate is the tracked project convention for making test ownership
explicit before a task is declared complete. It applies at plan time and
execution time. It covers test-suite failures; typecheck, build, and lint
failures remain task failures and are never waived as a test baseline.

## Project mandate

The canonical definition is this file. The project integrations are:

- `scripts/check-failure-gate.mjs` — plan lint guard.
- `scripts/new-plan.mjs` — compliant plan scaffold.
- `docs/validation/validation-tiers.json` — registered tier catalog.
- `scripts/run-locked-tier.mjs` — plan-selected, fail-closed runner.
- `scripts/validation-steps.mjs` — scoped stub remediation followed by a
  strict check.
- `replit.md` § Agent rules — the session mandate.

Do not create or maintain an alternate Failure Gate skill copy. Enforcement
changes belong in these tracked files, their tests, or the project guidance.

## Non-negotiable contract

- Every task plan has `## Pre-existing failures to ignore` and `## Validation`.
- `## Validation` contains a registered tier name in `**Command:**`, a filled
  `**Why:**`, and `**Do not escalate:**`.
- The baseline catalog is `docs/validation/failure-baseline.json`. Only an
  exact suite/test/signature match to an unexpired `active` record may
  authorize an ignored failure.
- A catalog reference declares exactly one ownership:
  `**Ignored baseline:**` for unrelated work, or
  `**Owned baseline repair:**` when this task repairs it.
- Unknown, stale, `needs-review`, `intermittent`, `environment-limited`, and
  `resolved` records never authorize an ignore.
- A passing retry proves intermittency only; it does not prove provenance.
- Task-driven tier-lock errors fail closed. `--allow-no-plan` is reserved for
  an explicitly ad-hoc caller.
- `.local/tasks/` is environment-local archive state. Do not bulk-rewrite it
  as a tracked deliverable.

## Plan-time discovery checklist

Before writing the first plan heading, the Planner must:

1. Run `scripts/new-plan.mjs` instead of creating a plan by hand.
2. Read `.agents/memory/MEMORY.md` and relevant linked topic files.
3. Read the baseline catalog and match exact suite, test, and signature data.
4. Search recent task descriptions for pre-existing, known failure, flaky, and
   relevant suite references.
5. Run the primary backend suite once when the task changes backend/API code.
6. Record a repeatable `--baseline-id` or `--owned-baseline-id`, or explicitly
   record that none is known. Use `--environment-observation` only for
   temporary harness or resource limits.
7. Choose the lightest registered tier covering the task; use the middle tier
   when uncertain.
8. Set `## Validation` immediately after the baseline section and verify both
   guards in single-file mode:

   ```sh
   TASK_PLAN_FILE=.local/tasks/<name>.md node scripts/check-failure-gate.mjs
   TASK_PLAN_FILE=.local/tasks/<name>.md node scripts/check-regression-guard.mjs
   ```

Before the first plan heading, announce:

```text
[FAILURE-GATE] Discovery checklist complete. Pre-existing failures documented: <N>. Validation command: `<command>`.
```

Required baseline template:

```markdown
## Pre-existing failures to ignore
None known at plan time. Treat every failure as a potential regression.

**Flaky-test rule:** A passing retry establishes intermittency, not
pre-existing provenance. Use the execution evidence rules before assigning
ownership.
```

When a catalog record matches, use exactly one of:

```markdown
- **Ignored baseline:** `BASE-EXAMPLE` — suite › test; match only this signature: exact failure signature.
- **Owned baseline repair:** `BASE-EXAMPLE-REPAIR` — suite › test; this task explicitly owns repair of this signature: exact failure signature.
```

Free-text `--pre-existing` is task-local evidence, not a durable catalog
claim. Neither it nor `--environment-observation` weakens the execution gate.

Required validation template:

```markdown
## Validation
**Command:** `test-standard`
**Why:** <one-line reason this registered tier covers the task>
**Do not escalate:** Run exactly this command. A baseline failure is not a reason to run a heavier tier.
```

The linter's `--fix-stub` mode adds missing structure only. It does not repair
invalid tiers or placeholder explanations. `--stubs-only` performs only that
structural remediation and intentionally skips strict validation.

## Execute-time decision path

Read the plan's baseline and validation sections before editing. A task-driven
validation run must set `TASK_PLAN_FILE` and use:

```sh
export TASK_PLAN_FILE=.local/tasks/<name>.md
node scripts/run-locked-tier.mjs "$TASK_PLAN_FILE"
```

The plan's `**Command:**` is the validation ceiling. The locked runner resolves
that name through the tier registry and runs the registered command verbatim.
It never accepts a substitute heavier or lighter command. Missing, unreadable,
malformed, unknown, or mismatched plan/tier data is a **TIER-LOCK VIOLATION**
and stops before validation. Only an explicitly ad-hoc invocation may use
`--allow-no-plan`.

Task validation is the plan's registered command. Completion validation is the
platform-managed final check and may run broader registered checks; do not skip
it merely because it exceeds the task ceiling. If completion validation stays
running through its polling limit, report a validation-harness limitation and
do not start a duplicate run.

Classify failures in this order:

1. Match suite, test, and signature to an active, unexpired catalog record.
   Skip it only for `Ignored baseline`; repair it for `Owned baseline repair`.
2. For an unlisted failure, retry the failing test three times in isolation.
   A pass is intermittent evidence only; three failures establish consistency,
   not ownership.
3. Self-classify as pre-existing only with at least two of:
   - the test and directly imported task-relevant files are untouched;
   - it also fails on the pre-task revision or main;
   - a specific memory entry or recently merged task documents the pattern.
4. Without that evidence, treat it as a regression, fix it, or obtain the
   missing evidence. Never silently waive it.

Every self-classification emits:

```text
[SELF-CLASSIFIED PRE-EXISTING] <suite or test> — evidence: <factor1>, <factor2>
```

Do not promote a task-local observation into the catalog. Promotion requires
the retry result, two-factor provenance, exact signature, dated evidence, an
owner, and a review deadline, and is a separate maintenance change.

Complete only when each remaining failure is explicitly ignored, repaired,
self-classified with the required evidence, or fixed by this task. Run exactly
the plan's command; do not escalate because of a baseline or intermittent
failure.

## Archive and maintenance boundaries

The validation pipeline may run scoped `--fix-stub` remediation for the
current `TASK_PLAN_FILE`. Archive inspection requires:

```sh
node scripts/check-failure-gate.mjs --archive
```

It is not an ordinary tier dependency. Periodic baseline maintenance is an
opt-in report:

```sh
pnpm run maintain:validation-baseline
```

The report can warn about active records nearing review or with stale
verification, but does not authorize expired records or fail unrelated work.