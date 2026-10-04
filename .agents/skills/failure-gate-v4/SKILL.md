---
name: failure-gate-v4
description: >-
  Implement or operate project-neutral, task-ID-based validation controls.
  Discover host capabilities, assign one authorized tier per task, prevent
  unintended tier changes, classify failures using provenance, and require
  applicable recorded validation for completion. Use for task planning,
  task-driven validation, baseline ownership, Failure Gate installation, or
  investigations of overlapping, duplicate, or unauthorized validation.
---

# Failure Gate v4

## Purpose and boundary

Separate three decisions: which tier a task may run, who owns each failure, and
whether recorded validation applies to the work being completed.
Explicit owner-directed administrative closure is a separate decision; it
does not turn missing or failed validation into a pass.

This skill defines a **project-local, cooperative workflow**; installing it
does not install the runner or registry or change Replit Agent's task lifecycle.
Never announce a lock, approval, test result, or completion check that has not
actually occurred. Checked entry points and a local completion checker can
reject unsupported results within this workflow. An agent with shell/write
access can run other commands or alter local state; this skill cannot prevent
that or require Replit's Task Board to use the local checker. Report this limit,
not tamper-proof enforcement.

The skill supplies no platform active-task binding, human approval service, or
baseline catalog-governance route. Use only verified project-local equivalents;
missing required authorization blocks the affected operation.
Project code and CLI must not invoke, request, rely on, or present results from
platform-managed task completion. Validated completion here is solely a local coordinator
decision; existing direct test commands may be diagnostics, not task evidence.
Direct-command availability is not permission for a task Agent to launch them;
diagnostics need the explicit bounded capability defined below.

## 1. Discover, then install or operate

Discover the host's canonical instructions, languages/runtimes, operating system,
build and validation commands, project-local plan/task format, baseline storage,
persistence, approval-event/decision source, final-write coordination, and available
project-local completion checks. No framework,
package manager, database, cloud, CI provider, task service, or preinstalled
companion skill is required.

Map the semantic contract to verified host interfaces in a capability manifest.
All example names, paths, tiers, and commands are illustrative, not dependencies.
Use existing equivalents rather than introducing a second project structure.
On hosts using `.agents`, keep canonical skill sources there; other instruction
files such as `replit.md` are discovery candidates only when present.

Classify each required capability as present, missing, or unavailable. Do not
assume named scripts or platform APIs exist. Read
[implementation.md](reference/implementation.md) for installation or changes to
enforcement; read [acceptance.md](reference/acceptance.md) when validating them.
Read [evidence-and-recovery.md](reference/evidence-and-recovery.md) for
installation, evidence classification/acceptance, recovery, health inspection,
retention, and export. Its eight requirements are part of this contract,
not optional recommendations or supplied host implementations.
Read [execution-monitoring.md](reference/execution-monitoring.md) for installation,
launch coordination, or overlapping/duplicate/unauthorized validation questions.
Its monitor, durable file log, guard, and automatic lookup are required host contracts.

- **Operate:** use verified host commands and interfaces.
- **Install:** implement the missing pieces only when installation is requested;
  preserve existing validation coverage and update canonical sources, not mirrors.
- **Unavailable:** report the exact blocker. Do not invent infrastructure or
  silently downgrade an already active gate.

Documentation-only authoring and non-project conversation are not project
validation runs. For project tasks, use the registered docs/no-op tier only when
its policy explicitly covers the work; never invent a passing validation result.
Keep deliverables outside `.local/`. Disposable archives are not durable plans.

An implemented installation publishes one tracked evidence index linked from
the capability manifest, identifying actual stores/access procedures and
availability without secrets. Prove allocator restore readiness in an authorized
isolated host exercise; never restore production or fabricate backups.
Optional history/catalog absence blocks only claims depending on it, not
unrelated work or explicit owner-directed closure.

## 2. Core invariants

- Allocate IDs transactionally in a verified project-local namespace. Never
  reuse a committed ID, including after cancellation or deletion. A supplied
  Replit Agent task number is not a local Failure Gate authorization.
