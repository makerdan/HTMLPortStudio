# Failure Gate v4 — project-local implementation contract

Read this when installing or changing the project-local workflow. These are
interfaces and requirements to implement, not claims that commands already exist.
For installation, classification/evidence acceptance, recovery, health,
retention, or export, read the complete
[evidence and recovery contract](evidence-and-recovery.md). Implement its eight
capabilities through verified host equivalents; the optional-history and
owner-directed closure exceptions remain intact.
Installation and launch coordination also require the complete
[execution monitoring contract](execution-monitoring.md): cooperative single-flight
and resource guards, durable file telemetry, discoverability, and automatic lookup.
Questions about overlap use its bounded read-only investigation route.
For runtime cleanup/reclaim, also read the complete
[runtime reclaim contract](runtime-reclaim.md). Host attestation, authentic human
approval, protected checked claims and outcome storage are additional scoped
requirements, not inferred from ordinary tier activation or a resource lease.

## Scope and migration

Inventory the host before editing. Reuse its existing build/validation tools,
project-local task lifecycle, baseline schema, and canonical instruction sources.
Do not install a second competing runner or weaken existing coverage.
First verify governance: ACTIVE follows the checked task/plan and diagnostic
contracts below; INACTIVE uses verified existing host policy and bounded
equivalents, not fictional Failure Gate APIs; UNKNOWN blocks dependent decisions.
These implementation requirements govern ACTIVE or separately approved host
installation, not unrequested inactive-host migration. Explicit checked requests
always fail closed without independent fallback. Read the complete
[staging and lifecycle contract](staging-and-lifecycle.md) before staging,
activation or retained-error recovery; record per-control states and separate
fixture PASSED/FAILED/BLOCKED/NOT_RUN from actual host evidence.

## Host adaptation

Apply [authorized-continuation.md](authorized-continuation.md) across discovery,
installation, policy setup, checked execution and completion. Finish feasible
approved implementation/review/verification; a checkpoint is not a finished scope.
At a real boundary continue independent permitted work and prepare the exact next
proposal, not a request for the user to design routes. If inert staging excludes
checks, implementation can continue but imports/syntax/tests/execution cannot.
After permitted readback pin the source closure, plan and gaps for scoped execution
approval. Plan first safely supervised readiness proof without demanding that the
same proposed acceptance suite already passed; missing safe supervision remains
a blocker. Neither preparing proposals nor bootstrap readiness activates ordinary
tasks or changes task states/dependencies, authority or cutover.

The contract applies to web, mobile, desktop, CLI, libraries, embedded systems,
infrastructure, data pipelines, and documentation projects. Local tooling may
run in the developer environment; it need not run inside the deployed application
or on the target device. Do not add a backend to a static app merely to host a gate.
These are project-local task records, not Replit Agent's platform task records.

Record these mappings before choosing implementation details:

| Contract concept | Host mapping |
|---|---|
| Project identity | Verified project-local namespace; Git is optional. |
| Canonical instructions | Host instruction sources; `.agents` where supported, never generated mirrors. |
| Task/plan | Durable project-local record and plan, with semantic fields and version/digest mapping. |
| Tier | Existing check group or an explicitly approved grouping of real available checks. |
| Execution | Host-language process runner or build tool with the project's real checks. |
| Evidence | Actual source/artifact snapshot, relevant environment identity, and trustworthy result parser. |
| Storage | Durable transactional coordinator suited to the host's concurrency and availability. |
| Approval/completion | Recorded human/policy decision, ordinary local completion checker, and explicit owner-directed administrative closure route. |

No Node.js, Python, shell syntax, operating system, SQL engine, package manager,
specific number/order of tiers, or cloud provider is mandatory. Use portable
process and path APIs appropriate to the chosen host. Version-control commits
are optional snapshot aids, not the definition of tested content.

If tiers are absent, installation may propose a minimal registry based on actual
host checks. Register it only under approved installation policy; do not fabricate
smoke/standard/heavy commands. If no automated tests exist, identify real build,
lint, manual, or domain checks. A manual-only tier must record its approved scope,
reviewer and actual evidence and be reported as manual validation, never automated
test success. Unsupported required checks remain blocked, not silently no-op.

Optional memory, historical tasks, catalogs, and companion skills may be absent.
Do not invent their contents or make them installation prerequisites. Without a
baseline catalog there are no catalog-based ignores. Without earlier evidence,
unlisted failures cannot be proven pre-existing.

Pre-edit observations and retries use the host's approved risk policy. Device,
production, destructive migration, paid-service, and other side-effectful checks
need explicit safety constraints and authorization. Do not assume isolated tests
can safely replay an operation merely because the runner supports retries.

Create a capability manifest covering allocator, plan guards, planning discovery,
activation policy, tier registry, checked runner, diagnostics, results parser,
configured approval-event/decision source, recorded approval route, local completion
checker, final-write coordination, persistence, and recovery.
Include monitor coverage/health, single-flight/resource locks, persistent file-log
location and access, and automatic read/query mappings. These are required managed
route capabilities, not assumed services or mandatory platform caller metadata.
Map owner-directed closure separately, including retained decision evidence,
completion mode, local reader semantics, safe terminal release, and any
genuinely available Agent-native platform operation. Missing closure support
does not fabricate an ordinary validation result or platform adapter.
State the verified interface for each. Do not claim integration with a platform
task lifecycle that cannot be demonstrated.
Publish the contract's tracked evidence index and record its path in this
manifest. Include actual backup/restore, evidence-health, lineage, retention,
export, and completion-mode reporting routes and their availability states.
The index is a locator, not a second authoritative task/allocator registry.
For reclaim, map the independently trusted platform attester, authentic approver
and active approval source, authoritative task/plan/run/operation registry,
protected verifier/transport, atomic claim and conflict coverage, revocation
clock, evidence journal and bounded uncertainty-recovery route. Distinguish
documented/proposed, implemented, registered, deployed and successfully verified
capability. Missing proof blocks live reclaim, not unrelated read-only work.

