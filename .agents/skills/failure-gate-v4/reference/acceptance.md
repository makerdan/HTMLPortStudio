# Failure Gate v4 — acceptance and confirmation

These are required executable test cases for a host implementation. This document
is not evidence that the implementation or tests already exist.

## Before changing a host

Record existing commands, observed failures, and unavailable checks. Use the approved
bootstrap validation contract during initial installation; do not require the
uninstalled gate to validate itself. Preserve canonical local and CI coverage.
Do not trigger or modify remote CI without appropriate authorization.

Material implementation changes require regression protection describing the bug
or contract risk, the proving check, and post-change verification. Use the host's
existing format; no named companion skill is mandatory. Do not fix unrelated
baseline failures. Record raw failures and ownership separately.

Covering every tier in this matrix does not authorize running every real tier.
Use pinned definition inspection and isolated instrumented fixtures for unassigned
dispatch cases, recording attempted and actually launched commands separately.
Live checks must fit the approved selected tier or an explicit bounded non-tier
verification policy; other-tier live runs need a separately authorized operation
or approved atomic tier change. Do not exercise unauthorized production commands
to prove denial. Fixtures cannot replace required live independent-caller,
restore, or cutover evidence; unavailable proof blocks the affected readiness claim.

## Required host tests

Verify policy applicability before this matrix: ACTIVE requires checked task/plan
tiers and separately authorized diagnostics; INACTIVE uses verified existing host
policy with equivalent finite supervision, not imaginary APIs; UNKNOWN blocks
dependent assertions. The task/tier implementation cases below concern ACTIVE or
separately approved installation. An invalid explicit checked request never falls
back in any state. Also require the full
[staging/lifecycle matrix](staging-and-lifecycle.md), including separate fixture
PASSED/FAILED/BLOCKED/NOT_RUN and actual host acceptance; absence is not “not applicable.”

Every finite validation route additionally requires the full
[finite-budget acceptance matrix](validation-budgets.md), including direct/fast
entry points, tests/hooks, independent outer supervision and cumulative exhaustion.
The bundled `tests/test_validation_budgets.py` contains labelled policy simulations
and conditional local fixture watchdog checks, not real registry/host activation.

Runtime cleanup/reclaim additionally requires the complete
[runtime reclaim acceptance matrix](runtime-reclaim.md). Execute its real checked
host cases only under separately approved safe integration scope. The bundled
`tests/test_runtime_reclaim_contract.py` is a simulation suite, not proof of
protected authorization, independent attestation or deployed activation.