- Within checked project tooling, one stable local task ID has one active
  authorized tier. All other tiers are denied by default; do not maintain
  redundant per-tier deny lists.
- The task Agent may initiate only that tier through its checked route, plus
  explicitly authorized bounded non-tier capabilities. This applies to direct,
  indirect, delegated, background, scheduled, and remote-triggered launches.
  Calling a run independent, diagnostic, ad hoc, or non-evidence grants no permission.
- The authoritative task record binds the canonical plan digest, tier-definition
  digest, permitted execution parameters, policy version, and authorization version.
- Each run separately binds the actual tested snapshot and relevant environment.
  Ordinary code edits do not require new tier authorization, but invalidate
  affected prior run evidence.
- A tier name is insufficient: changed commands, configuration, required steps,
  or coverage require policy review and affected authorization renewal.
- Missing, malformed, stale, conflicting, suspended, or terminal authorization
  fails closed. Never substitute a lighter or heavier tier.
- Derive per-tier status from the one local task assignment and current registry:
  only its authorized tier is `ALLOWED`; every other tier is `NOT ALLOWED`.
  Newly registered tiers default to `NOT ALLOWED`; suspended or terminal tasks
  are `NOT ALLOWED` everywhere. Record the per-tier status snapshot in each
  activation/change audit event, never as separate editable authorization lists.
- A task may not approve its own tier change, waive its owned repairs, broaden
  baselines, or silently modify governing enforcement.
- The local runner must verify that a supplied plan matches the project-local
  task record, exact approved plan/version/digest, and namespace; reject
  another task's valid ID/plan. A local record cannot attest the identity of a
  Replit Agent platform task.
- Treat changes to the runner, tier definitions, and checker as policy changes:
  seek separate approval before using changed tooling for the same task.
  Project files alone cannot make this rule tamper-proof.
- Failure classification never changes tier authorization.
- A retry pass establishes intermittency, not pre-existing provenance.

## 3. Plan and activate

Reserve the ID through the authoritative allocator. Read available project memory,
recent task evidence, and the discovered baseline catalog. Missing optional memory
or history is not a setup failure. No catalog means no catalog-authorized ignores;
it does not by itself prevent validation or evidence-based task-local classification.
Select the lightest registered tier covering the task; if coverage is uncertain,
use the project's defined selection policy, not an invented “middle” tier.

Capture a pre-edit baseline observation when the approved host policy requires it
for the affected behavior or risk, whether frontend, backend, native, embedded,
data, infrastructure, or another project type. Use the separate project-local
planning capability, not authorization for a locally active task. Do not run
destructive, production-affecting, hardware, or costly external checks without
their necessary authorization and safe environment.
Run scaffold/plan guards through their separate planning capability. These
bounded capabilities exist before activation and cannot satisfy task completion.
If a required route is missing, report blocked setup.

Use the host scaffold once verified. The following Markdown illustrates required
semantic fields; other project-local task formats may map equivalent fields
without adopting these exact headings:

```markdown
## Task identity
**Task ID:** `TASK-001042`

## Pre-existing failures to ignore
None known at plan time. Treat new failures as potential regressions.
**Flaky-test rule:** A passing retry proves intermittency, not provenance.

## Task-local environment observations
None observed.

## Validation
**Command:** `<registered-tier>`
**Why:** Covers the changed behavior and its relevant integration boundary.
**Do not escalate:** Run only the authorized tier; request approval for changes.
```

Replace examples with real registered values. Record an exact matching baseline
as either `**Ignored baseline:** <ID>` or `**Owned baseline repair:** <ID>`,
never both. Include suite, test, applicable variant/environment, and signature.
Keep task-local observations separate from reusable catalog authority.