Illustrative source layout for a file-based host using `.agents`; none of these
paths is a universal runtime dependency. Map to existing host equivalents:

```text
.agents/skills/failure-gate-v4/
plans/<task-id>.md
docs/validation/failure-gate-policy.md
docs/validation/tier-registry.json
docs/validation/failure-baseline.json
scripts/failure-gate/                  # host-language implementation
tests/failure-gate/
```

Live registry storage is not a committed mutable JSON document. Use an appropriate
transactional store with durable persistence outside `.local/`; keep schema,
migrations, fixtures, policy, and implementation tracked. Document storage backup,
restart behavior, access permissions, and project-local scope. Never merge live
database binaries from task branches or assume a local database coordinates clones.
Prove allocator restoration through an authorized isolated host exercise,
including post-backup committed-ID reconciliation, writer fencing, namespace,
tombstones, transaction consistency, and stale-permission handling. Missing
proof blocks recovery readiness; an old backup cannot authorize ID reuse.

Install via a separately approved bootstrap operation using existing safe
validation. When replacing an active gate, use its prior verified checked
route and selected tier for this operation only; ordinary task validation
stays blocked until the new route is verified and the prior ordinary-task
route is removed in one cutover. Record approval specifically for this
installation; do not reuse an earlier task's bootstrap approval. Do not run
every tier or substitute focused diagnostics for the selected tier. Bootstrap
is limited to implementing the gate, logs its actual checks, and cannot
authorize ordinary tasks. Verify acceptance tests and a live local-ID checked
command before enabling the new route; fixture-only tests do not prove a
live cutover. Migrate existing plans explicitly; preserve historical task records
without rewriting or retroactively approving them. Do not invent historical IDs,
approval events, or task authorization.
Acceptance coverage for all registry entries is not authorization to execute all
tiers. Pin and compare definitions, use isolated instrumented contract fixtures,
and run only live checks covered by this operation's selected tier or explicit
bounded non-tier verification policy. A needed live run of another tier requires
a separate authorized operation or approved atomic tier change, never a sweep.
Missing live evidence blocks only the affected readiness claim; fixtures cannot
stand in for required live caller, restore, or cutover proof.
If a required approval source, writer lock, or adapter is missing, leave activation
blocked rather than running two authorities or a fallback.

## Authority and approvals

This section governs ordinary tier activation/change. Runtime reclaim instead
requires the distinct authentic human disruption approval in
[runtime-reclaim.md](runtime-reclaim.md); it cannot borrow a tier event or policy
as process authority. That stricter scoped rule adds no actor/roster prerequisite
to the ordinary Replit-event route and no second approval for owner closure.

This workflow is a cooperative project control. A user approval may be recorded
with a real conversation/task reference and exact approved change. Label its
verification accurately: locally recorded approval is not cryptographic identity.
Never fabricate an approver or use an example reference in real state.

For the Replit approval route, trust an explicit Replit plan-approval action
as the authorization event without requiring an approver identity, identity
attestation, or reviewer roster. Verify the event, its subject, and the
governing bindings instead. Approval of a command, starting work, Active/Ready
status, or merging/applying finished changes is not approval of the plan.

The host adapter must retrieve or capture the actual approval through a
supported, trusted platform interaction source; no event API or webhook is
assumed. Record the real event reference and stable evidence of the action
and exact approved plan/version/digest. Bind it to one verified local task ID,
the plan's single declared registered tier, tier-definition digest, permitted
parameters, policy version, and authorization version. Check guard-verified
coverage and current policy/definition versions before activation. No actor
field is required, and its absence must not block an otherwise valid event.
An approval event cannot authorize another local ID or a changed plan or tier.
Retries of the same activation obey the coordinator's idempotency/CAS rules,
not a second task assignment.

Configure how the coordinator obtains and checks event evidence, approved
contents, and the local mapping. A caller flag, guessed event ID, agent-authored
approval claim, or supplied reference without the real action evidence is not
an event. Missing/inaccessible evidence or an unverifiable mapping blocks
activation; do not install a placeholder source. Approval is a design contract
here, not a claim that Replit exposes the needed adapter in this host.

Pin event/decision contents and applicable policy to stable, versioned evidence
and retain its reference with authorization and audit atomically. A staged
file, branch name, or working-tree path alone cannot pin approval contents.
A committed revision is an optional way to preserve captured evidence, not
proof that a Replit approval occurred. It must originate from the verified
event source. A later ref move must not change the pinned record.
Other hosts may keep a designated local human-review route, separate from
the task agent. Only an identity-based route needs reviewer-authority checks
from the same pinned snapshot as its decision; do not impose that roster
on the Replit-event route.

The owner may approve a deterministic activation policy once, separately from
individual task plans and before any task uses it. Record the actual approval
reference, version, effective scope, eligible plan source/approval criteria,
fixed tier-selection rule, permitted parameters, and change/revocation route.
### Agent-led policy setup during authorized installation

Agent must discover the actual authoritative policy/approval source without
waiting for the owner to invent a route. Verify and reuse an applicable approved
policy: check its pinned scope/version, current approval, revocation, bindings,
budget authority and available host integration. An absent, stale, revoked,
out-of-scope or unverifiable policy cannot authorize work. Unknown availability
is not verified absence, inactivity or permission to replace the current authority.