| Area | Prove |
|---|---|
| Policy states | Verified ACTIVE uses checked tiers/separate diagnostics; verified INACTIVE retains actual host policy/bounds; UNKNOWN blocks. Missing route/file/draft does not establish inactivity; explicit checked rejection has no fallback. |
| Staging states | Per-control STAGED is inert canonical placement under applicable permission; NON_RECLAIM_VERIFIED and LIVE_RECLAIM_ENABLED need genuine scoped evidence and two real authorized caller runs. Fixtures never activate or complete installation. |
| Task-wide staging gate | A task gating every edit/test on missing authority stays blocked until authorized revision. Missing reclaim alone does not block unrelated permitted staging/fixtures; labels do not waive task gates/coverage/repairs. |
| Implicit reclaim | Inspect aliases/pre/post/startup dependencies before non-reclaim activation; dependent reclaim or attested development admission still blocks without real capability. Preserve active callers and unresolved unsafe legacy risk. |
| Retained lifecycle | Mandatory boolean recoveryRequired:true from reservation, false only on healthy verified release. True/unfinalized/missing-field leases block ordinary next caller after local quiescence even without a sidecar. Compatible finalized false still needs known quiescence and no authoritative uncertainty. |
| Exact recovery | Separate bounded authentic approval binds task/plan/run/operation, host/root/boot, exact lease/token/incarnations and incident; reconcile contenders/unknown commits and acknowledge durable outcome before new work. No false insertion/unlink/retry/age-based revision refresh. |
| Gate and watchdog | Journal private gate and independently register before user dispatch; missing/failed registration prevents it. Owner stall/death/original-group timeout and watchdog loss require bounded exact owned-tree proof and retained error/exclusion. |
| Manifest shapes | Validate untrusted envelopes/members before access; null/primitive/array/malformed/duplicate identities and invalid bindings yield structured INVALID/UNKNOWN, no TypeError, intent or delivery, listeners preserved. |
| Portability | No example path, Node command, package manager, OS, framework, database, tier name, or companion skill is required implicitly. |
| Project adapters | Verify actual local mappings for task/plan, execution, storage, evidence, recorded approvals, and local completion. Do not claim Agent platform task identity. |
| Missing optional features | Absent memory/history/catalog does not block otherwise valid execution or create invented ignore authority. |
| Missing governance | No human review or catalog-maintenance service is assumed; absent required local approval blocks the change, and absent catalog governance blocks promotion. |
| No existing tiers/tests | Installation registers only approved real checks; manual-only evidence is labeled honestly and missing required checks remain blocked. |
| Safe discovery/retries | Pre-edit observations and repeated checks respect host-specific side effects, hardware, production, and external-service authorization. |
| Allocation | Concurrent local reservations are unique; committed IDs survive restart and are never reused after cancellation or deletion attempts. |
| Namespace | Independent workspaces do not claim shared sequential allocation; mismatched local project identities and bare Replit Agent task numbers are denied as local authorization. |
| Bootstrap | Draft plan guards and registered baseline discovery work before activation; neither route can launch arbitrary tiers or satisfy completion. |
| Activation | A verified explicit Replit plan-approval event authorizes without an approver identity or roster; the recorded decision binds one exact local ID, approved durable plan/version/digest, the single declared registered tier and definition digest, parameters, and policy/authorization versions. Other hosts may use a configured human-review route. A previously approved deterministic policy matches precise scope or activation blocks. |
| Once-approved policy | An owner-approved, versioned deterministic policy authorizes multiple exactly matching approved plans without per-task human review; its approval source, eligibility rule, fixed tier selection, parameters, and policy version are verified. A policy selecting the plan-stated tier accepts only one registered tier with guard-verified coverage. An unapproved, self-modified, out-of-scope, or unverifiable policy cannot activate a task. |
| Approved plan input | An approved Replit task plan is usable only when its exact contents and binding to the project-local ID are verified; a bare platform task number, plan title, or purported approval is not local authority. |
| New bound decision | Every activation/amendment records the exact task ID, plan version/digest, selected tier and definition digest, parameters, policy/authorization versions, and decision reference. Changing any governing binding invalidates the old decision; a matching policy must issue a fresh decision or fresh applicable approval is needed. |
| Approval event source | Demonstrate a real trusted source for the explicit Replit plan-approval action or another configured decision/policy route. Missing/inaccessible sources, agent-authored claims, and caller-only references cannot activate tasks. A valid Replit event with no approver identity succeeds; adding a fabricated actor cannot make an invalid event succeed. |
| Event semantics and reuse | Command approval, Active/Ready status, and later merge/apply actions do not count as plan approval. Wrong-plan, changed-tier, drifted-policy, and wrong-local-ID events are rejected; one event cannot bind two local IDs. Same-task retries obey idempotency/CAS without granting a new assignment. |
| Decision source stability | Mutate working-tree captured event/decision evidence during activation: the coordinator uses pinned versioned evidence and governing policy, retains its reference atomically, and denies missing/inconsistent snapshots. A commit preserves verified captured contents but cannot prove an approval occurred. A separate identity-based human route pins its reviewer authority with its decision; the Replit-event route does not require a roster. |
| Tier lock | Correct tier runs; lighter/heavier/unknown tiers, missing IDs, wrong plans, escaping paths, and stale digests fail before command launch. |
| Agent initiation boundary | In instrumented host routes, a task Agent's request for another tier is denied before launch, whether called independent, diagnostic, ad hoc, non-evidence, or invoked without task metadata. Verify Agent guidance covers uncontrolled direct routes; do not claim local tools can identify or prevent arbitrary shell bypass. |
| Independent origin preservation | A genuine existing platform, CI, or local independent caller still uses its unchanged invocation and own policy without task metadata. A task Agent launching that same script or deliberately requesting extra CI checks gains no independent authority; where origin is unverifiable, report the limitation rather than inventing authentication. |
| Transitive execution manifest | Pin and verify wrappers, hooks, nested scripts, discovery/config branches, workers, and scheduler/remote targets. An undeclared broader-tier dispatch, unknown branch, drifted target, or argument/env expansion is denied before the affected command launches. |
| Approved shared composition | An explicitly approved selected-tier composition containing shared checks remains executable with its existing coverage and locks; sharing does not permit a different unrestricted dispatcher. Composition expansion requires renewed applicable authorization. |
| Actual scope violation | An instrumented unexpected child launch produces a violation, honest actual-step report, and authorized stop/quarantine handling, not acceptance by dropping its output. Fixtures do not claim to prevent arbitrary out-of-band execution. |
| Delegated authority | Children, subagents, background jobs, and scheduler requests retain exact task/plan/authorization bindings, purpose, allowlists, shared budgets, reports, and lease ownership. Dropped/stale/borrowed bindings or new grants for the parent's validation deny cooperative dispatch; continuing children cannot disappear at parent exit/timeout/tier transition. |
| Direct diagnostic restriction | No direct whole-tier command is blanket diagnostic permission. Verified ACTIVE current-snapshot tiers use the checked route; INACTIVE uses verified bounded host policy; UNKNOWN blocks. Unknown selectors/unregistered diagnostic argv launch nothing; focused diagnostics cannot replace tier evidence. |
| Comparison scope | A verified earlier snapshot uses the registered bounded comparison commands without altering the working tree or production state. A whole assigned-tier comparison requires explicit bounded capability; another-tier or unapproved equivalent fallback is denied before launch. |
| Cumulative auxiliary budgets | Concurrent workers and cross-purpose/equivalent routes atomically reserve shared finite limits before launch. Denied non-launches use no attempt; started failed/crashed/skipped/zero-test/cancelled attempts consume it. No oversubscription or unlimited comparison chain is permitted. |
| Budget reset resistance | Restart, new wrapper/run IDs, renamed failures, purpose changes, snapshots, or authorization amendments do not reset retained cumulative consumption. New episodes follow policy; exhausted or unverifiable accounting blocks auxiliary launches. Explicit applicable renewal records new limits and prior history without self-approval. |
| Bounded separate policies | Planning/discovery, additional checks, and maintenance/bootstrap identify approval, exact scope, transitive allowlists, and finite budgets. They cannot grant a second active tier, reconstruct another tier through split commands, or use arbitrary passthrough. Additional checks satisfy only their named non-tier obligation. |
| Acceptance without tier sweep | All registry definitions and dispatch branches can be checked structurally and through instrumented fixtures without launching unassigned tiers. Live checks stay within selected-tier or bounded non-tier approval; missing necessary live evidence remains blocked, not fabricated or replaced by an all-tier loop. |
| Permitted reruns and transitions | Necessary authorized same-tier reruns after relevant edits remain available and do not consume auxiliary diagnostic budgets. A separately approved atomic tier change allows the new tier only after safe run reconciliation; a pending request never grants it. |
| Monitor installation mapping | Discover real hooks, persistent file path/schema, coverage, health, single-flight/resource interfaces, query access, and blind spots in the capability manifest/evidence index. No fake daemon, filename, runtime guarantee, task binding, or platform hook is claimed. |
| Single-flight race | Concurrent same-task top-level required/diagnostic/comparison/additional requests across cooperative routes yield at most one confirmed launch. Exact duplicates return the active run identity, not a new pass; different requests follow the configured busy/queue policy. |
| Queue revalidation | A bounded queue preserves request identity without treating queued work as running. Changed/revoked authorization, task cancellation, stale plan/inputs, exhausted budget, unsafe resources, or unhealthy logging prevents dispatch until applicable revalidation/approval succeeds. |
| Parallel substep preservation | Approved workers/steps inherit the parent slot, lease, scope, and bindings without reacquiring its exclusive slot. They can execute approved parallel work without deadlock; a nested standalone validation cannot evade the top-level guard. |
| Cross-task resource exclusion | Conflicting cooperating tasks cannot simultaneously own the same registered resource. Lock ordering and bounded waits avoid deadlock; unrelated independent callers retain existing invocations/policy. Uncoordinated external overlap is reported, not falsely claimed prevented. |
| Child lifetime and uncertain death | Parent exit, timeout, stale heartbeat, missing finish, restart, or PID reuse cannot release live/uncertain ownership. Verified child/job lifecycle or safe quarantine is required before replacement, tier move, or terminal release; unrelated processes are not killed. |
| Durable launch ordering | Decision/slot/lease/intent and file trail are safely persisted before managed dispatch. Missing monitor, log-write/flush failure, or unsafe coordination blocks launch without fallback. Denials and intents do not masquerade as confirmed starts. |
| Post-spawn logging failure | Simulate a confirmed launch followed by recording failure: retain ownership/original evidence, mark monitoring incomplete, block further managed dispatch, and reconcile safely. No fabricated finish/pass, early unlock, or discarded gap. |
| Crash-window reconciliation | Crash between intent, process/job spawn, start confirmation, projection, and finish: stable event IDs and verified lifecycle reconcile pending states. Recovery cannot silently duplicate a live run or assume an intent proves it started/stopped. |
| Event provenance and reasons | Record applicable task/run/parent/authority versions, actual scope, initiator source/confidence, declared reason, guard decision/reason code, raw sources, and explicit unknowns. Declared intent is not verified motive; process names/flags alone do not establish tier or independent origin. |
| Overlap classification | Distinguish different-tier unauthorized execution, duplicate same-tier top-level runs, independent overlap, and approved intra-run parallelism. Approved sequential tier changes and independently authorized distinct tasks are not tier violations; resource conflicts are separately assessed. |
| Clock and coverage uncertainty | Confirm overlap from reliable intervals/liveness, not unknown-skew cross-host timestamps, reordered events, or an unexplained missing finish. No events under partial coverage cannot prove no extra runs; uncertainty and original corroboration remain visible. |
| Concurrent structured file writes | Actual host appends/projection remain parseable and safely ordered under concurrent writers. Readers deduplicate event IDs without suppressing genuine repeated launches; incomplete tails/corrupt segments are visible, never silently rewritten as healthy. |
| Persistent log and rotation | Verify the actual file location outside .local persists through applicable restart/checkout/merge/redeploy boundaries; rotation retains discoverable segment references and protects dependent evidence. Missing durability proof blocks that readiness claim; ephemeral output is insufficient. |
| Log access and privacy | Bound/sanitize fields, redact secret argv/env and unrelated sensitive data, reject traversal/escaping symlink writes, and verify permissions/flush policy. Append-only is not called tamper-proof unless the host establishes stronger protection; live logs are not committed by default. |
| Automatic overlap lookup | With no user-supplied path, an overlap/duplicate/unauthorized-validation question discovers the indexed file and queries the relevant task/interval plus competing runs/rotated segments and accessible original sources. No activation or validation launch is required for lookup. |
| Missing-log investigation | Missing index/log, denied access, lost/pruned/corrupt history, unknown task/origin, or missing lifecycle boundaries yields scoped verified facts and explicit gaps. Agent does not guess a filename/cause, require pasted logs, claim unobserved coverage, or auto-install/repair. |
| Investigation and closure boundaries | Reading telemetry cannot trigger tiers/CI, kill processes, change policy/logs, invent authority, or create repair tasks. Logging outages do not add passing-test or second-approval conditions to owner closure; existing safe run handling still applies. |
| Independent caller execution | Each discovered independent caller's existing command executes its intended safe checks with TASK_PLAN_FILE or the host's equivalent optional adapter absent, without changing its command string or requiring new task metadata/caller changes. Prove real step execution, not merely a zero exit. Fixtures alone do not prove platform caller compatibility. |
| Compatibility without task-route cutover | When a plan-file route remains the sole approved ordinary-task route, independent checks work without that plan while the ordinary route, bindings, and change controls remain unchanged. No new lifecycle, cutover, or independent-to-task evidence conversion is introduced. |
| Checked plan input adapters | Supported native arguments, local interfaces, or optional environment/file adapters resolve the exact task/namespace, approved plan/version/digest, authorized tier/definition, and current authorization. A supported non-environment input works without TASK_PLAN_FILE; conflicting supplied bindings are rejected. |
| Checked rejection without fallback | Missing, wrong-task, malformed, stale, suspended, or unauthorized checked bindings launch no validation steps. Removing the variable or requesting a diagnostic/independent mode cannot downgrade a checked request or satisfy the ordinary task's checked-validation obligation. |
| Tier-specific plan scope | A plan authorized only for the fast tier cannot be supplied to standard, full, or heavy checked runs. Independent platform-final checks remain independent; they do not authorize those checked runs or make an incompletely validated task complete. |
| Independent evidence separation | Independent passing, failing, and incomplete results remain distinguishable from checked records. Their mere execution creates no checked authorization, lease, or required-tier evidence; the task checker rejects copied/relabelled independent results, direct tier passes, variable-only claims, and bypass flags as checked evidence. Other independently required obligations remain independently required. |
| Independent raw outcomes | Deliberately failing independent checks preserve nonzero statuses and reports; crashes, missing reports, unexpected zero-test runs, and unfinished steps stay failed/incomplete as applicable, not fabricated passes or automatic catalog ignores. |
| Shared execution preservation | Verify every existing registered tier retains checks, coverage, timeouts, resource/writer locks, report adapters, and heavy-suite serialization where present across supported entry points. Preserve independent command strings, shared workflows, and Run-button definitions unless a separate approved change explicitly covers them. No example tier names are required. |
| Compatibility repair provenance | An evidenced installation-introduced independent-caller rejection is owned by that integration change, not automatically a pre-existing product baseline. A scoped repair uses applicable approval/versioning without inventing a new lifecycle/cutover; separately planned original installation/confirmation pins its original source and records the later amendment distinctly. |
| Required configuration preflight | Declare every actual required per-command environment/config value, verified source, and validation. Missing, malformed, unavailable, or conflicting config blocks before the command starts, including independent callers that require it; report missing names/status safely and do not claim the build ran or attribute it to product code. |
| Configuration values and provenance | With valid values, verify the actual intended command environment reaches the builder and evidence records safe source/version metadata. Do not fabricate defaults, change caller commands, or expose secret values in logs, reports, errors, digests, or evidence exports. |
| Base path and deployment configuration | Validate a required base path against verified project/deployment configuration and target applicability. Missing/invalid config blocks; `/`, empty values, or changed deployment targets are not guessed. These inputs are host-dependent, not universal skill defaults. |
| Port assignment and conflicts | Respect a verified fixed project port and report conflicts without silently rebinding callers. If no fixed port exists but a listener needs one, assign a valid number from the host's verified range/allocator. Demonstrate safe reservation, allowed range, environment propagation, lifecycle handoff/release, and coordination between simultaneous checked/independent runs. A released free-port probe cannot establish reservation; block if safe coordination is unavailable. |
| Build-only port values | When a build embeds rather than binds a port/URL, validate and use the verified stable build target; do not allocate or advertise an ephemeral listener endpoint. Record only non-secret configuration identity, never credentials. |
| Defaults | A task has exactly one authoritative tier; no redundant deny-list migration is required when another tier is added. |
| Derived tier status | For each registered tier, status and activation/change audit snapshot derive from the single assignment; added tiers default NOT ALLOWED; suspended/terminal tasks deny all tiers; pending change cannot allow its target. |
| Overrides | Arguments, environment, config, package-script routes, and diagnostic selectors cannot reduce accepted required coverage. |
| Boundary | Checked local execution and completion reject unsupported records; tests do not claim to prevent shell runs, local edits, or Replit Agent task completion. |
| Task substitution | Another valid local task ID and plan cannot validate or complete this local task; its exact approved plan version/digest must match, with no claim of independent Agent platform identity. |
| Result checks | Missing or inconsistent run records, manually supplied `PASS` labels, and copied run IDs fail local checker consistency checks; no forgery-resistance claim. |
| Policy edit | Changed tier registry, wrapper, runner, or checker requires separate approval in the checked workflow; deliberate local tampering remains possible. |
| Completion | Ordinary validated completion requires its local checker decision. Explicit owner-directed administrative completion uses its separately bound decision/mode and cannot masquerade as validation success. Platform task routes remain independent. |
| Ad-hoc route | An ad-hoc run, even with passing output, cannot be attached as required-tier evidence by the local checker. |
| Approvals | A caller-written actor/approved flag is not enough for the checked workflow; recorded local approval is not authenticated identity. |
| Transitions | Approval updates plan/tier/authorization versions and audit atomically; stale/double approvals and a second pending request are rejected. |
| Rejection | Rejecting a change preserves the old tier and cannot clear independent suspension. |
| Crash safety | Simulated failure before/during commit or plan projection leaves no runnable partial state; audit failure rolls back mutation. |
| Races | Launch versus tier move, amendment, cancellation, and release cannot execute against inconsistent versions. |
| Final-write coordination | Demonstrate effective coordination with relevant writers while final inputs and evidence are checked and terminal state is committed. An intervening edit, uncoordinated writer, or coordinator-only lock blocks completion and new-route cutover; out-of-band shell edits remain outside the cooperative guarantee. |
| Optional writer-lock adapter | If using the bundled POSIX reference, its six primitive tests and host checklist pass; verify the real filesystem, stable same-inode lock path across cleanup/redeploy/restart, foreground writer lifetime, writer route coverage, lock ordering, and a live local completion race. Lock-file unlink/rotation/replacement while participants may run must be ruled out; the acquisition-time check cannot prevent a later split lock. Bundling or primitive tests alone cannot permit cutover. Other hosts may use equivalent coordination or isolation. |
| Snapshots | Ordinary in-scope edits permit a new run but invalidate prior relevant results; dirty/untracked/generated/dependency inputs are represented. |
| Output exclusions | Writing approved logs/reports does not itself invalidate evidence; modifying executable inputs does. |
| Isolation | Concurrent code edits and uncoordinated worktrees cannot yield accepted snapshot evidence. |
| Provenance | A “pre-task” run contaminated by task changes or mismatched relevant environment is rejected. |
| Retries | Three distinct permitted retries are bounded; a passing retry proves only intermittency; crashes/skips/zero-test results are not passes. |
| Alternate diagnostics | Unsupported isolation blocks classification unless an approved equivalent diagnostic policy is present. |
| Independence | Memory plus untouched files without direct provenance fails; duplicate references to one observation count once. |
| Matching | Different assertions, variants, environments, signatures, ambiguous matches, and unknown matching rules cannot inherit an ignore. |
| Lifecycle | Expired, revoked, non-active, or newly broadened baselines cannot waive a task failure without approved policy. |
| Ownership | An owned repair cannot be discharged by reclassification, expiry, skipped/deleted/renamed tests, or unapproved plan amendments. |
| Completeness | Ignored failures followed by missing required steps, reports, discovery, or runner crashes remain incomplete/unacceptable. |
| Results | Raw nonzero statuses are preserved under acceptable-with-ignored-failures; diagnostic results cannot stand in for complete assigned-tier runs. |
| Uncatalogued default | A proven pre-existing failure with no exact catalog ignore and no separately approved task-local acceptance decision stays blocked; provenance alone cannot manufacture waiver authority. |
| Task-local positive | A current pinned independently verified policy decision exactly binds task/plan/run/failure/environment/snapshot, provenance and policy/authorization versions, scope and expiry; complete results and owned repairs are satisfied. Assess acceptable-with-ignored-failures, preserve raw failure and do not promote a catalog record. |
| Task-local negative | Forged/caller labels, missing source/decision, stale/mismatched bindings, expiry/revocation, missing corroboration/reports, owned repairs, typecheck waivers, harness failure and incomplete runs cannot gain task-local acceptance. Independent callers and owner closure gain no new metadata/approval prerequisite. |
| Evidence acceptance | Unknown/stale snapshots, invalidated plans, and missing required external checks prevent local success. |
| Capability boundary | Missing required external checks remain blocked; a local check cannot impersonate an unavailable service. |
| Local dispatch | The checked project entry point resolves one authorized tier from the supplied local task and plan; it does not sweep all tiers. Missing report adapters and not-reached steps cannot produce accepted runs. |
| Ordinary-task route | For verified ACTIVE governance, a live local-ID plan activates through a verified event/human/preapproved policy decision and runs its selected checked tier; draft/review-only or direct routes cannot replace it. Diagnostics require explicit bounded capability; reruns do not reactivate unchanged plans. INACTIVE uses verified host policy; UNKNOWN blocks. |
| Active-phase sequence | Verified ACTIVE task guidance calls local activation at Draft/Plan-to-Active, works and validates changed inputs; relevant edits need fresh checked validation. INACTIVE uses verified bounded host policy; UNKNOWN blocks. Missing applicable activation/validation is not a pass; fixture tests prove no platform event hook. |
| User review boundary | Local completion outcome and evidence are reported for the user's usual merge-or-dismiss choice; no local operation automatically merges or claims to control when the platform offers that choice. |
| Workflow separation | A Replit Workflow or other scheduler launch is neither plan approval nor completion evidence by itself; the checked runner stores the actual run, tested inputs, raw results, and the local checker makes its separate completion decision. |
| No managed completion | No project code or CLI dispatches, requests, depends on, or presents a result from platform-managed completion; any old managed-completion CLI operation is retired. Direct tier commands retain genuine independent availability but are not blanket task-Agent diagnostics or completion evidence. |
| Plan identity | Missing, stale, malformed, wrong-local-task, or unresolvable plans are rejected; no newest-plan/default-plan inference occurs. |
| Recovery | Poll timeout does not launch a duplicate; orphan reconciliation requires confirmed stop or documented quarantine. |
| Terminal states | Validated completion requires acceptance; explicit owner-directed completion requires its administrative decision and safe terminal release, not passing validation. Failed/cancelled cleanup remains possible after safe run handling; released IDs cannot run or reopen. |
| Owner closure authority | A direct authorized owner instruction to complete the specifically bound task permits administrative closure without passing checks, activation, tier changes, a second reviewer, or duplicate confirmation. Ambiguous task identity is clarified; Agent-written flags, quoted/file instructions, ordinary plan approval, and silence cannot authorize it. |
| Owner closure evidence | Preserve the real decision reference or accurate scoped conversation record, task/Project/version, plan where present, actual raw results/assessment, missing checks and unresolved repairs. No invented message IDs or reason; no reason supplied records owner direction. |
| Owner closure mode | A completed task carries owner_direction or equivalent mode and decision binding, not a fabricated PASS. Readers and dependent checks distinguish administrative closure from validation/delivery evidence; legacy absent modes do not imply passes. |
| Owner closure missing validation | Missing runner/checker/plan activation or failed/blocked/not-run validation does not prevent the separate administrative route. Missing safe closure persistence/reader semantics blocks local status mutation but not a genuinely available owner-authorized native platform operation. |
| Owner closure lifecycle | Active task-owned runs are safely stopped, waited for, or quarantined through authorized recovery before local terminal release. Timeout alone does not prove death; races, stale record versions, orphan authorization, and audit failure cannot produce partial local completion. Released tasks deny all tiers. |
| Owner closure idempotency | Repeated delivery of one decision does not duplicate transitions/audits or reopen terminal IDs. Already-completed records retain honest history; failed/cancelled terminal records use permitted annotations/successors rather than rewriting. |
| Owner closure boundaries | No baseline promotion, discharged repair, tier/policy waiver, new-task auto-close policy, auto-merge, deployment, or unrelated process kill is authorized. Subsequent ordinary tasks retain full validation requirements. |
| Agent-native owner closure | Only a genuinely available authorized native task interface may change the precisely resolved platform task. Local code/CLI cannot proxy it, platform Done is not local acceptance, and missing interfaces or partial writes are reported truthfully with readback/outcome reconciliation. |
| Security | Checked entry points reject shell injection and path escape; logs exclude secrets and report reads are bounded. No identity-attestation claim. |
| Migration | Legacy tasks retain honest provenance; canonical sources and approved generated outputs agree; competing authorities are not active together. |
| Bootstrap cutover | A separate, current approval authorizes one selected tier under an existing safe route; for an active gate, use the prior checked route only for bootstrap and block ordinary tasks until cutover. Focused tests remain diagnostic, fixture-only checks do not prove cutover, and failure cannot open an unlocked route. |
| Evidence index | A tracked discoverable index links the manifest to actual authoritative allocator/namespace, backup, catalog/history, raw run, corroboration, health, and closure evidence locations and safe access procedures. No secrets, invented owners/locations, or competing live registry. |
| Backup and restore readiness | Document cadence/recovery point, actual backup/checkpoint, namespace/schema, and isolated authorized host restore report. Procedures, mocks, or a scheduled job alone do not prove a successful backup or tested recovery. |
| Stale allocator backup | Allocate committed IDs after a backup, then restore the checkpoint in isolation. Verified recovery reconciles later commits/tombstones or keeps allocation blocked; it never silently reuses IDs. |
| Restore writers and permissions | Fence old allocators/replicas and prevent same-namespace split allocation. Stale active leases/grants and expired ignores are not revived by backup flags; current policy and normal activation/recovery are required. Production restore is not authorized by skill authoring. |
| Classification lineage | A pre-existing determination links the exact current failure/snapshot/environment, direct earlier/comparison run, relevant policy/catalog revisions, and each original corroboration source. Missing applicability or origin remains unresolved. |
| Corroboration duplication | Copied logs, summaries, or two views of one observation count as one source; independent verified unchanged inputs may corroborate but never replace required direct earlier-run proof. |
| Evidence availability states | Distinguish present, never_collected, unavailable, expired, pruned, corrupt, and unknown with observed reason/recovery action. Present may be stale; expired historical entries may corroborate but cannot authorize an ignore. Missing optional history blocks only dependent claims. |
| Evidence health inspection | Bounded read-only diagnostics report broken links, missing artifacts, bindings, stale grants/runs, expiry, backup status, lineage and mode ambiguity. Report writes are scoped; no silent repair, renewal, status mutation, process kill, restore, or recurring-job setup. |
| Retention dependencies | Preserve tombstones and evidence still required by current accepted claims, or explicitly invalidate dependent assessments when authorized pruning removes it. Retain historical outcomes with pruned/unverifiable status; lost artifacts cannot justify new acceptance. |
| Portable evidence export | A requested scoped versioned bundle includes exact bindings, raw outcomes, snapshot/environment, classification origins, closure mode and unresolved work, with digests/redactions/absence recorded. Protected data stays protected; incomplete bundles are not called fully verifiable. |
| Export non-authority | Import/viewing cannot allocate IDs, grant tiers, approve changes, widen baselines, replace a live store, or prove another environment passed. Digests are integrity aids, not authentication or tamper-proof evidence. |
| Owner closure visibility | Reports/health/export views distinguish owner_direction from validated mode and expose retained failed/blocked/not-run checks and repairs. Index/restore/health/export requirements do not demand a second closure approval or passing tests; no auto-created follow-ups or successful-validation metrics. |

