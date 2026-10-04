# Mandatory finite validation budgets and transitive supervision

Read before planning, dispatching, supervising, assessing or installing any finite
validation route. This normative contract is additional to the core, registry,
[execution scope](implementation.md), [monitor](execution-monitoring.md),
[evidence/recovery](evidence-and-recovery.md) and
[checked reclaim](runtime-reclaim.md) contracts. It supplies no approved registry,
real checked runner, watchdog, attester or activation. Traversal of pinned
references occurs once. Authoring tests/models are never authority.

## 1. Inventory every finite launch

Require actual finite supervision for EVERY finite validation launch: fast/static
checks, package scripts/aliases and pre/post hooks, required tiers, list/dry runs,
smoke checks, diagnostics, each isolation attempt, baseline/snapshot comparisons,
nested runners/workers, startup/global setup/teardown and recovery jobs.
Expected short duration, a successful previous run and skipped serialization are
not timeout exemptions. A resource lease is not the complete validation supervisor.
Pure definition inspection is not tier execution; its reads remain bounded.

Map actual command/route identity, initiator, transitive graph and installed
definitions to the independently approved tier/capability and budget source.
Required-tier evidence must use the real checked task/approved-plan runner;
`scripts/run-tier.mjs` is only an illustrative path, not a discovered endpoint.
Direct package commands inherit no registry deadline. A task Agent may use them
only under an applicable separately authorized bounded capability AND a verified
equivalent outer supervisor; they never automatically substitute for required-tier
evidence. A command alias, missing metadata, shell wrapper or diagnostic label
does not create authority or propagate a limit.

Preserve genuinely independent callers under their own existing authority, command
strings, reports and coverage without mandatory task/plan metadata. Their finite
launches still need equivalent verified bounds under that authority. Where their
supervision is unobservable/uncontrolled, report missing coverage/readiness, not
an exemption or permission to initiate extra work. This authoring amendment does
not migrate callers, modify platform/CI dispatch or silently replace active policy;
actual host wrapper/policy/command changes need separately approved integration.

Watch/server commands cannot masquerade as finite validation. A required server
fixture needs separately bounded startup/readiness, test use, teardown and verified
owned termination. Persistent watch/development activity has its own explicitly
approved lifecycle, never required-tier pass evidence merely from a client exit.
Remote jobs need an actual verified provider job deadline, cancellation and terminal
readback under the authorized graph. Killing/aborting a client is not remote
termination; missing remote supervision blocks that dispatch/readiness claim.

## 2. Validate real budgets at dispatch

Resolve limits from the independently approved current registry/capability, not
caller-written JSON, env values, command arguments or remembered defaults.
Bind exact task/plan/run/purpose/command and policy/definition/authorization
versions where applicable; independent callers retain their own real bindings.
Recheck scope, authority, limit provenance, admission and remaining time after
queueing and immediately before each cooperative dispatch.

Require finite queue/wait, per-step execution, startup, teardown, cancellation,
termination grace/verification, evidence-capture and cumulative parent/attempt
deadlines. Include test AND hook limits when applicable. Discover the actual
runtime's representation and range; reject missing, zero, negative, NaN, Infinity,
overflowing, disabled and unauthorized larger budgets before work starts.
For local Node timer milliseconds require integers in `1..2147483647`, not merely
Number.isFinite/Number.isSafeInteger. Other hosts need an approved safe equivalent,
not those units imposed universally. Validate aggregates/addition without overflow.
Disabling flags and Infinity overrides are not valid substitutes for inheritance.
Caller environment may carry a checked value but cannot enlarge or disable the
approved limit. Any permitted narrower value must satisfy the policy, mandatory
steps and cleanup feasibility; smaller timeout is not permission to skip coverage.

Record selected/effective values and their authoritative source/version, not just
configuration presence. Missing real checked routes, budget authority, independent
outer supervision or bounded evidence transport are concrete blockers. An
agent-writable local implementation alone cannot provide protected authority.

## 3. Preserve cumulative remaining time

Use a verified monotonic clock for local elapsed deadlines; wall-clock timestamps
are evidence/issuance/expiry metadata, not elapsed timers. Do not extend budgets
on wall-clock reversal. Across restarts/clock domains, preserve protected consumed
accounting and deadline lineage through a verified coordinator; resetting monotonic
origins, restoring snapshots or comparing unrelated clocks cannot renew authority.
Remote clocks need a verified provider/coordinator mapping, never unchecked skew.