If no applicable approved policy exists, proactively propose a scoped, versioned
deterministic policy for owner approval under the prior governing route. Include
eligible plan source/approval criteria, fixed tier selection, exact task/plan/tier
bindings, permitted operations/parameters/transitive allowlists, authoritative
approval evidence and decision recording, complete finite budgets for every entry
point under [validation-budgets.md](validation-budgets.md), independent supervision/
termination, conflict coverage, and change/revocation rules. Inspect actual routes
and propose concrete mappings/limits; do not ask the owner to invent technical
interfaces. Report missing capabilities and proposed implementation separately;
never substitute Agent-written flags/references, fabricate services, self-approve,
or change the policy to authorize the Agent's own work.

Policy approval alone does not activate a host route. Preserve distinct bounded
bootstrap authorization and verified ordinary-route acceptance/cutover evidence;
bootstrap checks cannot authorize ordinary tasks or satisfy their validation.
Keep the prior governing route until separately approved scoped cutover.
After approval, verified integration and authorized cutover, apply the policy
automatically to eligible tasks, recording a bound decision for each. Do not ask
for fresh human policy approval merely because a new exactly matching task arrives.
Unmatched/uncertain tasks and changed policy terms need applicable new approval or
remain blocked; changed task bindings still need a fresh bound decision under the
matching approved rule. This policy grants no additional diagnostic, reclaim,
recovery, coverage-waiver, baseline-ignore or administrative-closure authority.
Definition authoring alone neither proposes a real host policy for approval nor
authorizes installation, activation or cutover.

One permitted deterministic rule is "select the single registered tier stated
in the approved plan" when plan guards verify that tier covers the change.
Missing, multiple, unknown, or uncovered tiers fail closed; the policy cannot
silently choose a substitute.

For each eligible ordinary task, read the exact approved plan from the verified
source and check its project-local ID binding, version/digest, selected tier,
tier-definition digest, parameters, policy version, and authorization version.
Record a new policy decision and its stable source-snapshot identity atomically
with activation and audit. A separate human decision is not required per task
when the already approved deterministic rule matches exactly. An approved
Replit task plan may be a policy input only if its approved contents and
mapping to the local task can be verified by a real host adapter; a Replit
task number, plan title, or unverified claim of platform approval cannot
establish that binding. Unmatched/uncertain plans need a fresh applicable
approval or block.
Changed plans, tiers, tier definitions, parameters, or governing policy need a
new bound decision; never silently carry forward the prior authorization.

Tier changes, obligation removal, baseline widening, and policy changes require
a recorded authorized approval. When that route is unavailable, stop the mutation.
A caller-written `approved: true`, actor name, or command flag alone is not an
approval record. These checks are procedural: a local record cannot authenticate
the human or resist deliberate edits by an agent with write access.
The skill does not install a human review service or catalog-maintenance route.
If no approved local route exists for either action, leave it blocked rather
than constructing a draft approval or silently widening baseline authority.

The checked runner records the actual invocation, local task ID, plan and policy
versions, tier digest, snapshot, raw results, and artifact references. The
project-local checker cross-checks this record and rejects an ad-hoc run or a
manually supplied `PASS` label as required-tier evidence. It cannot prove result
authenticity against someone able to alter the runner, results, or checker.

Resolve supplied IDs and plans against the project-local task record and
namespace; another valid local task's plan is not interchangeable. Never infer
a task from the newest plan. This does not establish which Replit Agent task is
currently active or control its platform completion.

## Identity and single-source authorization

Reserve monotonically increasing local display IDs such as `TASK-001042` in a
transaction in one project-local namespace. Only expose a reservation after
commit. Keep permanent tombstones; committed IDs are never reused after
abandonment or terminal states. Import existing IDs with uniqueness checks.
Do not claim repository-wide uniqueness or coordination across independent
workspaces. Namespace plus UUID identifiers are an alternative to local
sequential display IDs.
A supplied Replit Agent task number is not authority to allocate, activate,
validate, or complete a project-local task; resolve the local record and its
approved plan for ordinary validation, or its explicit owner closure decision
for administrative completion, through the project coordinator.

One task row is authoritative:

```json
{
  "taskId": "TASK-001042",
  "projectNamespace": "configured-local-namespace",
  "status": "active",
  "planReference": "<host-plan-path-or-record-id>",
  "planVersion": 1,
  "planDigest": "<canonical-plan-content-digest>",
  "authorizedTier": "<registered-tier>",
  "tierDefinitionDigest": "<digest>",
  "parametersDigest": "<digest>",
  "policyVersion": "4.0",
  "authorizationVersion": 1,
  "suspended": false,
  "pendingChangeId": null,
  "completionMode": null,
  "closureDecisionReference": null,
  "validationAssessment": null
}
```

The example is not live authorization. Constrain enums and fields with runtime
validation. Preserve original tier and transitions in history, not duplicate live
allow/deny lists. Absence of an active authorized tier means deny.

Project per-tier status is a derived view: for an active, unsuspended task,
only the assigned registered tier is `ALLOWED`; all other registered tiers,
including newly added tiers, are `NOT ALLOWED`. Suspended and terminal tasks
are `NOT ALLOWED` everywhere. On activation and each permitted change, append
the evaluated per-tier status and registry version to the same transactional
audit event; it is a historical snapshot, never an independent permission list.

States: `draft`, `active`, `completed`, `failed`, `cancelled`.
Only active, unsuspended tasks may start required-tier runs. A pending change
does not authorize its target. Terminal records have no current authorized tier.
Never reopen terminal IDs; create a new linked task.
For completed records, distinguish `validated` from `owner_direction`
completion or equivalent unambiguous audit binding. Owner-directed closure
retains the actual validation assessment and unresolved obligations.
Existing completed records are not passes solely because their mode is absent.
An unsuccessful validation run does not automatically terminate its task: keep
the task active for authorized investigation and repair. Terminal failure is a
separate explicit lifecycle decision.