Preserve other host-required sections and regression protections. No companion
skill with a particular name is required.
Plan guards must pass before activation. For the Replit approval route, treat
an explicit Replit plan-approval action from a verified platform source as the
trusted authorization event; do not require the approver's identity or a
reviewer roster. The adapter must verify what was approved, not who approved it:
exact plan contents/version/digest, binding to one local ID, the plan's single
declared registered tier and its definition, parameters, and policy versions.
Active/Ready status, a plan label, a command approval, or a later merge/apply
action is not plan approval. Do not invent an event adapter when none exists.
Other hosts may retain a configured human-review decision route.
Alternatively, the owner may approve a deterministic activation policy **once**
for a defined scope and version, before it is used. A policy proposed during
migration is not active until separately approved under the prior governance;
never presume approval. It must define a fixed tier-selection rule, eligible
plan source and approval criteria, and permitted parameters. The fixed rule
may select the plan's one stated registered tier if plan guards verify its
coverage; a plan cannot select an unregistered or uncovered tier. A matching
approved plan can then yield a separately recorded policy decision for each
task without a fresh human decision each time. An approved Replit task plan is
an input only after its exact contents and project-local task binding are
verified; a platform task number or plan label is not local authorization.
Unmatched or uncertain plans need a fresh applicable approval or stay blocked.
Bind each approval-event, human, or policy decision to the exact local ID, durable
plan/version/digest, selected tier and tier-definition digest, permitted
parameters, and policy/authorization versions. Record its real reference;
an agent-written `approved: true`, command-line flag, invented reviewer, or
bare task number is not approval.
Verify a configured, reviewable source for the actual approval event/decision
or the previously approved policy and its decision evidence; a caller's
assertion of approval is not that source. Pin event/decision contents and
applicable policy to stable, versioned evidence and retain its reference with
the authorization audit transaction; a mutable file alone is insufficient.
On a separate identity-based human route, pin reviewer authority with the
decision. Never make that roster or actor identity a Replit-event prerequisite.
If no applicable decision can be obtained and checked, activation is blocked.
Activate atomically with its audit event and announce only the observed result.
If the plan, selected tier, tier definition, permitted parameters, or governing
policy changes, invalidate the old decision and require a new bound decision;
do not carry approval forward.
When a Replit task moves from Draft/Plan to Active, the task agent must
invoke this project-local activation route with its verified local ID and
approved plan. A platform status change alone does not activate the local
record; if invocation fails or is unavailable, report blocked. Do not claim
an automatic Active-state hook without a verified adapter.

## 4. Execute under the task ID

Use the verified checked runner with local task ID and approved plan reference.
Ordinary-task tooling must support activation and checked runs under the same
local ID and plan; subsequent reruns use existing authorization. Drafting a
plan or requesting review alone cannot authorize a required-tier run. If
either checked operation is absent, keep ordinary tasks blocked.
While Active, perform the task work and run the authorized tier through this
local checked path after the relevant edits. A run at activation time validates
only that earlier snapshot; after further relevant edits, rerun before local
completion. On failure, investigate and rerun within authorization or report
blocked; do not present an unvalidated result as ready to merge.
Pass these through validated arguments or a local interface; `TASK_PLAN_FILE`
is an optional file-based adapter, not a requirement. Resolve file plans
inside the registered project root and verify namespace, identity, and version.
Reject another task's plan.
The runner resolves the single authorized tier from the registry and validates
the entire authorization before starting its commands.

### Constrain all task-Agent-initiated execution

Decide permission before launch, not only when accepting results. Do not run,
request, trigger, or delegate another tier without an approved atomic tier change.
Do not partition another tier into auxiliary commands to reproduce it. The
assigned tier may intentionally include shared checks from other tiers when that
composition is explicitly approved; shared coverage is not a second assignment.

Bind the approved transitive execution scope: wrappers, package/build hooks,
nested scripts, test discovery/configuration, workers, and scheduler/remote
targets where present. Verify their actual definitions and permitted branches
before launch; unknown scope or an undeclared tier dispatch blocks that route.
Delegates and child/background jobs inherit task/plan/authorization bindings,
purpose, permitted commands/selectors, and shared budgets; they cannot choose
another tier, borrow another task's grant, or invent independent authority.
Use only verified host interfaces; process labels cannot attest caller identity.

