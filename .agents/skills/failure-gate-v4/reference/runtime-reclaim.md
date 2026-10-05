# Checked runtime reclaim and host attestation

Read for runtime cleanup/reclaim, related recovery, or installation of its checked
route. This is a normative integration contract, not a working approval service,
platform endpoint, registry, attester or signaling adapter. Authoring or importing
the definition activates nothing. A draft task is neither active governance nor
authorization. Preserve the core, implementation, monitoring, evidence/recovery
and owner-closure contracts; traversal of pinned references occurs once.

## 1. Discover the real sources and trust boundary

Read the current canonical `.agents` Failure Gate source and applicable registry,
approval, checked-run, recovery and evidence references. Read the current canonical
Port Authority `reference/runtime-contract.md`, `scripts/host-capabilities.mjs`
and its actual consumers before wiring. If unavailable, request the current source;
do not infer its interface from memory, copied definitions or previous ZIPs.
Keep sources/deliverables outside `.local/`; private disposable state is separate.

Map each required capability to its actual authoritative source, responsible role,
protected access/transport, checked executable interface, active registration,
deployed version and successful verification evidence. Record separately whether
it is documented/proposed, implemented, registered, deployed or successfully
verified. Discover approval origin, exact task/plan/run mapping, registry ownership,
claim atomicity, conflict coverage, evidence durability and platform attestation.
Do not invent platform APIs or treat narrative audit, metadata echoes or local
files as proof. An adapter under agent write control alone is not a protected
authority. Real trusted providers must be outside the caller's authority to
rewrite approval, attestation, claim or evidence records.

Missing authoritative sources, protected transport or executable checked routes
block live reclaim and dependent development exceptions. Specify the missing
capability and responsible integration role; do not manufacture a local approval
store. Unrelated permitted read-only inventory/prevention remains available.
Authorized inert staging and separately permitted isolated fixtures also remain
available unless the actual approved task gates them on authority. Such a gate
requires an authorized staged-task revision; this definition is not approval.
Read [staging-and-lifecycle.md](staging-and-lifecycle.md) for per-caller STAGED,
NON_RECLAIM_VERIFIED and LIVE_RECLAIM_ENABLED states, separate check outcomes and
ACTIVE/INACTIVE/UNKNOWN general validation routing. Checked reclaim remains
mandatory in every state; fixtures never establish two real host acceptance runs.
Failure Gate itself stays project-neutral: Linux `/proc`, Node 20+ and the local
filesystem semantics are conditional Port Authority template prerequisites,
not requirements for every project. Other implementations need an approved,
documented mapping and equivalent real acceptance evidence.

## 2. Ownership and permission

| Owner | Required responsibility |
|---|---|
| Trusted host/platform | Independently establish workspace/runtime identity, development versus deployment, canonical root, kernel boot, launcher PID/start time and live ancestry, domain applicability, attestation ID, issuance/expiry and current revocation. |
| Failure Gate | Verify/consume host proof and authentic human disruption approval; bind active task, exact approved plan, run and operation; issue/verify and atomically claim capability; prevent replay/conflicts; journal intents/outcomes, reconcile uncertainty and assess evidence/completion. |
| Port Authority | Inventory socket/process ancestry; apply UID, incarnation, ancestor/descendant and ownership guards; consume the checked handle; signal only exact approved targets, verify termination/port state and submit actual outcomes. |

Failure Gate must not mint independent platform proof from environment variables,
a development domain, remembered guidance or an agent-written audit. Port Authority
must not mint approvals; its local resource lease is not Failure Gate single-flight.

Document/register `runtime.process-reclaim` only through the real authoritative
host registry under separately approved integration scope. This name describes
the proposed operation, not an existing endpoint. Keep it distinct from tier
execution, diagnostic capabilities, baseline ignores, coverage waivers and
administrative closure. Generic investigation/validation approval does not
authorize disruption. The approved plan must explicitly authorize this cleanup.

