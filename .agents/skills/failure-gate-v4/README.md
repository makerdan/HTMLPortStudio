# Failure Gate v4

An operational skill and implementation contract for project-local, ID-based
validation-tier workflows across project types, including Replit projects. It is language-,
framework-, operating-system-, storage-, and provider-neutral.

## Package contents

- `SKILL.md`: core operating instructions; read this first.
- `reference/implementation.md`: registry, approvals, execution, storage, and lifecycle contract.
- `reference/acceptance.md`: host implementation test matrix and paired skill confirmation.
- `reference/execution-monitoring.md`: monitor, durable file trail, single-flight/
  resource guards, automatic read-only investigation, and coverage boundaries.
- `reference/runtime-reclaim.md`: host attestation, authentic scoped reclaim
  approval/claim, exact Port Authority protocol, uncertainty and acceptance cases.
- `reference/validation-budgets.md`: mandatory finite limits on every validation
  entry point, test/hook wiring, cumulative deadlines and independent supervision.
- `reference/staging-and-lifecycle.md`: policy applicability, per-caller staging/
  activation, retained-error recovery, independent startup gates and input shapes.
- `reference/authorized-continuation.md`: finish feasible approved work, continue
  independent permitted paths and proactively prepare precise next proposals
  without turning planning into execution or new authority.
- `tests/test_staging_lifecycle.py`: executable policy simulations only, not host
  attestation, approval, protected recovery or activation.
- `tests/test_activation_policy_guidance.py`: proactive setup document-contract
  regressions only, not executable host policy or approval evidence.
- `tests/test_authorized_continuation.py`: lifecycle continuation document-contract
  regressions only, not executed host approval or acceptance.
- `tests/test_validation_budgets.py`: test-only policy models and conditional
  local fixture watchdog checks; never a deployed supervisor or host authority.
- `tests/test_runtime_reclaim_contract.py`: isolated policy simulations only;
  not an approval service, protected runtime or deployable host adapter.
- `tests/authoring_supervision.py`: bounded streaming and owned static-fixture
  supervision only; not host authority, adversarial containment or activation.
- `tests/test_audit_regressions.py`: clock/capture, lifecycle and synthetic
  acceptance-decision regressions; never a real completion checker.
- `scripts/run-authoring-tests.py`: finite Linux-only combined/policy/writer
  authoring launcher with fixed inspected commands.
- `reference/owner-directed-closure.md`: explicit owner closure without
  claiming unresolved validation passed.
- `reference/evidence-and-recovery.md`: evidence index, tested restore,
  lineage, availability, read-only health, retention, export, and closure reporting.
- `reference/adapters/posix-writer-lock/`: optional tested Python/POSIX
  cooperative writer-lock reference and [host integration checklist](reference/adapters/posix-writer-lock/README.md).

The package contains instructions, specifications, and one optional executable
writer-lock adapter—not an installed gate registry, checked runner, approval-event
source, or completion checker. No existing project's enforcement has been
changed by authoring it.

## Adopt safely

Apply [authorized continuation](reference/authorized-continuation.md) in every phase:
finish remaining feasible approved work, identify exact blockers and prepare the
next scoped proposal rather than wait for user-written follow-up instructions.
Inert staging forbids any checks excluded by its actual approval. Proposals,
source completion and fixture passes never authorize Stage B, ordinary activation,
cutover, reclaim or retained-error recovery.

Every finite validation launch needs verified finite limits, including fast/direct
scripts, hooks, diagnostics, nested work and recovery. Read the complete
[budget contract](reference/validation-budgets.md). Verified ACTIVE governance
uses checked task/plan tiers and separately authorized diagnostics; verified
INACTIVE uses existing verified host policy and equivalent finite supervision;
UNKNOWN blocks dependent decisions. Explicit checked requests never fall back.
Read [staging/lifecycle](reference/staging-and-lifecycle.md) before staging or
activation; direct commands inherit no registry deadline. Finite
test/hook limits do not replace independent transitive outer supervision.
Missing real approved budgets/supervision blocks the affected readiness claim.
This definition amendment migrates no callers and activates no host route.

For Replit and other `.agents`-compatible hosts, place this directory at
`.agents/skills/failure-gate-v4/`. On other hosts use the supported canonical skill
location and map its interfaces explicitly. Do not edit disposable mirrors or save
deliverables beneath `.local/`.