Whole-tier reruns on current inputs use the checked required-tier route. Diagnostics
and earlier-snapshot comparisons use registered, bounded capabilities, not a direct
tier command relabeled after launch. Record their exact command/selector allowlist,
approved transitive scope, failure/snapshot applicability, and per-attempt plus
cumulative task budgets across workers and auxiliary purposes. Reserve budgets
atomically before launch; started failed/cancelled attempts consume them.
Renaming a failure, changing purpose, restarting a worker, or creating a new
wrapper/run record cannot reset limits. Exhaustion or unavailable safe accounting
blocks further diagnostics; renewal requires the applicable explicit approval.
These auxiliary limits do not prohibit necessary authorized same-tier reruns.
Read the implementation's execution-scope contract for policy and accounting details.

### Monitor execution and prevent overlapping launches

Require a verified monitor and durable structured file trail outside `.local/`,
linked from the capability manifest and evidence index. Record attempted versus
confirmed launches, parent/initiator, task/run/authorization bindings, actual scope,
declared reason, decision/reason code, start/finish evidence, and coverage gaps;
never infer motive or treat absent events as proof of no extra execution.
Use one atomic single-flight slot per task/approved operation across top-level
validation purposes. Duplicates return the active run or follow a bounded reject/
queue policy, never spawn another run. Revalidate queued work before dispatch.
Approved parallel substeps inherit the parent's slot; shared-resource locks cover
conflicting cooperating runs across tasks. Keep leases until children are confirmed
stopped or safely quarantined; timeout alone cannot permit replacement.
Required monitoring/logging failures block managed launches or acceptance as
specified in the reference, not genuine independent callers or owner-directed closure.

When asked about overlapping, duplicate, or unauthorized validation, automatically
find and read the indexed log and relevant original evidence using bounded read-only
queries. Do not require the user to repeat its path. Report actual launches, overlap,
authority, supported causes, and missing coverage; do not start tests or mutate
processes/policy just to investigate. The reference defines durability and proof.

### Preserve independent validation callers

Discover existing validation callers: platform final checks, CI, local tools,
and other host integrations when present. Keep their independent invocations
working without new task/plan metadata or caller changes. `TASK_PLAN_FILE` and
equivalent host inputs are optional adapters, never universal prerequisites,
approval, or execution-mode selectors merely because they are present or absent.
Compatibility preserves genuinely independent invocations under their own existing
authority, not a task Agent's discretionary extra launches. A local tool is not
independent merely because it bypasses the runner or lacks task metadata. Do not
trigger extra local/CI/platform tiers or broaden their dispatch to evade assignment.
Observe existing autonomous checks without treating them as task authorization;
do not add caller metadata requirements or claim control of platform dispatch.

Put task authorization at the explicit checked entry point, not unconditionally
in shared check commands. Checked requests lacking valid identity, approved plan,
tier, or authorization fail before launch; never downgrade them to independent
execution. Independent checks remain subject to their existing safety/access
policy, preserve real failures/incomplete results, and cannot supply accepted
required-tier evidence. Ordinary task work must still use its checked route.
An existing plan-file-only ordinary-task route may remain in force until its
approved cutover; preserving independent callers does not require changing or
replacing that route. Do not run other task tiers using a fast-only task plan.
Do not accept a direct pass, variable, or bypass flag as checked authorization.

Preserve existing command strings, coverage, timeouts, resource locks, reports,
heavy-suite serialization, and workflow/Run-button definitions unless separately
authorized to change them. Verify both execution paths and evidence separation
through the host acceptance cases; do not claim platform integration from fixtures.

### Verify required command configuration before launch

For each registered command, identify required environment/configuration inputs,
their verified source, validation rule, and whether the value is secret. Check
them before launching the affected command; a missing, invalid, or unavailable
required input is `BLOCKED` before that command starts, not a build failure, successful no-op, or
fabricated default. Apply this to independent callers too without adding caller
metadata or altering their existing command strings. Preserve raw outcomes and
identify which stage actually ran.