Reserve allowed attempt counts and applicable cumulative costs atomically before
dispatch across workers. Started failed/cancelled attempts consume their budgets;
do not refund by changing labels. Carry the original parent/attempt deadlines and
remaining cleanup/evidence allowance across nested resources, reentry, retries,
three isolation attempts, comparisons and recovery. A new wrapper/session/run ID
or local MAX_HOLD must not reset the protected parent. Parallel workers share the
parent lifetime and any policy-defined aggregate resource cost; do not double-count
wall time or manufacture independent allocations. Record the chosen accounting
rule. Whole required-tier reruns remain possible only under current authorization
and its applicable actual budgets; auxiliary limits grant no extra tier.

Each effective step/attempt deadline is no later than its approved bound or original
parent deadline, with separately reserved approved cancellation, termination and
evidence time. When remaining time cannot cover approved cleanup, do not dispatch
new work. Cumulative exhaustion stops new attempts; never retry until lucky,
disable deadlines, increase limits, change coverage or replenish counters without
applicable approval. Exactly three required isolation retries remain required;
insufficient budget blocks classification, not permission for fewer or a refill.

Admission expiry after authorized dispatch must not orphan already owned work.
Its approved transitive supervision/cancellation/termination and finite reserved
cleanup remain in scope; it grants no new launch or unrelated process reclaim.
If cleanup overruns its safe bound or lifecycle/claim/evidence is genuinely unknown,
retain exclusion and original identity/evidence, quarantine or use separately
authorized bounded recovery. Timeout is not unlock, death or replacement authority.

## 4. Node tests, hooks and independent outer watchdog

For Node require explicit finite test/suite-inherited AND hook timeouts, or
supported equivalent runner-wide limits verified on the installed Node version.
Inspect suite/test/hook/global setup/teardown/worker definitions and effective
inheritance/overrides. Audit timeout Infinity, zero/disabled options and omitted
inheritance. Probe installed support before choosing flags: Node 20+ does not
imply availability of newer CLI options. Do not assert that one runner flag bounds
hooks, synchronous code or the complete process tree without actual verification.
Report effective test and hook settings explicitly from inspected/verified wiring.
Ordinary TAP/spec output does not announce unlimited per-test timeouts and is not
configuration evidence. Cancellation/skipped tests cannot become passing checks.

Per-test cancellation cannot interrupt blocked synchronous code or guarantee
termination of workers/subprocesses. Require an independent finite outer watchdog
outside the supervised event loop and verified transitive supervision of the
complete approved tree/jobs, including nested sessions. Bound pre-dispatch input/
configuration reads and provider calls as well as execution and evidence capture.
Shell/tool timeout or client abort alone is not proof of local/remote termination.
Track exact owned incarnations/job identities, not names or ports. If children
may daemonize/double-fork/escape groups or become untracked remote jobs, use a
verified host cgroup/job supervisor or block that safety/readiness claim. Do not
pretend a process-group sample observes every escape.

On deadline, cancellation or post-spawn supervision/journal failure, stop further
dispatch, retain slot/lease and original partial evidence, and attempt bounded
termination of the already authorized owned tree without requiring healthy journal
writes. Newly observed owned descendants must receive the current authorized
termination signal; use per-incarnation delivery tracking, not a global “sent once.”
Do not blindly re-signal exact previously delivered reclaim batches: reclaim still
uses its checked intent/replay rules, not this owned-work supervision permission.
Verify all relevant descendants/jobs stopped or safely quarantined; child exit
alone is insufficient. Permission/discovery gaps or exhausted verification mean
unknown lifecycle and retained exclusion, not a clean pass or safe release.

## 5. Current Port Authority interoperability

Read the current canonical `reference/runtime-contract.md`, actual lease/cleanup
consumers, `runtime-environment.mjs` and unconfigured `host-capabilities.mjs`.
Its version 1 attestRuntime/beginReclaim/handle/signal/outcome interfaces and exact
scope hashing are unchanged; the complete reclaim contract still applies.
No wire-format adaptation is needed for this documented mapping. The code-owned
hooks remain unavailable, not real approval or trusted host attestation.

The current lease requires explicit VALIDATION_LOCK_TIMEOUT_MS and
VALIDATION_LOCK_MAX_HOLD_MS, not silent three-hour/two-hour defaults. Its local
durations are finite timer-safe integers; elapsed queue/execution/transition/
termination clocks are monotonic. It rejects a late raw zero as deadline success,
signals newly observed owned descendants and performs bounded supervision-error
cleanup with retained error-path lease. These are local mechanisms, NOT verification
of authoritative host limits or a protected cumulative task deadline.
The real checked host route must enforce current approved maxima, original parent/
attempt budgets, independent outer oversight and authoritative evidence.