## Transactional lifecycle

Use transactional storage with uniqueness constraints and compare-and-swap on
authorization versions. SQLite can suit a single supported local coordinator;
multi-instance access needs storage/concurrency semantics appropriate to the host.
Do not rely on a JSON read-modify-write loop or network-filesystem assumptions.

Activation, amendments, tier moves, recovery, and terminal release commit their
new state AND audit event in the same transaction. On audit-write failure, roll
back the mutation. Validate proposed plan contents before publishing their version.
An approved scope/tier move updates plan, versioned authorization, one-tier
assignment, and derived audit snapshot atomically. A pending request cannot
allow the proposed tier; keep the old assignment if its coverage remains
adequate, otherwise suspend required-tier runs until review.
If the previously approved deterministic rule covers a proposed amendment,
run guards and record a fresh policy decision against its exact new plan and
tier bindings; otherwise require a fresh applicable approval. Approval of
the original plan does not approve a different version or tier definition.

Store the canonical approved plan content/digest with the transaction. A tracked
plan file is the working projection: execution must match its version and
semantic content to the approved record.
If file projection and database commit cannot be atomic, execution stays suspended
until projection verification succeeds. An interrupted projection never creates
permission to run a partially applied plan.

Compare-and-swap prevents stale or duplicate approvals from applying twice.
Use idempotency keys for retried operations. Do not silently heal corruption.
An authorized repair identifies the prior state, intended state, reason, evidence,
and actor; it cannot secretly change tiers or authorize terminal tasks.

## Separate authorization from run snapshots

Authorization binds approved obligations, not a frozen pre-edit code snapshot.
Each run captures a separate content manifest representing the files actually
executed. Relevant changes invalidate prior results, not permission to rerun
the same authorized tier within scope.

Include tracked files, relevant untracked/generated inputs, dependency lockfiles
and actual dependency/runtime identity, configuration, fixtures, and migration
state. Do not record secrets; record safe versions or non-secret identifiers.
Document exclusions such as logs and report outputs
so recording a run does not invalidate itself.

Prefer an isolated immutable run snapshot. For shared-worktree execution, coordinate
all writers and verify contents before/after the run; hashes alone cannot rule out
mid-run edits that were reverted. Without isolation or effective coordination,
report snapshot integrity as unknown and reject completion evidence.

Record external service/DB fixture identity and reset policy when tests depend on
them. A code hash does not establish external-state equivalence. Unknown relevant
environment equivalence blocks provenance claims.

Completion compares the required run against the final input manifest. Default to
rerunning on changes. A narrow documented policy may ignore proven irrelevant
changes; it must not accept the agent's unsupported assertion of irrelevance.
Demonstrate how relevant writers participate in an effective lock or equivalent
isolation. Under that coordination, check the final manifest, assess complete
evidence, and commit the terminal transition before releasing writer and
authorization protection, so an edit cannot slip between acceptance and
completion. A coordinator-only database lock that does not coordinate relevant
file writers is insufficient. If the host cannot establish this coordination,
deny local completion and do not activate the new ordinary-task route at cutover.
For a mutable shared worktree, implement and verify a file-writer coordination
adapter used by participating writers; an isolated immutable final snapshot is
an alternative only when the accepted task state is actually bound to it and
the mutable projection cannot silently diverge during the terminal decision.
An [optional POSIX writer-lock reference](adapters/posix-writer-lock/README.md)
includes code, tests, and a host checklist. Use it only where its filesystem
and process assumptions are verified; do not treat bundling or primitive tests
as host integration. Hosts may implement another suitable adapter instead.
This checked workflow cannot prevent out-of-band edits by an agent with shell
and write access.

## Tier registry and checked execution

Every finite launch additionally follows [validation-budgets.md](validation-budgets.md):
actual finite limits on all entry points, independently approved dispatch budgets,
shared parent/attempt accounting, finite tests/hooks and independent transitive
outer supervision. Expected short duration or skipped serialization exempts none.
Direct scripts inherit no registry deadline and cannot substitute for the real
checked required-tier route when governance is verified ACTIVE. Verified INACTIVE
uses existing host policy and equivalent finite supervision; UNKNOWN blocks.
Preserve independent caller authority/metadata
compatibility; unavailable supervision is a reported blocker, not an exemption
or permission to migrate existing host callers during skill-only authoring.

Use one registry for scaffold, guards, runner, and completion checker. Each tier
defines argv-based commands, root/working directory, required steps, dependencies,
permitted parameters/environment and required configuration inputs, each required
input's verified source and validation rule, secret-handling classification, diagnostics, timeouts,
reports, discovery expectations, and coverage. Record the expected command
environment at the right boundary: a checked tier, an independent caller, or
both, without turning task metadata into a new caller requirement. Pin its
canonical digest.
Preserve the host's existing registered commands, resource locks, report adapters,
and baseline catalog during migration unless separately authorized to change them.

### Agent initiation and transitive execution scope

Authorization limits execution, not merely accepted evidence. For verified ACTIVE task work,
the Agent may initiate its one assigned tier only through the checked runner.
Every other Agent-initiated validation operation requires an applicable registered,
bounded non-tier capability. Do not launch, request, trigger, delegate, or partition
another tier under an independent/diagnostic/ad-hoc label. A separate non-tier
policy cannot grant a second active tier; a different tier needs the normal
approved atomic transition or a genuinely separate authorized operation.

Pin a reviewable transitive execution manifest with the tier-definition digest:
approved argv/working directories, wrappers, package/build pre/post hooks, nested
scripts, dependencies, test discovery/config branches, subprocess/worker entry
points, and scheduler or remote workflow targets when used. Include target versions,
permitted arguments/environment, expected scope, reports, and relevant locks.
Do not require a particular build tool or process-tracing implementation.
An approved tier may reuse shared checks or an explicitly approved composition
of other groups; that does not authorize their unrestricted dispatchers or a
second task assignment. Expanding composition requires policy review and renewed
affected authorization, not preservation of the tier name alone.