## Paired skill confirmation

When creating project tasks to install this skill definition, create a dependent
confirmation task scoped to `SKILL.md`, after the authoring task. Its acceptance
items must match the authoring task's items, including:
The following task/tier implementation items are conditional on verified ACTIVE
governance or separately approved installation; INACTIVE uses its actual verified
bounded host equivalents, UNKNOWN blocks dependent proof. Definition confirmation
does not claim these host implementations exist.

- Valid frontmatter names `failure-gate-v4`; title and identifiers consistently use v4.
- Core skill remains below 500 lines with resolvable local reference links.
- One authoritative task-to-tier mapping replaces redundant live allow/deny lists.
- Per-tier audit snapshots and status are derived from that mapping, not separately editable permissions.
- Planning authorization avoids a pre-activation guard deadlock.
- Task authorization and run snapshots are distinct.
- Project-local workflow limitations are explicit, without a protected-mode claim.
- A verified explicit Replit plan-approval action is trusted authorization without requiring an approver identity or reviewer roster; deterministic policy is usable only after separate prior approval.
- A once-approved deterministic policy may authorize matching plans without per-task human review, but records a new exact-bound decision for each task/change.
- An approved Replit task plan is input only with verified project-local binding, never standalone authorization.
- Under verified ACTIVE governance an ordinary-task activation and checked-run route is required; a draft/review-only CLI cannot supply it.
- Verified ACTIVE work invokes local activation/checked-validation and reruns after relevant edits; INACTIVE uses verified existing host policy/finite equivalents, UNKNOWN blocks. Leave merge-or-dismiss to the user.
- A configured source supplies checkable real approval events/decisions; caller assertions and status/merge actions alone cannot activate.
- Final input/evidence checking and terminal write are coordinated with relevant writers, or local completion stays blocked.
- No project entry point invokes or reports platform-managed completion.
- For verified ACTIVE activation, prove the local checker is implemented without claiming control of the platform lifecycle; inactive hosts use their actual verified acceptance policy.
- Explicit owner-directed closure has a separate recorded decision/mode,
  preserves unresolved validation, and does not require a second approval or
  Agent self-authorization. Ordinary validated completion remains protected.