Reclaim requires an authentic approver and authoritative active human approval
record resolved through the protected source, not caller-supplied actor fields.
Ordinary Replit tier activation/change remains actor/roster-optional under its
verified plan-event route; its preapproved deterministic policy is not reclaim
authority. Do not add actor identity requirements to that ordinary route or a
second approval to owner-directed closure. Administrative closure retains
“Closed by owner direction—not validation passed.” Safe run handling uses its
existing authorized supervision/recovery, not a fabricated reclaim waiver.

## 3. Exact approved operation

Independently verify and compare all of:

- Active task ID, exact approved-plan version/digest binding, run ID and stable
  operation ID, with namespace and current authorization/policy versions.
- Host-verified workspace/runtime identity, canonical project root, current boot
  and attestation identity, applicability, freshness, expiry and revocation.
- Exact port set and PID/start-time targets, including every approved stale
  wrapper/descendant. Ports, names or ancestry alone never establish permission.
- Explicit own-tree permission, allowed SIGTERM/SIGKILL escalation, grace and
  termination-verification budgets, human authorization expiry and revocation.

A manifest or reference locates approval; it never authenticates it. Compare to
the authoritative source, not another caller-written copy. Booleans, action
flags, nonempty references and previous grants cannot authorize signals.
An operation ID may be nominated by the caller, but becomes bound only through
the checked claim against independently approved exact scope; its randomness
is not authority. Persist its identity before potentially committing requests.

Atomic verification/claim binds the one grant to one operation, its run and
conflict scope, with durable audit intent. Reject replay even with a new operation
ID, concurrent conflicting claims and stale/terminal/suspended task bindings.
Integrate the existing parent run single-flight without a nested self-deadlock;
a reclaim suboperation is not a second top-level validation. Coordinate all
cooperating routes against audited task/resource conflicts in a verified lock
order. Local serialization cannot replace the checked claim. Document uncovered
external routes rather than claiming universal exclusion.

Escalation belongs to the same claim, not a second consumption. Before every
signal batch, verify live attestation, current approval/expiry/revocation, exact
scope/run/plan/operation and signal policy, and durably journal intent before
permission. Any scope/plan/run/attestation-ID change requires new bound approval;
renew only after prior claim uncertainty and workload are safely reconciled.
Never silently widen, substitute or issue replacement claims.
Verify the approved signal phase and grace budget, not merely membership in a
signal list: SIGTERM precedes permitted survivor escalation after the grace period.
Journal each permitted batch with stable operation/signal identity; an intent
replay or lost permission response cannot grant a second delivery. Use authorized
readback/recovery for uncertain effects, not another affirmative callback retry.

Port Authority still enforces same UID/boot/incarnation, protected caller ancestry,
explicit own-tree flag AND permission only between serialized steps, and no
unapproved listener/wrapper/descendant. An approved grant cannot override those
guards. Numeric PID/start-time checks are cooperative, not atomic pidfd protection
against adversarial reuse; stronger guarantees require verified host job/pidfd
supervision and approved adaptation. Signal delivery is not termination proof.

## 4. Exact Port Authority protocol, version 1

The current code-owned `scripts/host-capabilities.mjs` intentionally throws
unavailable for both exported functions. Integrate only against verified real
sources. No dynamic verifier path, environment-selected executable, unsigned local
approval store, or test-fixture fallback may become a working authority.

The trusted host provides:

```text
attestRuntime({binding, developmentRecord, deadlineAt, abortSignal})
  -> {protocolVersion:1, attestationId, environment:"development",
      projectRoot, bootId, expiresAt}
```

`developmentRecord` may be null; it is an untrusted locator/binding envelope.
`binding` is `{projectRoot, bootId, indicators}`; the current indicator names are
`nodeEnv`, `deployment`, `environment`, `devDomain`, each observed value or null.
Resolve trusted workspace/launcher/domain identity independently; the minimal
returned envelope does not itself prove omitted authoritative identity fields.
Resolve the actual host-issued record, identity, issuance, applicability,
freshness and revocation through protected transport on each check.

Failure Gate provides:

```text
beginReclaim({operationId, operation:"runtime.process-reclaim", manifest,
  binding, requestedScope, scopeDigest, attestation, deadlineAt, abortSignal})
  -> {protocolVersion:1, authorizationId, operationId, scopeDigest,
      attestationId, expiresAt, runBinding, checkBeforeSignal, recordOutcome}
```

`runBinding` is `{taskId, approvedPlanBinding, runId}`. Manifest v2 carries
`version`, `bootId`, `expiresAt`, `ports`, `processes`, `authorizationReference`,
`runBinding` and explicit own-tree permission where requested. None authenticates
itself. Validate the envelope and each process member BEFORE field access:
null, primitive/array members, malformed/duplicate PID/start-time identities and
invalid run/scope bindings return structured INVALID/UNKNOWN non-success with no
intent/delivery. An uncaught TypeError or bare exit 1 is a broken boundary, not a
normal cleanup result or accepted evidence. Validate fields against independent
approval/task/run/host records and the exact requested scope before claim.
The valid handle identifies the actual
claimed operation, not merely echoes request metadata. Expiry must not exceed
manifest or authoritative permission expiry. Future batches also need fresh
attestation; no grant extends an attestation's lifetime.

```text
checkBeforeSignal({operationId, binding, requestedScope, scopeDigest,
  attestation, signal, deadlineAt, abortSignal}) -> exactly true
recordOutcome({operationId, rawOutcome, signalOutcomes, scopeDigest,
  binding, deadlineAt, abortSignal}) -> exactly true
```

Both callbacks act on the same claim through protected Failure Gate routes.
The first revalidates current authority and durably journals signal intent before
exactly `true`; any other value, exception or unknown result blocks signals.
The second acknowledges durable storage only, not validation PASS or completion.
Accept truthful evidence for an already claimed operation after grant expiry or
revocation, with exact original bindings; this never authorizes additional action.
Port Authority re-attests before each batch, rechecks local ownership, then verifies
incarnation and authority/attestation expiry immediately before each actual signal.

Serialize `requestedScope` in exactly this object insertion order:

```json
{
  "ports": [8080, 8081],
  "processes": [{"pid": 12345, "startTime": "123456"}],
  "allowOwnTree": false,
  "signals": ["SIGTERM", "SIGKILL"],
  "graceMs": 3000,
  "killVerificationMs": 5000
}
```

These are illustrative, not approved identities/ports. Ports are numeric,
sorted/deduplicated; processes are PID-sorted `{pid,startTime}` objects with
unique valid numeric PIDs and digit-string Linux start times. Preserve string
start-time identity and the shown key order. `scopeDigest` is SHA-256 of UTF-8
`JSON.stringify(requestedScope)`, not whitespace JSON or a general sorted-key
serializer. Signals and 3000/5000 ms budgets match the current consumer.
Reconstruct the approved exact representation independently and compare both
scope and digest; hashing caller scope alone establishes nothing.

No wire-format adaptation is required for this documented version 1 mapping.
An actual host using different representations/policies must obtain its applicable
approval, document the bidirectional mapping and test both sides before wiring;
otherwise block. Do not modify Port Authority as part of skill-only authoring.

## 5. Bounded calls, uncertainty and recovery

Also apply [validation-budgets.md](validation-budgets.md) to validation and recovery:
all finite entry points need current approved limits, independent outer oversight,
shared remaining parent/attempt time and bounded evidence capture. Current Port
Authority requires explicit lease queue/hold values and monotonic elapsed timers;
its local supervision/read-only transient shutdown rechecks are not protected
cumulative authority. Those rechecks never retry claims, writes or signal batches.

Each adapter call has a two-second caller deadline plus an abort signal. Real
providers must be non-blocking, honor cancellation/deadline, and preserve the
stable operation ID. Timeouts, cancellation or lost claim/write responses may
follow a durable commit. A rejected or malformed handle also leaves claim state
uncertain unless independently reconciled; no signals or blind retry.