Before launch, resolve the actual execution graph against this manifest and
reject unknown, drifted, undeclared, or argument/config-selected expansion before
the affected command starts. For dynamic dispatch, constrain branches through
verified host adapters or isolation; if scope cannot be established, block that
route rather than executing it to discover what it does. Observe actual steps
and compare them with the approved scope; unexpected execution is a violation,
not acceptable evidence merely because its output is discarded. Use authorized
recovery to stop or quarantine task-owned work safely; report actual launches and
effects. Do not claim that local code can prevent arbitrary shell/network bypass.

Delegation does not create authority. Pass the exact local task/plan versions,
authorization version, purpose, permitted transitive scope/parameters, shared
budget reference, and report route to each child, subagent, background job, or
scheduler request. Verify them at each cooperative dispatch boundary; workers
cannot activate another task, select another tier, drop bindings, or refill
budgets to validate the parent. Unverifiable forwarding blocks the route.
Register and reconcile task-owned child lifetimes with the run lease so parent
exit, timeout, cancellation, or tier transition cannot hide continuing work.
Preserve existing unrelated independent callers and their safety/access policy.

Caller origin is a semantic responsibility, not an agent-supplied security label.
Inventory the actual initiator/trigger and governing authority where observable;
an Agent invoking a shared script or requesting a CI job remains its initiator.
Genuinely independent platform/CI/local caller execution retains its own existing
authority and need not acquire a task ID. Do not require new caller flags or
modify platform-owned dispatch to enforce this contract. Where a shared direct
route cannot verify origin, report that cooperative enforcement limitation;
ambiguity is not permission for the task Agent to launch extra checks.
Apply the monitoring reference's atomic single-flight and shared-resource guards.
Its event trail distinguishes requests/denials from confirmed execution and retains
initiator, authority, parent lifetime, overlap, reason, and coverage uncertainty.

### Required build/runtime configuration and ports

Before invoking a command, resolve every required configuration value from a
verified source and validate it against the command's actual contract. This
includes build-time values as well as values consumed by a running service.
Include any necessary inputs such as `PORT` or `BASE_PATH` only when the discovered
host requires them; these are examples, not universal inputs or suggested values.
Classify required values as non-secret or secret. Validate secret availability
without printing, exporting to reports, or including its contents in manifests,
digests, errors, or task logs. A secure reference or redacted presence/status is
not the secret itself.

Resolve stable deployment configuration, such as a build's `BASE_PATH`, from a
verified project or deployment setting and check its format and applicability.
Do not silently substitute `/`, an empty value, or an invented build target
when the configured value is missing or invalid. If no authoritative source or
default can be verified, report the affected command `BLOCKED` before launch;
do not misattribute a setup defect to its product code.

For a command that requires a port, first discover the existing registered
listener/build convention, range, and allocation/serialization mechanism.
Preserve a verified fixed project port where the command contract requires it;
report conflicts through the authorized host recovery path rather than
silently changing callers or deployment bindings. If the host requires dynamic
allocation and no fixed project port exists, assign a valid port from the
verified host range/allocator; do not guess a familiar default or silently
change an existing fixed binding. Pass it as a validated environment value to
the owning command. Coordinate the reservation with concurrent checked and
independent callers and hold or hand off ownership through the consumer's
documented lifecycle. A check-then-release free-port probe does not establish a
race-free reservation; if the host cannot safely allocate, coordinate, or hand
off a required port, block before execution instead of claiming availability.

Distinguish socket-listener ports from values used only to configure generated
build output. If a build only embeds a port/URL and does not bind that socket,
use the verified stable build/deployment value; do not manufacture an ephemeral
listener endpoint. Do not hard-code a universal numeric port, assume the
container/deployment supplies one, run invasive scans, kill processes, or
invent defaults. Record non-secret configuration provenance/version and safe
resolved identifiers with run evidence, not credentials. Integrate preflight
with the existing checked authorization gate without treating configuration
failure as an owned product failure or dropping the independent-caller
compatibility contract.

### Independent-caller compatibility

Inventory actual independent validation callers, their unchanged command strings,
arguments/environment, safety/access requirements, and expected reports. These
may be platform final checks, CI, a local build/test tool, a scheduler, or another
host integration; none is assumed present. Distinguish their existing execution
from a request for checked task-tier validation. No fixed tier names, environment
variable, framework, provider, or command layout is required.

Enforce task authorization in the explicit checked entry point or an equivalent
verified interface boundary. Shared underlying checks must remain callable by
existing independent callers without new task metadata, plan files, or caller
changes. Preserve their command strings, checks, coverage, timeouts, resource
locks, reports, heavy-suite serialization where present, and shared workflow/
Run-button definitions unless separately authorized to change them. Independent
execution is not a newly authorized tier or a replacement task lifecycle.
The compatibility guarantee does not authorize discretionary task-Agent launches
through these routes. Initiating or deliberately broadening local, delegated,
scheduled, platform, or CI checks for the task follows the execution-scope rules
above; omitting metadata or discarding results cannot make that execution independent.

Checked execution must resolve and verify the exact task/namespace, approved
plan/version/digest, authorized tier/definition, and applicable current
authorization before launching validation. Provide a verified native-argument or
local-interface plan-input route that works without an environment variable;
additional environment/file adapters such as TASK_PLAN_FILE are optional.
Define input precedence; reject conflicting supplied
bindings rather than silently picking a different plan. Never infer authorization
or mode from variable presence/absence, a caller label, direct tier selection,
or a bypass flag. An invalid checked request fails before launch; it cannot fall
back to independent execution. Verified ACTIVE task agents still perform checked
validation; verified INACTIVE uses its actual bounded host policy, UNKNOWN blocks.