- Verified ACTIVE validation uses the supplied local task/plan for one authorized tier; INACTIVE uses verified bounded host policy, UNKNOWN blocks.
- Execution permission, not merely evidence acceptance, constrains task-Agent
  direct, indirect, delegated, background, scheduled, and remote-triggered launches.
- Genuine independent callers keep existing authority and invocations; a task
  Agent cannot acquire it by relabeling a discretionary launch or dropping metadata.
- Approved transitive scope preserves intentional shared checks while rejecting
  unknown/expanded dispatch. Delegates inherit bindings, budgets, and lease ownership.
- Diagnostic/comparison allowlists and cumulative accounting are explicit,
  subordinate, and cannot reset through relabeling/restarts or become another tier.
- Separate policies authorize bounded non-tier obligations, not tier sweeps;
  acceptance verification does not itself authorize every live tier.
- Same-tier reruns, approved atomic transitions, owner closure, and honest
  cooperative/platform limitations remain intact.
- The normative monitoring reference requires actual host monitor/file mapping,
  atomic task single-flight and shared-resource guards, safe child reconciliation,
  durable lifecycle events, coverage uncertainty, and automatic read-only lookup.
- Requests, denials, launch intents, confirmed starts, and finishes remain distinct;
  logs record declared reasons and policy mismatches without inventing motive.