For a required port, prefer the host/project's verified assigned port and keep
its expected value consistent across the caller, builder, and reports. If
dynamic allocation is necessary, use a verified host allocator or coordinated
reservation and pass the assigned value through the command's environment, not
shell interpolation. Validate the port and handle conflicts/concurrent runs
under the host's resource lifecycle; a probe of a free port without reservation
does not guarantee it remains available. If the build only embeds a port in
output and does not bind a socket, use its verified build configuration instead
of inventing a listener or ephemeral URL. Resolve `BASE_PATH` and similar
deployment settings from verified project/deployment configuration; do not
assume `/` or any universal port. Do not log secrets or invent fallback values.
When an actual local listener needs a port and no fixed project port is defined,
assign one from the host's verified allowed range/allocator and retain its
reservation through bind; do not guess a familiar port number or blindly take
the first one that answers as free.

Execute required steps without coverage-reducing overrides. Authorized diagnostic
selectors may retry a failed test or compare a verified earlier snapshot; these
are distinct run purposes, not alternative tiers or complete assigned-tier evidence.
Do not remove the local task ID from checked runner inputs, borrow another local
task's authorization, or relabel required validation as ad hoc.

Record run identity, purpose, authorization version, actual arguments, snapshot,
environment/configuration identity, raw results, and complete report references.
Launching a command via Replit Workflows or another scheduler is execution,
not evidence of tier approval or project-local completion; only the checked
runner's verified records can supply task validation evidence.
Do not stop a multi-step tier merely because an ignored failure appeared;
account for every required step. Unsafe dependent steps may stop, but the run
is then incomplete rather than acceptable.

Relevant edits after a run require renewed applicable validation. Hash actual
tested inputs, not just the commit ID of a dirty tree. Isolate runs from concurrent
edits; if snapshot integrity is unknown, reject the evidence.

## 5. Classify failures without expanding scope

Apply in order:

1. **Owned repair:** verify the declared obligation and fix it within task scope.
   Expiry or reclassification cannot erase ownership. A deleted, skipped,
   filtered, renamed, or undiscovered test is not proof of repair.
2. **Explicit ignore:** ignore only an exact match to an authoritative, unexpired
   active catalog record applicable to this environment. Do not repair unrelated
   failures. Preserve the raw failing result.
3. **Unlisted failure:** run exactly three authorized isolation retries when the
   diagnostic capability supports that failure. Record each attempt; the initial
   failure is not a retry. Crashes, skips, missing reports, and zero-test runs
   are not passing attempts. Do not retry until lucky.
4. **Provenance:** classify as pre-existing only with direct evidence of the same
   failure on a verified earlier, task-unaffected snapshot plus independent
   corroboration. Match environment applicability as well as failure identity.
5. **Insufficient evidence:** report an unresolved potential regression and block
   completion. Investigate within authorization; do not automatically fix
   unrelated code or label unknown ownership as proven task causation.

Direct evidence is a verified comparison run or a trustworthy earlier run.
Corroboration may be independently sourced task/memory evidence, an applicable
catalog record, or verified unchanged relevant inputs including transitive,
configuration, fixture, migration, generated, and dependency inputs. References
copied from the same observation count once. Narrative memory plus untouched
files without direct provenance is insufficient.
Retain the classification's exact failure/run/snapshot and original-source
lineage. Distinguish never-collected, unavailable, expired, pruned, corrupt,
and unknown evidence; copied origins cannot establish independent corroboration.

If isolation is impossible or unsafe, use a registry-defined equivalent diagnostic
policy with explicit coverage and attempt limits. Otherwise classification is
blocked; missing diagnostics do not authorize a broader tier.
Comparison and equivalent policies must stay within the approved diagnostic scope,
including transitive commands and cumulative budgets. If three isolation retries
cannot safely fit the authorized budget, report classification blocked; do not
claim fewer attempts satisfy the rule or replenish the budget yourself.

Typecheck failures remain failures under the host's typecheck policy, not
test-baseline waivers. Harness failures remain blocked/incomplete, not proven
product regressions. Promote a baseline to the catalog only through a verified
project-local maintenance approval route. Record evidence, applicability,
matching rule, review deadline, and the owner/reviewer or policy authority
required by that route. Without it, do not promote; keep the failure task-local.

## 6. Change authorization deliberately

Request a tier change only for a concrete coverage/scope need—not a known failure
or extra confidence. Permit one pending request. Suspend validation if current
coverage is inadequate; otherwise the old tier remains the only authorized tier.