Independent results retain their actual executed steps, exit statuses, failures,
missing reports, and incomplete states. Keep their origin/purpose distinguishable
from checked run records; do not create checked leases, authorization decisions,
or required-tier evidence merely because an independent command ran or passed.
The local task-evidence acceptance boundary rejects independent results relabeled,
copied, or attached as required-tier evidence. Existing independent checks with
their own obligations retain those obligations; they cannot replace the task's
required checked run. No platform-managed completion result is imported.
This is procedural evidence separation, not resistance to deliberate local forgery.

Compatibility is not a new ordinary-task route or enforcement cutover. If the
host's verified plan-file interface is the sole approved route for ordinary task
validation, leave that route, its exact plan bindings, and its change controls
intact until the separately approved cutover. Keep independent callers working
through their existing independent invocations; do not demand a task plan for
them and do not convert their outputs into task evidence. Conversely, do not
invoke other registered tiers under a plan approved for only one tier, or use
independent checks to finish a task whose required-tier validation is blocked.
This compatibility boundary does not waive separately applicable approval for
an actual wrapper, runner, checker, or authorization-policy change.

Regression verification must show existing independent invocations actually
execute their intended checks without the optional variable, supported checked
inputs work, invalid checked requests launch no checks, and evidence separation
holds on both passing and failing/incomplete outcomes. Use authorized safe host
checks and retain real reports; mocks cannot prove a platform caller works.
Unavailable safe host execution blocks the compatibility-readiness claim, not
permission to invent results or weaken authorization. Attribute an installation-
introduced caller rejection to the integration change when provenance supports
that cause, not automatically to an unrelated product baseline.

For an existing host, a scoped compatibility repair does not itself require a
new lifecycle or a fresh enforcement cutover. It still follows the existing
approval/versioning contract for changed wrappers, runner, or checker; initial
installation and actual authority replacements retain the bootstrap/cutover rules.
When an original package is being installed/confirmed separately, preserve its
pinned source and installation-fidelity evidence, then record the authorized
amendment as a distinct revision/change. Do not silently fold the amendment into
the original spec or claim original-source confirmation against a revised package.

Treat the registry, runner, checker, and command wrappers as governing policy.
Compare the actual versions executed, including indirect script entry points,
with the approved local versions. If they changed, require separate approval
before accepting a run for the same task. This detects unapproved changes when
the checked tooling is used; an agent can still bypass or edit local checks.

Abstract interface to implement in the host's native tooling, not a command to
copy into a shell:

```text
# ACTIVE governance only; INACTIVE uses verified host policy, UNKNOWN blocks.
activate(taskId, planReference)
  -> authorizationVersion, selectedTier, boundDecisionReference
run(taskId, planReference, purpose = required_tier_validation)
  -> runId, rawResults, evidenceReferences
```

Adapt language and command to the host. Under verified ACTIVE governance,
ordinary-task tooling must provide
checked activation and checked required-tier execution with the supplied
local ID and exact plan; subsequent reruns use the existing authorization,
not a repeated activation. A draft/review-request-only CLI is not an
ordinary-task route, and direct tier commands are not checked task evidence.
In the verified ACTIVE task-agent flow, invoke local activation as Draft/Plan enters
Active, then do the work and use the checked runner on the resulting inputs.
Repeat checked validation after relevant edits; an activation-time pass cannot
validate later work. No platform Active-state event subscription or task-ID
mapping is assumed: without a verified adapter, the task agent must call the
local route explicitly and report if it could not. Never infer local activation
solely from platform status.
Until both operations exist and pass live local-ID acceptance tests, keep
ACTIVE ordinary validation blocked. Verified INACTIVE uses verified existing host
policy and finite equivalents; UNKNOWN blocks, never proves inactivity.
Never recommend a command before it exists and
passes checks. Resolve the tier from the task record; if a requested tier is
supplied, reject any mismatch rather than overriding the record.

Before an ACTIVE checked-tier launch (INACTIVE uses verified host equivalents;
UNKNOWN blocks dependent dispatch):

1. Resolve local project identity and plan reference. Reject traversal and
   escaping symlinks. Reject another task's plan and mismatched plan
   content/identity.
2. Validate active state, suspension, approval, version, tier digest, parameters,
   policy, referenced ignore eligibility, and absence of unresolved recovery.
   Expired records cannot authorize ignores but do not erase owned repair obligations.
   Validate the transitive scope and any auxiliary command/selector allowlist,
   policy applicability, cumulative budget, and inherited dispatch bindings.
   Verify monitor/log health and any queued request against current bindings.
3. Acquire a run lease against the current authorization version, atomically
   recording the run and its audit event. Coordinate with transition and host
   resource/writer locks and reserve applicable shared auxiliary budgets.
   Acquire the atomic task/operation single-flight slot; handle duplicate/busy
   requests without another launch. Persist decision/intent and its registered
   durable file record before dispatch through the monitoring contract.
4. Capture the tested snapshot/environment and launch only approved argv.

Before every step also verify effective queue/step/startup/teardown/test/hook/
cleanup/evidence limits and remaining original parent/attempt time against the
current independently approved source. Reserve cleanup, reject invalid/enlarged
caller values, and dispatch nothing when the remainder cannot cover it. All
spawned work retains bounded supervision on cancellation/journal failure;
late zero, unknown descendants and incomplete storage never pass.
Journal the private workload-gate identity and obtain independent watchdog
registration before dispatch; failed registration means no user work. Verify
owner stall/death, original-group timeout and watchdog-loss handling on actual
callers, with bounded exact whole-tree cleanup and retained uncertainty.
Port Authority recoveryRequired:true/unfinalized/missing-field leases retain
exclusion after local quiescence. Only compatible finalized false may enter
ordinary known-quiescent recovery; unknown authoritative claim/write outcomes
still require exact separately approved acknowledged recovery. No age-based
unlink, false insertion or sidecar deletion; see the staging/lifecycle reference.