Retain authoritative single-flight/conflict exclusion for unknown claims and
living/uncertain workloads, preserving request ID and partial original evidence.
Do not unlink leases, age-delete transition mutexes, infer death from timeout/
heartbeat/child exit, re-run the CLI with a fresh operation ID, or launch replacement
work. Discover the separately authorized, bounded, verified recovery/read route
instead of inventing a function. It resolves the original commit and process
incarnations, records findings and only safely releases/resumes under current
permission. Recovery cannot silently bypass or grant a claim. Readback is not
permission to repeat a signal or re-consume a grant. Transactional claim/outcome
records cannot atomically commit OS signaling; retain intent/effect crash windows.

Port Authority's mandatory v2 boolean recoveryRequired is true from reservation
and through error/crash/uncertain cleanup; only healthy verified completion/release
writes false. Ordinary stale recovery needs compatible finalized false and no
surviving/unknown workload; true/unfinalized/legacy missing-field records never
become recoverable just because their owner died or no sidecar remains.
Failed mutating transitions retain sidecars. Never insert false, refresh a
revision, unlink/replace or retry from heartbeat age, raw zero or local quiescence.
Authoritative exclusion stays retained for error leases, unknown claims and
unacknowledged outcomes even when known local processes stopped.
The separately approved recovery route must bind exact task/plan/run/operation,
workspace/root/boot, canonical lease path/token, owned incarnations and preserved
incident/raw evidence; reconcile contenders and unknown original commits, verify
quiescence and receive actual checked durable recovery acknowledgement before
new work. See [staging-and-lifecycle.md](staging-and-lifecycle.md); missing real
recovery is BLOCKED, not implemented by writing this specification.

## 6. Production and admission lifetime

`NODE_ENV=production` and `REPLIT_DEPLOYMENT=1` are unconditional blockers, even
with a valid grant and development evidence. Never unset/spoof production markers.
Only `REPLIT_ENVIRONMENT=production` has a narrow host-attested development
exception: applicable domain PLUS fresh canonical-root/boot/live-ancestor launcher
binding. Local structural checks/reference strings alone do not admit it.
The current Port Authority development record additionally requires an absolute,
regular same-UID, single-link file without symlink/group/world-write permission,
matching root/boot/domain, actual live same-UID ancestor incarnation, nonfuture
issuance, future expiry and lifetime at most 15 minutes. These local checks precede
independent host verification; they do not issue proof.

Every live reclaim needs independent attestation even in an unmarked environment.
Unknown/unavailable/wrong/revoked/expired attestation or authorization blocks.
Queued validation rechecks admission before dispatch. Admission expiry after
authorized dispatch must not orphan the workload: preserve approved transitive
supervision, cancellation, owned-work termination and verified safe release.
This is not new launch permission or permission to reclaim unrelated processes.
New cleanup signals under expired/revoked grant or attestation remain prohibited.
Owned-work supervision uses the journaled private gate, independently registered
before dispatch with an own-session watchdog. Missing/failed registration blocks
dispatch; watchdog loss, owner stall/death and original-group timeout require
bounded exact owned-tree handling with retained error/exclusion. This cooperative
Linux /proc boundary cannot prove instantaneous escape, uninterruptible I/O or
remote containment; use verified host job/cgroup equivalents or block acceptance.

## 7. Actual evidence and acceptance

Journal claim/authorization/operation/task/run/plan/attestation identities,
independently approved scope/digest, signal intents, actual delivery results,
partial failures, confirmed termination/port checks and uncertainties. Preserve
raw operation and child outcomes separately from assessment. Storage acknowledgement
does not prove process termination, required-tier evidence or validated completion.
Local logs/reports do not become authoritative by copying them.

Port Authority's raw states remain FREE=0, CLEANUP_FAILED=1, INVALID/PROHIBITED=2,
PROTECTED_BUSY/SKIPPED=3, UNKNOWN=4. Evidence failure after raw FREE produces UNKNOWN
with retained raw outcome and recovery requirement; missing authoritative evidence
means Failure Gate assessment BLOCKED/INCOMPLETE, never accepted validation.
FREE is a point-in-time observation, not a port reservation. Confirm every exact
approved wrapper/descendant stopped, not merely listener closure. Uncertain or
surviving workloads retain exclusion.