When adopting v4 in an existing project, explicitly migrate the old Failure Gate
contract and its invocation/session guidance. Do not leave old and new versions
simultaneously governing the same task. Merely adding this directory does not
disable an existing workspace skill or implement the host controls.

Begin with the core skill's capability discovery. Implement missing host tooling
only under a separately authorized installation task. Use the acceptance matrix
to verify it before claiming checked project-local task-ID locks.

Example paths, tier names, task formats, and commands are not prerequisites.
The adapter can use existing local plans and task records, any appropriate runtime
and transactional storage, and the project's real checks. No backend, package
manager, Git repository, CI provider, or named companion skill is assumed.
Dropping in the skill makes its instructions available; it does not automatically
build or activate the project-specific enforcement adapters. The bundled
POSIX example is opt-in and requires the host-integration checklist and
project-specific acceptance tests before any cutover.

The scope is a cooperative project-local workflow: one local task ID, one
authorized tier, checked execution, recorded approval events/decisions
(or a separately preapproved deterministic activation policy),
and a local completion checker. Per-tier status/audit is derived from the one
task assignment, not maintained in editable per-tier allow/deny lists.
An owner may approve a fixed deterministic policy once so matching approved
plans receive per-task bound decisions without separate human review each time.
An approved Replit task plan is only an input when its exact contents and
project-local task mapping can be verified. The Replit route trusts an explicit
plan-approval action from a verified platform source without requiring the
approver's identity or a reviewer roster. It still verifies one declared tier,
exact bindings, and policy/version drift before local activation; platform
status, command approval, and later merge/apply actions are not substitutes.
Changes to plans or tiers require a fresh decision.
During authorized installation Agent must verify/reuse an applicable approved
deterministic policy or proactively propose one for owner approval using actual
host capabilities. After verified integration and authorized cutover, matching
tasks receive automatic bound decisions without repeated human policy approval.
No self-approval, invented route, or bootstrap-to-ordinary authority is implied;
follow [the policy setup contract](reference/implementation.md).
Hosts must
implement ordinary checked activation and execution for verified ACTIVE governance; a draft/review-only CLI
or a Workflow command run does not supply those records or local completion.
When a verified ACTIVE-governed task moves from Draft/Plan to Active, invoke local
activation, do the work, and validate the changed inputs through that route;
later relevant edits require another checked run. Report the local result for
the user's normal merge-or-dismiss choice, never auto-merge. No automatic
platform Active-state hook or platform merge gate is supplied by this package.
An agent with write/shell access can bypass or alter local tooling.
This package cannot technically prevent arbitrary commands or authenticate local records
against deliberate tampering, or control Replit Agent's Task Board transitions.
It does not supply human review or baseline catalog-governance services. Missing
required local approval blocks the affected change, not ordinary unrelated work.
An installation must verify a source for real approval events/decisions (or an
applicable previously approved policy) and effective final-write coordination
before activating ordinary tasks. Missing either leaves the new route blocked;
these instructions do not configure those host capabilities. Approval contents
and governing policy need pinned versioned evidence; a staged file is not stable
approval evidence. A Git commit can preserve verified captured event contents,
but cannot establish that a Replit approval occurred. An identity-based human
route may separately require a pinned reviewer roster; the Replit route does not.
Project code and CLI must not invoke, request, depend on, or present a result
from platform-managed completion. Retire any old managed-completion operation
during an approved migration. Do not modify
platform-owned dispatch or introduce an unlocked fallback in an attempt to
claim otherwise.

## Owner-directed completion

An explicit task-scoped owner instruction may administratively close the task
without passing checks or a second approval. The Agent must retain failures,
blocked/not-run checks, and unresolved repairs, recording a distinct completion
mode and reporting **“Closed by owner direction—not validation passed.”**
This is not Agent self-approval, baseline widening, tier authorization, or a
successful validation result.

The local route requires a verified audited transition and safe run handling.
The Agent may separately use an actually available authorized native platform
task interface; project code/CLI must not call or proxy platform completion.
Missing local tooling does not veto an owner-authorized native platform closure.
Report each system's real outcome; no interface or scheduler hook is supplied
by these instructions, and closure never authorizes auto-merge or deployment.

## Independent validation compatibility

The contract requires existing independent validation callers to keep working
without new task/plan metadata or caller changes. Platform final checks, CI,
local tooling, and other integrations are discovered, not presumed. TASK_PLAN_FILE
is one optional adapter, not a universal dependency or authorization signal.