- Monitoring failures fail closed for managed dispatch/evidence, not genuine
  independent callers or owner-directed administrative closure. New host controls
  are requirements, not asserted installed services or executed acceptance tests.
- Independent callers retain their existing invocations without mandatory task
  metadata or an environment variable. Explicit checked requests fail closed
  without fallback; independent results cannot become required-tier evidence.
- Both execution paths have regression cases preserving raw outcomes, checks,
  timeouts, resource locks, reports, heavy serialization, and workflow definitions.
- Each required build/runtime configuration input has a verified source and
  preflight; missing inputs block before launch, with secret values redacted.
- Required listener ports use the verified fixed project port or a safely
  allocated/reserved numeric port; build-only embedded ports remain stable and
  come from verified deployment configuration. Base paths are verified, not guessed.
- A project-level launcher test is not represented as proof of Replit Agent platform routing.
- Another valid local task plan cannot be substituted for the local task being checked.
- Local result consistency checks are not described as forgery resistance.
- Paths, commands, formats, runtimes, tier names, and companion skills are host-adapted rather than mandatory examples.
- Essential ownership, provenance, and fail-closed rules remain in the core skill.
- The eight evidence/recovery requirements have explicit normative references
  and acceptance cases, with optional-history and owner-closure boundaries intact.
- No section is vague, self-referential, or deferred to future work.
- A future Planner reading the skill file cold could follow it without ambiguity.

List gaps before patching. Do not use skill confirmation as permission to implement
project feature code, alter unrelated skills, or repair the broader repository.
For this reclaim amendment, also read back the complete canonical reference and
its links, compare exact interfaces to the current canonical Port Authority
runtime contract and consumers, and preserve the ordinary actor-optional Replit
tier-event route separately from authentic human reclaim approval. Confirm late
evidence storage creates no new permission and raw cleanup cannot pass validation.
If correcting the skill requires rewriting more than half, surface a replacement
task instead of silently expanding scope. Review companion documents separately.
Also read the complete staging/lifecycle reference and executable simulations:
confirm all parallel instructions/examples/checklists qualify ACTIVE/INACTIVE/
UNKNOWN, preserve task-wide staging gates and implicit reclaim dependencies,
mandatory recovery disposition, exact acknowledged recovery and independent
registration-before-dispatch/owner stall/death/watchdog loss. Report structured
malformed-input denials and fixture results separately from two real host runs.

## Reporting

Report actual checks run, raw outcomes, known baseline failures, and project-local
workflow limitations. A document-format review is not runtime
verification, and installed instructions are not an installed validation system.