Cleanup never substitutes for current-snapshot complete assigned-tier evidence.
Preserve owned baseline repairs; exact active/unexpired ignores with raw failures
and full coverage; exactly three authorized bounded isolation retries; direct
matching earlier task-unaffected provenance plus independent corroboration and
source lineage; separate coverage approval for quarantine/skip/filter/non-discovery;
all required steps/reports and rejection of crashes/unexpected zero-test runs.
Preserve checked task/plan routes, single-flight, writer coordination, budgets,
expiry/revocation, monitoring/automatic lookup and genuine independent callers.
Owner closure cannot discharge repairs or fabricate validation success.

## 8. Required verification

Use isolated labelled simulations for authoring/unit checks; never signal live
application processes as skill-writing smoke tests. A fixture model, Python lock
or passing package test is not protected transport or deployed readiness.
The separately approved host installation must implement and exercise the matrix
below against the real registry, protected providers and checked route, with exact
safe fixture/job scope and recorded activation evidence before readiness.

| Case | Required assertion |
|---|---|
| Valid exact route | Independent current host proof plus authentic exact human approval claims once, journals before authorized fixture signals, verifies all targets and records actual results. |
| Missing or forged source | Missing/unavailable provider/registry/transport, agent-written reference/actor/approved boolean or draft task authorizes no signal. |
| Binding substitution | Altered task/plan/run/operation, root/workspace/boot/attestation or exact ports/PID/start-time/own-tree/escalation/budgets fails before action. |
| Production and invalid attestation | Both hard flags defeat valid development proof/grant; domain/local record alone, wrong/revoked/expired host proof and unsafe context block. |
| Replay and concurrency | Same grant cannot replay via same or fresh ID; simultaneous and cross-run resource-conflicting claims yield one owner, no double signal. |
| Authority during escalation | Revoke/expire grant or host proof after SIGTERM; SIGKILL is blocked, partial intent/results remain, late truthful evidence may store without new signals. |
| Strict acknowledgements | Rejected intent or truthy non-true response permits no signal; missing/failed outcome acknowledgement never becomes accepted evidence. |
| Lost responses and deadlines | Timeout/cancellation/lost claim or write response preserves stable ID, commit uncertainty and exclusion; no blind retry, replacement or unlock. |
| Partial effects and survivors | Delivery errors/partial batches/listener-only exit do not prove full termination; surviving/unknown descendants keep claim exclusion and recovery requirement. |
| Recovery and crash windows | Separately authorized bounded readback reconciles original durable claim/write/intent and real incarnation/liveness; it cannot bypass claims or grant escalation. |
| Retained-error recovery | True/unfinalized/incompatible leases, including legacy missing disposition, block ordinary callers after known local quiescence without sidecars; only exact authorized reconciled/acknowledged recovery resolves exclusion. |
| Gate/watchdog | Independent registration precedes dispatch; owner stall/death and original-group timeout leave no known owned survivors; registration failure and watchdog loss retain error/exclusion. |
| Malformed shapes | Null/primitive/array/malformed process members and invalid envelopes/bindings produce structured INVALID/UNKNOWN, preserve listeners and generate no signal intent/delivery. |
| Evidence and coverage | Raw-success/incomplete-storage and copied reports cannot pass; ordinary tier/event, ignores/provenance/repairs, independent callers and owner closure remain unchanged. |
| Admission and supervision | Queue expiry prevents launch; expiry after authorized dispatch retains owned supervision, while expired/revoked cleanup authority prevents new reclaim signals. |

Record exact checks run, raw results, simulation versus actual host coverage,
unperformed activation proof and concrete blockers. Perform paired canonical
file/reference readback against the original specification and current Port
Authority contract; list contradictions/gaps before scoped patches. Confirmation
does not implement application features, publish skills, change production or
activate a draft/registry/approval.