Task binding and fail-closed authorization belong at the explicit checked
entry point. Invalid checked requests cannot fall back to independent execution;
independent results cannot replace required-tier evidence. Preserve original
commands, checks, timeouts, locks, reports, heavy-suite serialization, workflows,
and Run-button definitions unless separately authorized to change them.
An existing plan-file-only ordinary-task route may remain unchanged until its
approved cutover. Keeping independent checks working does not replace that route,
authorize other tiers, or let independent results close a task.
The implementation reference and added acceptance cases cover this
project-neutral compatibility amendment; actual host execution remains unverified
here. A host's separately planned original installation/confirmation must retain
its pinned source and record this amendment as a later distinct change.

## Agent-initiated execution scope

For verified ACTIVE task work, the Agent may initiate only the assigned tier through its checked
route, plus explicitly approved bounded non-tier capabilities. This is a launch
restriction, not merely an evidence filter. Independent, diagnostic, ad-hoc, or
non-evidence labels do not grant extra execution permission. Genuine independent
platform/CI/local callers retain their existing authority and unchanged invocations.

The registry must bind transitive hooks/scripts/workers and dispatch targets;
delegates inherit the same task bindings, permitted scope, shared budgets, and
lease ownership. Approved shared checks remain valid. Diagnostics/comparisons
need exact allowlists and finite cumulative accounting, not whole-tier commands
renamed after launch or resettable counters. Separate policies cannot grant a
second active tier or reconstruct it through split commands.

Necessary same-tier reruns and properly approved atomic tier changes remain
allowed. All-tier acceptance coverage uses definition inspection and instrumented
fixtures where appropriate; it is not approval for an all-tier live sweep.
Required live readiness evidence still needs its specific safe authorization.
These are cooperative instructions and host implementation requirements, not
proof that a local script prevents shell bypass or controls platform dispatch.

## Execution monitoring and automatic lookup

An authorized host installation must implement a monitor and durable structured
file log outside `.local/`, indexed in the capability manifest/evidence index.
It distinguishes requests/denials from confirmed launches and records initiator,
parent, task/authorization bindings, scope, declared reason, policy decisions,
start/finish evidence, overlap, and blind spots without inventing motive.

One atomic single-flight guard prevents duplicate top-level managed validation
for a task; shared-resource locks prevent conflicting cooperating runs across
tasks. Approved parallel substeps remain valid. Queued work is revalidated and
timeouts do not release live ownership. Required logging failures block managed
dispatch/readiness, not genuine independent callers or owner-directed closure.

When asked why multiple validations ran or overlapped, Agent must locate and
consult the registered evidence automatically, without repeatedly requesting
the file path. Investigation is bounded and read-only; unavailable or partial
evidence produces an explicit gap, not a guessed cause or automatic repair.
These are contract requirements, not a monitor/log installed by this package.

## Build configuration readiness

Each command's required configuration must come from verified project/deployment
settings and pass preflight before execution. Missing values block before launch;
do not assume `PORT`, guess a port, or invent `BASE_PATH`. Allocate a dynamic port
only through the verified host mechanism and coordinate its lifecycle. Preserve
secrets and keep independent callers' invocation contract intact.

## Evidence discovery and recovery

A full host implementation must publish a tracked evidence index linked from
its capability manifest, documenting actual locations and safe access to
allocator/namespace records, backups, catalogs, runs, corroboration, and
closure decisions. No hardcoded store, filename, runtime, or cloud is required.

The bundled evidence/recovery contract requires an isolated authorized
allocator restore exercise, original-source classification lineage, explicit
absence states, read-only health inspection, dependency-aware retention,
sanitized non-authorizing exports, and visible unresolved work after owner
closure. Missing optional history remains optional; no historical reports
are fabricated. These capabilities are implementation requirements, not
artifacts or services created by installing the definition.

## Authoring verification

The bundled budget suite separates standard-library policy/document tests from
conditional Linux/installed-Node fixture probes. Each Node probe has an independent
Python outer watchdog (900 ms), 200 ms TERM grace, 1000 ms KILL verification and
500 ms capture bound; fixture tests/hooks explicitly use 100 ms where applicable.
These are illustrative test-only limits, never approved host defaults.
Stdout/stderr are capped together during collection, not after buffering.
Absolute execution completion is rechecked; malformed evidence and overflow
cannot pass. Installed Node support is probed before newer CLI flags are selected;
explicit code-owned test/hook limits supply the verified fixture fallback.
Run the combined authoring suite twice sequentially through an authorized finite
supervisor with a 30-second suite bound, not a bare command presumed fast.
In this authoring workspace, `artifacts/verify-failure-gate-authorized-continuation.py`
reproduces bounded suite/package checks; its current source/preservation inputs
and report are workspace artifacts, not part of this portable skill ZIP.
Earlier verifiers/results are historical; their unchanged-source assumptions
predate the authorized audit repair and must not overwrite current evidence.
Fixture coverage is only the inspected static fixture tree. The Linux-only
authoring launcher uses process-local subreaper adoption and re-observed exact
incarnations, including new sessions, not adversarial pidfd or remote containment.
No registry, complete host/remote supervision, real caller or activation is proved.