Do not interpolate untrusted strings into a shell command. Validate diagnostic
selectors and neutralize coverage-reducing environment/config overrides without
blindly removing runtime variables the host needs. Validate report paths and bound
output; truncated/missing machine reports cannot substantiate acceptance.

Collect each required step's real status and reports, including named
not-reached steps. Reject required runs if a report adapter is absent or
incomplete. Continue independent steps where safe even after an ignored
failure; never conceal unexecuted obligations.
Return nonzero for raw failing runs; the completion checker separately records
whether policy accepts their accounted-for failures.

All project-local checked entry points delegate to this runner. Unmanaged
execution is not accepted by the local checker, but cannot be prevented.
Replit Workflows or other schedulers may start checked commands but do not
establish plan approval. Preserve task/run IDs, actual tested inputs and
environment, raw per-step results, and the subsequent local completion
decision separately from the orchestration result.

## Planning, diagnostics, maintenance, and completion

Run purposes are explicit. Tier-specific planning/diagnostic/completion rules
below govern verified ACTIVE routes; INACTIVE retains its verified host policy:

| Purpose | Authorization | Can satisfy required task validation? |
|---|---|---|
| Planning guards | Bounded pre-activation policy | No |
| Baseline discovery | Registered planning policy | No |
| Required tier | Active task authorization | Yes |
| Verified INACTIVE host validation | Existing independently verified host policy and equivalent finite supervisor | Only as that host policy actually accepts |
| Diagnostic retry | Current tier's diagnostic capability | No |
| Provenance comparison | Registered comparison capability | No |
| Additional project-local check | Separate explicit local check policy | Only its own obligation |
| Maintenance/bootstrap | Explicit bounded maintenance approval | No |
| Runtime process reclaim | Authentic exact disruption approval plus live host attestation and atomic checked claim | No |
| Inert staging / isolated fixtures | Actual applicable staging/test permission, preserving any task-wide gates | No |
| Retained-error recovery | Separate bounded exact recovery approval, original commit/contender reconciliation and durable acknowledgement | No |

Planning guards operate on a reserved draft before activation, resolving the
bootstrap deadlock. They cannot invoke arbitrary tests. Baseline discovery is
similarly narrow and records the pre-edit snapshot without activating work.

Diagnostic retries remain subordinate to the current tier; they are not filtered
substitutes for complete assigned-tier validation. Comparison runs use isolated verified earlier
contents without resetting the user's working tree or touching production data.

For every planning, discovery, diagnostic, comparison, additional-check, and
maintenance/bootstrap capability, record the actual approval/policy source,
version, exact applicable subject/scope, command and selector allowlist,
transitive execution manifest, environment/safety constraints, and finite
per-attempt plus cumulative limits. An additional check authorizes only its named
non-tier obligation. No generic "extra confidence", arbitrary command passthrough,
all-tier loop, or reconstruction of another tier through split commands is allowed.
Planning/maintenance policies apply to their approved draft/operation identity,
not a fabricated active task. Existing external caller obligations keep their own
policy; this auxiliary accounting does not add task metadata to them.

Use host-defined finite limits for attempts, coverage, elapsed time, and resources
where applicable; count across purposes, equivalent paths, child workers, and
concurrent launches for the same task/approved operation. Keep required-tier
reruns distinct from auxiliary budgets: necessary same-tier validation after
relevant edits remains authorized under its existing per-run limits.
Bind diagnostic episodes to canonical failure identity and actual snapshots.
Exactly three isolation retries are required when supported and safely authorized;
inadequate remaining capacity blocks the dependent classification, not an
automatic budget increase or a claim that fewer attempts meet the rule.
Comparison/equivalent diagnostics may use only their pinned permitted scope;
unknown selectors or broader/nested tier launches fail before launch.
A whole assigned-tier comparison on an earlier snapshot is allowed only when
explicitly registered and bounded; verified ACTIVE current-snapshot whole-tier
reruns use the checked required-tier purpose. INACTIVE uses verified bounded host
policy; UNKNOWN blocks. Neither diagnostic route becomes completion evidence.

Reserve attempts and resource allowances atomically before cooperative dispatch,
including concurrent children; record actual consumption and outcomes. Started
failed, crashed, skipped, zero-test, or cancelled attempts still consume their
attempt allowance. A denial before launch consumes no attempt; release unused
reservations only after confirmed non-launch or safe run reconciliation.
Retain counters across restarts, wrapper/run IDs, purpose changes, equivalent
diagnostic routes, and authorization amendments. Changed snapshots may create
new episodes only under the registered policy and never reset cumulative limits.
No unbounded retries, renamed-failure resets, or new-task grants to evade the
parent's limits. Missing safe accounting or exhaustion blocks further auxiliary
launches; renewal requires the existing applicable approval route with exact
new limits and retained consumption/history. Do not invent a renewal authority.