Manifest/lease/waiter/transition/development-context JSON reads use nonblocking,
no-follow opens, regular-file/ownership checks and byte bounds. These prevent
FIFO/device/oversized JSON read hangs, not real kernel/I/O stalls; independent
outer oversight remains required. Current cleanup may re-observe known transient
ENOENT/ESRCH or unmapped-listener shutdown snapshots read-only within the existing
finite termination budget, retaining verification observations in raw evidence.
Persistent gaps block success/escalation; permission/capability errors block
immediately. This never automatically retries claims, writes or signals.

Callers relying on old defaults need separately approved migration to explicitly
supplied checked limits and proper supervision. Do not copy old values as presumed
approval or alter Port Authority sources during Failure Gate-only authoring.

## 6. Report and accept actual outcomes

Capture route/command identity and approved source, effective queue/step/parent/
attempt/test/hook/startup/teardown/cleanup/evidence limits, clock domain/elapsed
time, remaining cumulative budget, raw exit, deadline/cancellation reason,
termination evidence, retained exclusion and authoritative acknowledgement.
Index these in the existing persistent file trail and real evidence stores;
local logs/report copies do not become authoritative by being copied.

Deadline breach wins over a late zero exit, even when termination is confirmed.
Reject pipeline-masked/swallowed timeouts, cancelled tests, missing reports,
unknown descendant state, post-spawn journal gaps and incomplete/timed-out evidence
as PASS. Preserve raw status separately from checked FAIL/BLOCKED/INCOMPLETE;
successful termination or storage acknowledgement is not required-tier completion.
Do not accept auxiliary/direct passes as required-tier evidence. Preserve all
owned repairs, exact active ignores/raw failures, provenance/lineage, complete
steps/reports/coverage, writer coordination and ordinary authorization rules.
Administrative closure remains “Closed by owner direction—not validation passed.”
It adds no second approval and cannot discharge repairs or convert timeout to PASS.

## 7. Required bounded acceptance

Perform authoring/unit tests in labelled isolated fixtures, never by signaling
live application processes. A test-only fake registry, clock or Python watchdog
is not a deployable host supervisor or protected authority. Separate executable
local fixture results, simulated policy coverage and real host activation evidence.
Do not trigger remote jobs or a real tier sweep to prove denial.

| Case | Required assertion |
|---|---|
| All entry points/direct bypass | Fast/static, scripts/aliases/pre/post hooks, tiers, dry runs, smoke, diagnostics, isolation, baseline, nesting/recovery are bounded even without serialization; direct commands need authority plus equivalent supervision and cannot replace tier evidence. |
| Invalid/changed limits | Missing, zero, negative, NaN, Infinity, disabled, overflow or unauthorized larger caller budgets deny dispatch; installed definitions/overrides match approved source. |
| Cumulative dispatch | Expired/insufficient pre-dispatch remainder prevents work; nested resources/reentry/retries/recovery share original accounting and cannot replenish attempts/deadlines. |
| Clock/admission | Wall-clock changes cannot extend monotonic budgets; queue rechecks authority/remainder; admission expiry retains finite owned supervision without new launch/reclaim. |
| Test/hook wiring | Effective test/suite inheritance AND hooks are explicit/finite and supported on installed runtime; disabled overrides/ordinary TAP output cannot establish coverage. |
| Async/sync/hooks/subprocesses | Deliberately hung cases are bounded by independent outer supervision; verified exact owned children/workers cannot survive accepted completion. |
| Late zero/masking | Zero after deadline, swallowed or pipeline-masked timeout and test cancellation remain non-success with raw evidence. |
| Post-spawn journal failure | Bounded owned cleanup does not depend on journal writes; original uncertainty/exclusion retained; no replacement or forged finish. |
| New termination descendants | Newly observed owned incarnations receive current authorized termination; no early release; discovery gaps remain explicit. |
| Watch/remote misuse | Persistent watches cannot become finite tier checks; local client abort cannot prove remote termination; unverified provider deadline/cancellation blocks. |
| Evidence/recovery deadlines | Evidence-capture timeout or missing acknowledgement prevents acceptance and retains original outcomes; recovery stays bounded/separately authorized and cannot reconsume a claim. |
| Inputs/shutdown snapshots | FIFO/device/symlink/oversized local inputs cannot hang pre-dispatch reads; only bounded read-only known transient re-observation, never blind signal/claim/write retry. |
| Preservation/readiness | Existing independent authority/coverage, ignores/repairs/provenance, single-flight/writer/monitor and owner closure remain intact; real registry/outer-supervisor/checked-route activation proof is separately required. |

Record actual limits, attempts/results and concrete missing host capabilities.
After editing perform paired canonical file/reference readback against the original
current specification and current Port Authority contract; list gaps before scoped
corrections and rerun affected checks. No application feature, publication,
host approval/activation or production change follows from this confirmation.