This package received a document-level review for the project-local scope,
frontmatter structure, version consistency, Markdown fences, reference links,
example JSON, and core length. Failed runs do not automatically terminate tasks,
expired ignores cannot erase owned repairs, and local acceptance coordinates
with edits.

No host repository, baseline catalog, validation tiers, or enforcement implementation
was available for runtime verification. Runtime installation and all executable
host acceptance tests therefore remain unperformed. The document test matrix
is not a test-results report. The optional lock adapter's six primitive tests
passed here; they are not host coordination or task-completion verification.

## Runtime reclaim interoperability

Trusted host/platform attests the runtime; Failure Gate authorizes and atomically
claims the exact disruption; Port Authority performs ownership-guarded cleanup and
reports actual outcomes. `runtime.process-reclaim` is a proposed distinct
capability, not an installed endpoint or authorization to run another tier.
Read [the complete reclaim contract](reference/runtime-reclaim.md) before
integration. Missing authentic human approval, independent attestation, protected
transport, registry/claim or evidence route blocks live reclaim. The ordinary
Replit tier-approval event still needs no actor identity; reclaim's authentic
approver requirement does not change that route or owner-directed closure.

The current Port Authority `scripts/host-capabilities.mjs` intentionally throws
unavailable. Its local manifest/reference and an editable adapter cannot become
authority. Do not ship fixtures or unsigned local approval stores as integration.
No Port Authority runtime scripts or application wiring are installed by this
amendment. Documented, implemented, registered, deployed and successfully verified
capabilities remain distinct; passing simulations cannot establish readiness.
This amendment aligns with audit-fixed PA without changing its version 1 wire
protocol. Per-caller STAGED/NON_RECLAIM_VERIFIED/LIVE_RECLAIM_ENABLED states keep
isolated PASSED/FAILED/BLOCKED/NOT_RUN separate from actual host evidence and two
real authorized acceptance runs. Task-wide edit/test gates require approved
revision; implicit reclaim still blocks dependent non-reclaim activation.
Mandatory boolean recoveryRequired remains true on retained errors/crashes;
finalized false AND known quiescence is required for ordinary dead-owner recovery.
Unknown claims/writes and stopped local errors retain authoritative exclusion
until exact separately authorized reconciled/acknowledged recovery. The private
gate must be journaled and independently registered before user dispatch;
owner stall/death, original-group timeout and watchdog loss have explicit
bounded/retained-error requirements. Malformed envelope/process-member denials
must be structured INVALID/UNKNOWN with no signals, not uncaught TypeError.

Run the combined authoring suite through the finite Linux-only launcher from the
project root; run twice sequentially, never concurrently:

```sh
python -B .agents/skills/failure-gate-v4/scripts/run-authoring-tests.py --suite all
python -B .agents/skills/failure-gate-v4/scripts/run-authoring-tests.py --suite all
```

Policy tests use synthetic identities, a fake clock and in-memory records.
Process fixtures launch only new code-owned fixture trees and may signal their
exact owned incarnations. The suite never opens application ports or signals
application processes. The launcher bounds suite execution to 30 seconds, TERM grace to
200 ms, verification to 1000 ms and capture to 500 ms with a 1 MiB combined output
cap. Unsupported Linux/subreaper capability fails closed; use a separately verified
equivalent supervisor, not bare discovery. `--suite policy` selects the
policy/document/reclaim and pure clock/capture/acceptance regressions, not process
fixtures; `--suite writer` runs the six primitives.
The optional writer wrapper's timeout is acquisition-only, not execution
supervision; follow its [integration contract](reference/adapters/posix-writer-lock/README.md).
Host-language implementations may differ;
Python is required only to run this optional authoring test suite, not to adopt
Failure Gate. Actual JavaScript scope serialization is cross-checked separately
by the authoring verifier when Node is available. Required real host activation
evidence remains separate and unperformed here.