Approval must identify the recorded project-local human or previously authorized
policy authority, or the explicit Replit approval event, and the exact decision
evidence. Replit events require no actor identity. If the required approval route
is unavailable, block the change; do not invent an owner-review service.
Move authorization atomically: update tier, plan version/digest, parameter and
tier digests, authorization version, request state, and durable audit event.
Run plan guards against the proposed plan before publishing the change.
Rejection cannot clear an independent suspension or violation.

Validation-relevant plan amendments follow the same approval/versioning rule,
even without a tier change. A previously approved policy may issue a new
decision only if the amended plan still matches its fixed rule and all guards
pass; otherwise require a fresh applicable approval. Code edits inside approved
scope do not.
Serialize transitions with active runs; do not orphan a run or accept stale
results. Keep using the prior governing policy until a change is separately
approved; this is a workflow rule, not tamper-proof enforcement.

## 7. Decide completion and report accurately

If the owner explicitly directs closure of a specific task, read and follow
[owner-directed-closure.md](reference/owner-directed-closure.md). Close through
verified available local/native interfaces without demanding passing tests or
a second approval, while retaining actual validation and unresolved repairs.
Record `completionMode: owner_direction` or an unambiguous equivalent and say
**“Closed by owner direction—not validation passed.”** The Agent cannot create
that authorization itself. Missing local tooling does not veto an authorized
native platform closure; report each system's actual outcome separately.

Otherwise, ordinary validated completion follows the rules below:

Keep raw exit status separate from assessment:

- `PASS`: all required obligations executed successfully.
- `ACCEPTABLE_WITH_IGNORED_FAILURES`: complete results contain only qualifying
  unrelated failures; owned repairs and other mandatory checks are satisfied.
- `FAIL`: a regression, unmet repair, or other required product check failed.
- `BLOCKED`: authorization, evidence, required capability, or environment is missing.
- `INCOMPLETE`: execution/results are unfinished or untrustworthy.

The project-local completion checker must examine complete assigned-tier run
records and all observed failures, not accept a summary or a manually supplied
`PASS` label. Diagnostics cannot replace complete assigned-tier validation. Unexpected
zero-test runs, missing reports, and skipped required steps cannot become
acceptable through baseline classification. Ad-hoc runs are not recorded as
required-tier validation for a project-local task. The checker can reject
inconsistent local evidence, but cannot authenticate evidence against an agent
who can edit the runner and records.

Require the local checker before marking a task complete **as validated in this
workflow**; the explicit owner-directed administrative route is the exception.
This does not gate Replit Agent's Task Board or any platform-owned success path.
Project code/CLI must not call platform completion or import its outcome as
local validation evidence. Agent-native owner-directed closure uses only the
separate reference's verified interface route; never invent an adapter.
Report the local result before presenting work for the user's normal
merge-or-dismiss choice. Do not automatically merge, and do not claim that
the local checker controls whether the platform presents that choice.
Coordinate the final input check, evidence assessment, and terminal write with
the host's verified writer and authorization locks or equivalent isolation so
relevant edits cannot intervene. Without that coordination, block local
completion; do not treat a snapshot checked earlier as final. Do not activate
a newly installed gate for ordinary tasks until this coordination has been
demonstrated.
If a required external check cannot be run or verified, report validated local completion
as blocked; never impersonate it or silently omit it.

A still-running check is incomplete. A polling timeout is not cancellation.
Do not start a replacement while the original remains active; use documented
recovery. After acceptance, failure, or cancellation, release authorization
atomically and retain IDs/history. Failed/cancelled tasks need no passing validation
to release safely after run handling.

Report local task ID, authorized tier, run IDs, tested snapshot, raw results,
assessment, completion mode/decision, failure ownership/evidence, and workflow limitations. Never call
an ignored failing suite a clean pass.
Provide read-only evidence-health inspection and requested sanitized evidence
exports through verified host routes. Retain supporting artifacts for accepted
claims, permanently preserve ID tombstones, and invalidate dependent claims
when supporting evidence is pruned. Exports are not authorization or proof that
another environment passed. Visibly list unresolved work after owner closure;
do not count it as validation success or auto-create repair tasks.