For verified ACTIVE governance, the local completion checker is required for validated
completion. Its result controls that local validation decision only.
Explicit task-scoped owner direction may instead use the separate
[administrative closure contract](owner-directed-closure.md); it requires an
honest owner decision and safe terminal transaction, not passing validation.
Independent platform-managed checks may still run, and Replit Agent may
move its platform task to Ready or Done without invoking this checker; do not
claim that a local test proves otherwise or modify platform-owned dispatch as
a workaround.
That platform limitation grants no task-Agent permission to initiate additional
tiers. Follow the execution-scope contract and report independent outcomes separately.
Return the local validation outcome and evidence for the user's normal
review/merge-or-dismiss decision. Do not auto-merge or represent a failing or
blocked local run as validation success. Project-local tooling cannot force
the platform to wait before offering that decision.
Project code and CLI must not call, request, depend on, or present a result
from platform-managed completion. Retire an existing managed-completion CLI
operation during an approved migration; do not replace it with a hidden fallback.
Existing direct tier commands remain available to genuinely independent callers
under their existing authority, but are not blanket task-Agent diagnostics.
For task work, diagnostic execution needs a registered bounded capability;
whole current-snapshot tier runs under verified ACTIVE governance use the assigned
tier's checked route; INACTIVE uses verified host equivalents, UNKNOWN blocks. Direct
passes cannot become local task completion evidence.
This project-code/CLI restriction does not prohibit genuinely available
Agent-native task operations on explicit owner direction. Do not proxy those
operations through local tools. The reference governs authority, independent
local/platform outcomes, readback, and truthful partial-result reporting.

## Run evidence, baseline policy, and completion

Runs contain task/run IDs, purpose, authorization/plan/tier versions, snapshot and
environment identity, actual timestamps, per-step raw statuses, artifacts/digests,
discovery counts, and policy assessment. Preserve failures individually.
Record classification lineage and original corroboration sources with immutable
bindings. Preserve distinct missing-evidence states and dependency-aware retention;
health inspections are read-only and exports never carry activation authority.

Baseline policy defines failure matching, permitted volatile-field normalization,
environment applicability, authoritative clock, expiry boundary, reviewer authority,
and renewal/revocation. Preserve meaningful assertion, exception, endpoint, variant,
and stack distinctions. Ambiguous matches fail closed.
If no verified project-local catalog-maintenance approval route exists, do not
promote new baselines; task-local evidence cannot create catalog authority.

**Uncatalogued pre-existing failure decision:** classification and acceptance are
separate. Default-deny: provenance alone never authorizes completion or an ignore.
An exact active catalog ignore remains eligible under the existing catalog policy.
Without one, task-local acceptance is possible only through a separately approved
host acceptance policy and its current, independently verifiable pinned decision.
Use the existing applicable approval route (including actor-optional Replit events);
do not invent a new actor roster, second owner-closure approval or catalog service.
Bind the decision to exact task/plan/run, failure identity/signature, applicable
environment and tested snapshot, provenance lineage, policy/authorization versions,
scope, expiry/revocation and decision source/reference. Evaluate applicability
again at completion; broad narrative approval, an agent-written flag, copied
provenance or an expired/revoked/mismatched decision cannot authorize acceptance.
The policy must explicitly permit this failure kind and require verified direct
earlier evidence plus independent corroboration, complete assigned-tier results,
all required reports and satisfied owned repairs. Missing/unknown policy,
decision or evidence leaves the failure non-accepted and local completion blocked.
Do not waive typecheck policy, harness/incomplete results, unperformed checks or
unresolved regressions. Retain the raw failure and assess eligible exceptions as
`ACCEPTABLE_WITH_IGNORED_FAILURES`, never clean `PASS`.
This decision neither promotes a catalog record nor grants another tier, modifies
repair ownership, replenishes budgets, or authorizes another task/run. Catalog
absence remains optional for unrelated work and owner-directed closure; an approved
task-local policy may allow this specific completion without catalog promotion.
These are host requirements, not an installed acceptance service.

Check ignore eligibility at planning, activation, launch, classification, and
completion. Default: expiry/revocation before completion invalidates the ignore;
request separate review rather than self-renewing it. Repair ownership survives
expiry. Historical/non-active records may corroborate but never directly authorize
an ignore. Promotion is separate maintenance, never an automatic task side effect.

The checker evaluates complete evidence, exact applicable baseline matches,
provenance, fixed owned obligations, and any required independently verifiable
project checks. It never imports a platform-managed completion result.
It cannot trust a run's agent-supplied `PASS` label. A procedural human review may
be needed for semantic provenance; record the reviewer and mode honestly.

All unknown statuses, missing results, or unaccounted failures block validation success.
Preserve raw exit statuses even when assessment is acceptable.
Owner-directed administrative completion is not validation success; its status
and recorded mode cannot satisfy validation/delivery prerequisites without
actual evidence. Implement the reference's separate local transition and
reader semantics before claiming local owner-closure capability.

## Recovery and retention

Run leases include coordinator/process identity, start time, heartbeat, and version.
A timed-out poll or expired heartbeat does not prove process death. Confirm stop,
cancel safely, or quarantine unresolved runs before authorizing replacement.
Coordinate process groups carefully; never indiscriminately kill unrelated services.
An already dispatched authorized workload retains its approved transitive
supervision/cancellation/termination despite admission expiry. New work or reclaim
of unrelated processes needs current authority; expired/revoked cleanup grants
never permit new signals. Apply the reclaim contract to exact runtime reclaim,
retaining exclusion on unknown claims or uncertain/surviving workload and using
only separately authorized bounded recovery.

Prevent authorization transitions racing with a launch or active run. Wait, safely
cancel, or suspend; do not retroactively make stale runs acceptable.
Terminal cleanup revokes active permission and retains tombstones/history.
Failure/cancellation cleanup does not require passing validation.

Audit mutations, denied launches, runs, classifications, approvals, recovery, and
completion. Sanitize agent-supplied text, bound logs, and exclude secrets.
Define retention/backups and access controls; never delete ID tombstones during
routine log pruning. Workflow-local logs are not tamper-evident evidence.
Apply the evidence contract's protected-artifact dependencies and invalidation
rules before authorized pruning. Index/export/health views must distinguish
validated completion from owner direction and visibly retain unresolved work.