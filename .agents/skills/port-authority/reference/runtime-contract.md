# Hardened runtime contract and acceptance

These scripts operate on Linux `/proc` and a local filesystem with exclusive
creation, rename, and directory sync semantics. Validate those capabilities.
Do not claim distributed, cross-workspace, or hostile-code exclusion.
Require Node 20+ and verified OS capabilities in the host manifest.

## Clean-split ownership and activation

| Owner | Responsibility | Not a substitute for |
|---|---|---|
| Trusted host/platform | independent runtime attestation and protected capability transport | domain/environment guesses or an agent-written audit |
| Failure Gate | human approval, exact task/approved-plan/run scope, checked claim, expiry/revocation, task single-flight, evidence acceptance | local manifests or Port Authority resource leases |
| Port Authority | inventory, ownership preflight, safe target signaling, termination/port checks, actual outcome submission | attestation issuance, approval issuance, coverage waivers |

Discover actual canonical sources, executable checked routes, trust boundaries,
and deployed activation before dependent wiring. This bundle contains NO real approval
registry, trusted platform attester, credential, public key, or host transport.
The code-owned `scripts/host-capabilities.mjs` intentionally throws unavailable.
It is an integration boundary, not a usable authority. Adapt it only against
verified independent sources under applicable approval; never select verifier
code by environment variable, dynamic path, caller command, or editable envelope.
Never ship the test-only adapter as a working host integration.

A draft Failure Gate update is not activation. If the requisite checked reclaim
capability is absent, live reclaim is BLOCKED even if Failure Gate does not yet
govern general project validation. Do not auto-install another skill. Prevention,
unmarked read-only inventory, and ordinary local lease supervision may remain
usable where their own applicable policy permits them. When Failure Gate does
govern validation, retain its existing checked execution and evidence requirements.

## Staged installation versus activation

These are reporting/acceptance states, not new authorization tokens or platform
APIs. Record each feature/caller separately; a verified lease or inventory does
not imply live reclaim is available.

| State | Evidence required | What it does not permit or prove |
|---|---|---|
| STAGED | applicable staging approval, verified canonical files/frontmatter/references, inert placement | overwriting active scripts, wiring callers, execution permission, host acceptance or task completion |
| NON_RECLAIM_VERIFIED | named controls/callers passed actual authorized admission, bounded execution and host-specific acceptance | development exception, reclaim, unrelated callers, missing required-tier evidence |
| LIVE_RECLAIM_ENABLED | real independent attestation, exact checked reclaim claim/rechecks, outcome acknowledgement and actual scoped caller acceptance | blanket future approval, production bypass, unrelated scope or automatic validation PASS |

### Staging gate

Read the actual current approved task and active Failure Gate policy first.
This skill allows partial progress only within their authorization. If that task
explicitly requires authority before any edits or tests, retain its gate and
obtain an authorized staged-task revision; never treat this skill update or a
draft replacement plan as approval to bypass it.

With applicable permission, inspect/copy canonical skill sources and stage
inactive runtime templates without live wiring. Use a separate inactive location
if a same-path copy would replace an active script. Do not add startup hooks,
change package/workflow commands, restart services, delete locks or signal existing
listeners. Observe current revisions/running work and refresh stale task bindings.
Keep all sources/reports outside `.local`; temporary fixture state is distinct.

Report isolated checks independently as PASSED, FAILED, BLOCKED or NOT_RUN.
An unavailable authorized test route may leave files STAGED with checks BLOCKED;
it cannot become a suite pass or operational acceptance. Failed/missing source
integrity cannot satisfy STAGED. Run the bounded bundle suite twice when its
separate scope/permission permits it, before any dependent operational activation.
The matrix remains mandatory for adapted implementations; blocked host assertions
stay blocked, not “not applicable” merely because the authority is missing.

Missing attestation/reclaim capability does not itself prohibit inert staging,
permitted read-only audits or explicitly authorized isolated fixture checks.
Fixtures may copy canonical runtime modules and simulate authority only inside
private test directories. This is not a genuine host-development exception,
approval source, checked task run, required-tier evidence or activation proof.
Do not install a fixture adapter in a genuine runtime or strip real production
flags to make host checks pass. Bound every permitted test with the same timeout
and termination requirements; never bypass a missing Failure Gate capability by
calling a package script directly or relabeling host acceptance as a fixture.

### Non-reclaim activation gate

Discover whether Failure Gate actually governs this project's validation.
If active, its verified checked execution/evidence route remains mandatory for
required tiers; diagnostics retain their separately authorized bounded route.
If inactive, use the verified existing host policy and finite runner rather than
demand a fictitious Failure Gate API. Record policy status/evidence; unknown
applicability cannot be treated as inactive or independently approved.

Named prevention, permitted read-only inventory, or ordinary local lease
supervision may be activated only after their actual runtime admission,
authorization, finite budgets, conflict coverage and applicable caller checks
pass. A production-marked context requiring the attested development exception
still blocks that control without real attestation; staging does not exempt it.
A non-reclaim control must not invoke unavailable cleanup implicitly through
pre/post scripts, nested aliases or startup hooks. Inspect transitive callers.
Do not silently remove an existing safety dependency to make activation pass.

Use Phase 9's two consecutive authorized real host runs for these controls with
current-snapshot evidence, unchanged applicable coverage and no manual cleanup.
Check relevant health, raw failure propagation and lease release. Forced reclaim
is tested only when that capability is authorized and genuinely enabled; a
blocked reclaim feature is neither a prerequisite for unrelated staging nor an
excuse to accept a dependent caller. State the exact verified/blocked controls.

### Project-specific implementation and acceptance

When the user authorizes project implementation/acceptance rather than only
staging, use this sequence within the actual approved scope. Updating this skill
does not authorize changing a project. Source/archive parity proves integrity,
not trusted authorization integration, installed lock wiring or API health.
Do not finish a project implementation task at file placement when approved
integration and acceptance remain actionable.

1. Audit the current project: canonical authorization/Failure Gate sources and
   policy status; actual host runtime configuration and trust boundaries;
   existing cleanup/locks; package aliases, pre/post hooks, tier/diagnostic
   runners, workflows, nested callers; shared ports, generated outputs and DB
   state; backend health contract, browser routing and existing test harness.
   Treat reported findings as leads and verify current behavior read-only.
   Do not assume a Studio frontend, framework, provider, route or package manager.
2. Plan the permitted implementation with a Regression Guard, explicit validation
   and per-control acceptance criteria. Distinguish inert staging, non-reclaim
   controls and live reclaim. Preserve approved task/plan/run bindings, coverage,
   production guards, budgets and retained leases. Do not reinterpret a stricter
   task or draft plan as approval. Obtain exact disruption authorization before
   signaling active services, changing live callers or performing a disruptive
   cutover. Do not change production without its separate explicit authorization.
3. Implement actual independently trusted provider integration where in scope.
   Adapt the code-owned host boundary to the verified platform attestation and
   checked reclaim/claim/recheck/outcome routes, reusing genuine existing
   protected infrastructure. A local manifest, boolean, mock or invented API is
   not a trusted authorization integration. Do not install the fixture adapter
   or weaken guards. If a capability is absent, identify the exact authoritative
   provider/route/permission dependency and keep dependent cleanup BLOCKED.
   Continue only independently authorized work; transitive cleanup dependencies
   remain blockers. Never claim interface documentation implemented a provider.
4. Adopt the audited existing lock or adapt the canonical template only where
   actual conflicts require serialization. Install the project implementation
   and wire actual conflicting callers under approved cutover; a staged lock
   file is not installed lock wiring. Map every conflicting alias, hook, nested
   runner and workflow to the same canonical lock identity or verified common
   acquisition order. `global` is not hierarchical, and a composite lock does
   not conflict with constituent names. Check finite queue/execution/cleanup
   limits, admission and raw failure propagation. Non-conflicting callers need
   no invented lock but still need finite transitive supervision.
5. Repair the actual health probe under the API health acceptance below.
   For browser callers, including a Studio probe when present, test the browser's
   real routed request rather than just a direct backend curl or a fixture-only
   helper. Use existing project infrastructure; do not add an unnecessary API.
6. Execute applicable authorized acceptance twice consecutively on current
   inputs without manual port/process/lock cleanup between runs. Retain real
   route, scope, limits, revision, raw outcomes and assessment evidence. Active
   Failure Gate requires its checked routes; verified inactivity uses existing
   host policy; unknown applicability blocks the affected decision. Isolated
   bundle tests cannot replace these real project runs.

For live reclaim being enabled, acceptance must prove authorization denials
cannot signal and exact approved operations use genuine providers and persist
acknowledged outcomes. For applicable serialization, prove wired conflicting
callers cannot overlap. An uncovered/unwrapped conflicting alias or alternate
lock path fails wiring acceptance. Test positive/skip/rejection
paths applicable to that project; do not trigger live reclaim merely to prove
the template is installed. Live tests require the separate exact authorization.

Report named controls/callers as STAGED, NON_RECLAIM_VERIFIED or
LIVE_RECLAIM_ENABLED only with their existing required evidence. Record failed,
blocked and not-run checks separately, with exact missing dependencies and
unchanged caller inventory. Source parity is not operational readiness. Do not
close the project task as validation passed with incomplete applicable proof.

### API health acceptance

For a backend/API project, discover its actual health endpoint and code-owned
response contract; `/api/healthz` is an example, not a required new route.
Require the expected successful HTTP status, JSON media type (`application/json`
or a documented JSON-compatible `+json` type), successful JSON parsing and the
exact required fields/types/values indicating healthy service. Check service
identity/version when the existing contract supplies it. Do not invent universal
`ok:true` or `status:"ok"` fields or assume JSON alone proves health.

Reject HTML with HTTP 200, SPA/login fallback, missing or incorrect content type,
malformed JSON, unexpected redirects, unhealthy values and wrong-shape/wrong-service
responses. Use the actual proxy/base URL/path and applicable request method/
authentication. Never log credentials or sensitive diagnostic bodies. A non-JSON
legacy probe cannot satisfy this JSON API acceptance: use an existing verified
JSON endpoint or perform a separately approved compatible endpoint/probe change.
Record a blocker if that contract change is outside the approved scope.
Static-only projects need no invented backend; record that applicability rather
than pretending a frontend document is API health.

Require automated positive and negative regressions against the actual probe.
Include valid healthy JSON; HTML with HTTP 200 through the same frontend routing;
missing/wrong media type; malformed JSON; wrong fields/types or service identity;
unhealthy JSON; unexpected redirects; HTTP failure; and network failure/timeout.
Discover approved finite request/cumulative limits and verify abort/cancellation;
a hanging health request cannot pass or outlive its authorized boundary.
Exercise browser/proxy behavior where applicable, using isolated supported
route/browser fixtures for outage/negative cases. Do not disrupt production or
stop a live service just to generate a negative response. Fixture passes are
regression evidence, not proof that a genuine backend is healthy.

### Live reclaim activation gate

All existing independent host attestation, exact Failure Gate task/plan/run scope,
atomic claim/replay/conflict protection, per-signal authorization, production,
ownership and evidence rules remain unchanged. Missing provider/checked route
keeps reclaim and the development exception BLOCKED. Do not synthesize authority,
weaken guards, or claim operational installation from fixture passes.
Actual live checks require explicit approval for the exact disruption and targets,
including applicable grace/escalation and outcome storage. Do not signal a
current service merely to finish an installation checklist.

### Cutover, failures and reporting

Keep existing work and live caller wiring untouched until a separately authorized
cutover. If legacy cleanup is fail-open or leaks processes, record it as an
unresolved risk; staged templates do not repair it, authorize another sweep or
establish that retained wiring is safe. Propose scoped remediation under the real
approval flow; do not disable/restart services or add another bypass unilaterally.
Independent reported findings (for example wrong health-probe routing) remain
separate defects, not evidence of successful Port Authority adoption.

After failed activation, prevent the new control from being accepted/enabled.
Restore only the authorized prior wiring when safe and applicable; if that wiring
is itself unsafe or rollback is uncertain, retain the blocker and seek approved
remediation rather than calling it a working baseline. Record per-control state,
source hashes/current revision, actual checks and route/budget/evidence references,
unchanged callers, legacy risks and exact missing capabilities. Do not describe
staging as “installation complete” or close an incompletely validated task.

The module exposes these bounded, non-blocking, code-owned interfaces:

- `attestRuntime({binding, developmentRecord, deadlineAt, abortSignal})`, owned
  by the trusted host, returns `{protocolVersion:1, attestationId,
  environment:"development", projectRoot, bootId, expiresAt}`. Verify the real
  source, identity, applicability, current revocation and freshness; the envelope
  is only a locator. Bind workspace identity/domain/launcher to the host source.
- `beginReclaim({operationId, operation:"runtime.process-reclaim", manifest,
  binding, requestedScope, scopeDigest, attestation, deadlineAt, abortSignal})`,
  owned by Failure Gate's checked route, independently resolves approval and
  verifies task, approved plan, run, project/workspace, boot/attestation, exact
  target/port scope, own-tree permission, SIGTERM/SIGKILL escalation and budgets.
  Atomically claim one operation; reject replay/concurrent conflicting claims.
- Its returned handle must provide `{protocolVersion:1, authorizationId,
  operationId, scopeDigest, attestationId, expiresAt, runBinding,
  checkBeforeSignal, recordOutcome}`. Expiry cannot exceed manifest expiry.
  `checkBeforeSignal` receives the same binding/scope/operation and current
  attestation plus signal. Recheck live authorization/revocation and durably
  journal intent before returning exactly `true`; escalation belongs to the
  same claim, not a second use of the grant.
- `recordOutcome({operationId, rawOutcome, signalOutcomes, scopeDigest, binding,
  deadlineAt, abortSignal})` durably records actual outcomes through the
  authoritative Failure Gate evidence route and acknowledges with exactly
  `true`. Acknowledge storage, not validation acceptance. Preserve failures,
  partial signals and uncertain operations; never fabricate a pass.
  Capture evidence for an already claimed operation even after grant
  expiry/revocation; this grants no permission for additional signals.

`binding` carries canonical project root, current kernel boot and observed
environment indicators. The provider independently resolves trusted workspace
identity: these indicators and filesystem paths cannot attest themselves.
`requestedScope` is a fixed-order object containing sorted/deduplicated `ports`,
PID-sorted `processes` of `{pid,startTime}`, `allowOwnTree`, `signals` in
`["SIGTERM","SIGKILL"]` order, `graceMs:3000`, `killVerificationMs:5000`.
`scopeDigest` is SHA-256 of UTF-8 `JSON.stringify(requestedScope)`. Failure Gate
must compare this to independently approved exact scope, not merely hash the
caller-supplied object. Approval must include every escalation that may occur;
providers requiring a different policy must block or use an approved adaptation.

Each adapter call has a two-second caller deadline and an abort signal. Real
adapters must honor cancellation and must not block the JS event loop. A timed-out
claim/write may have applied: journal a stable `operationId`, retain single-flight
state, and reconcile via an authorized recovery/read route. Never blindly retry
or launch a replacement. Unknown claims and uncertain/living workloads retain
the authoritative exclusion; only verified outcome/recovery can resolve it.
Local source code or a passing fixture cannot establish deployed capabilities.

## Cleanup contract

```sh
node scripts/free-ports.mjs --dry-run --ownership-manifest /verified/scope.json 8080
node scripts/free-ports.mjs --authorized-cleanup --ownership-manifest /verified/scope.json 8080
```

Without action mode, busy ports are inventoried but no signals are sent.
Without a manifest, a busy port is protected. A free-port observation is not
a reservation; coordinate startup/bind with the host allocator/lifecycle.
Both applicable TCP tables must be readable. An absent IPv6 table is omitted
only when the kernel module explicitly reports IPv6 disabled and the kernel
protocol inventory has no TCPv6 support. Missing/denied discovery without that
positive capability evidence remains UNKNOWN.

Failure Gate's checked route produces an authorized manifest v2 using audited
Port Authority discovery. The object itself remains untrusted input:

```json
{
  "version": 2,
  "bootId": "<actual /proc/sys/kernel/random/boot_id>",
  "expiresAt": 1234567890000,
  "ports": [8080],
  "processes": [{"pid": 12345, "startTime": "<actual /proc stat field 22>"}],
  "authorizationReference": "<locator for authoritative Failure Gate approval>",
  "runBinding": {
    "taskId": "<actual authorized task>",
    "approvedPlanBinding": "<actual approved plan binding>",
    "runId": "<actual checked run>"
  },
  "allowOwnTree": false
}
```

Values above are illustrative, not ready-to-use identities or authorization.
The host verifies the independent environment; Failure Gate verifies the actual
decision and exact targets before atomically claiming the operation. The script
also validates structure, run binding, expiry, scope, same UID, boot/incarnation,
protected caller ancestry and descendants. Neither a local manifest nor
`--authorized-cleanup` authenticates approval. Manifest v1 is no longer admitted
for action; migrate via the actual checked route, never by merely adding fields.

Include only approved stale listeners and their audited wrappers/descendants.
No wrapper is inferred from names. Any unapproved live descendant, listener,
changed incarnation, missing ownership, or expired manifest blocks the action.
An own-tree target additionally requires manifest `allowOwnTree: true` and
`--include-own-tree`, permitted only BETWEEN serialized steps. Ancestors of
cleanup are never targets.

`NODE_ENV=production` and `REPLIT_DEPLOYMENT=1` are unconditional blockers.
`REPLIT_ENVIRONMENT=production` blocks unless the verified development exception
below applies. A domain alone never overrides a production indicator.
Disabled/recursive invocations return skipped/non-success. Exit/status semantics:

| Exit | State | Meaning |
|---|---|---|
| 0 | FREE | complete socket discovery says no listener; after action, exact targets stopped |
| 1 | CLEANUP_FAILED | owned workload/port did not reach the required state |
| 2 | INVALID / PROHIBITED | bad input, hard production flag, or unverified production-marked context |
| 3 | PROTECTED_BUSY / SKIPPED | no action authorization, protected target, or disabled/recursive |
| 4 | UNKNOWN | discovery, attestation, authorization, evidence, identity or recovery uncertainty |

Every action requires independent host attestation, including an unmarked
environment, before Failure Gate's checked grant. Read-only free-port inventory
is only an observation, not proof of host identity or permission to reclaim.
Before each signal batch, re-attest and recheck the claimed grant. A changed
attestation ID requires renewed authorization, not an implicit scope upgrade.
Ownership/ancestor/descendant guards remain mandatory even after authorization.

Record actual operation outcomes once, including denial/failure after a claim.
After signals, known transient ENOENT/ESRCH or unmapped-listener snapshots may
receive read-only rechecks within the existing finite termination budget, with
observations logged and included in raw evidence. Permission/capability errors
still block immediately. Require a complete known final snapshot before success
or escalation; a persistent discovery gap remains UNKNOWN. This never retries
claims, writes or signals, and does not change pre-action discovery/authorization.
If evidence storage fails, return UNKNOWN/non-success and retain `rawOutcome`
and operation identity; a raw cleanup success cannot stand in for recorded
evidence or Failure Gate acceptance. Before a claim is established, record the
local blocker without pretending authoritative evidence was stored.

Target signaling rechecks Linux start time immediately before each numeric-PID
signal. Node does not expose pidfd signaling here: this is cooperative identity
checking, not atomic anti-PID-reuse protection under adversarial churn. Hosts
requiring that stronger guarantee must provide pidfd/job-identity supervision
and test it before acceptance. Never market the template as a security sandbox.

## Verified development-workspace exception

Some audited hosts may report `REPLIT_ENVIRONMENT=production` inside a Replit
development workspace. Do not assume this universally or infer it merely from
`REPLIT_DEV_DOMAIN`. BOTH `scripts/runtime-environment.mjs` and
`scripts/host-capabilities.mjs` must be installed beside either consumer.

Before enabling the exception, independently audit the execution context using
current host/platform evidence: identify the actual development workspace,
project root and managed launcher ancestry, inspect deployment configuration and
actual deployment indicators, and confirm this launcher is not a deployment.
Resolve the independently issued host attestation through the verified provider,
not just a narrative audit. Record evidence under the currently active policy.
A draft Failure Gate application task is not active governance.
Remembered guidance or an existing script is not execution-context evidence.
Never unset or spoof production markers to make the scripts run.

The audited host launcher supplies `PORT_AUTHORITY_DEV_CONTEXT_FILE`, an absolute
path to a regular same-UID file, with no symlink, hard link, or group/world-write
permission. Prefer mode `0600`. Use private disposable runtime state, not a
committed approval record. Its contents (all placeholders must be replaced):

```json
{
  "version": 1,
  "kind": "replit-development-workspace",
  "bootId": "<actual current kernel boot id>",
  "projectRoot": "<canonical realpath of the runtime working directory>",
  "devDomain": "<exact current REPLIT_DEV_DOMAIN>",
  "supervisor": {"pid": 12345, "startTime": "<actual live launcher start time>"},
  "issuedAt": 1234567890000,
  "expiresAt": 1234568490000,
  "verificationReference": "<actual host audit reference>",
  "attestationReference": "<actual independently issued host attestation ID>"
}
```

The launcher must remain a live same-UID ancestor of each consumer. The record
must match boot, real working directory and domain; issuance cannot be in the
future, expiry must be in the future, and its total lifetime cannot exceed
15 minutes. Audit/refresh evidence before launch and ensure it remains fresh
through any queue wait or new cleanup signals. Relative/missing/malformed/stale
records, unknown context, unsafe files, or unverified ancestry block admission.
Do not generate this record just from environment variables or the example.

The helper checks local binding THEN calls the code-owned host attestation
provider. Structural validity alone never admits the exception. The real provider
must independently verify platform identity and applicability. A local file,
reference string and CLI environment cannot authenticate permission against a
caller who can edit them. Missing/unavailable/revoked provider or invalid
attestation blocks admission. Human reclaim approval belongs separately to
Failure Gate. Neither hard blocker can be overridden even by a valid record.

Both scripts log admitted exceptions. Cleanup rechecks admission before each
signal batch; expiry before escalation prevents new signals and reports non-success
with recovery required. Locking rechecks before queued child dispatch. Expiry
after admission does not disable supervision, cancellation, owned-work termination
or verified release of an already dispatched child. Never orphan admitted work
merely because its admission record expired.

Existing domain-only overrides require this approved migration; they are not
automatically accepted as equivalent. Test the adapted implementation against
both the valid exception and every rejected path before accepting host wiring.

## Lease v2 contract

```sh
VALIDATION_LOCK_TIMEOUT_MS=5000 VALIDATION_LOCK_MAX_HOLD_MS=60000 \
  node scripts/validation-lock.mjs --resource test-db --priority 3 -- node test-command.mjs
```

All conflicting callers must resolve the SAME canonical lock file. `global`
does not exclude another resource name. For an operation needing database AND
browser resources, either every affected caller adopts the same common lock,
or every caller acquires all relevant resources in one globally consistent
order. Publish and review the conflict map, including hooks and independent
cooperating validation entry points. Uncoordinated CI/remote callers remain
outside this local exclusion boundary.

The default path is disposable `.local/validation-lock-<resource>.lock`
relative to the installed runtime script's project root. Overrides:

- `VALIDATION_LOCK_FILE`: exact lock path; same name/different file is not shared.
- `VALIDATION_LOCK_WAITERS_DIR`: disposable priority manifests.
- `VALIDATION_LOCK_TIMEOUT_MS`: REQUIRED explicit queue-wait limit.
- `VALIDATION_LOCK_MAX_HOLD_MS`: REQUIRED explicit owner's execution limit after
  acquisition. Examples are illustrative, not authoritative host-approved limits.
- `VALIDATION_LOCK_POLL_MS`: positive integer milliseconds, default 100.
- `VALIDATION_LOCK_HEARTBEAT_MS`: default 1000.
- `VALIDATION_LOCK_STALE_HEARTBEAT_MS`: default 10000, greater than heartbeat;
  a health indicator, NEVER permission to steal a live lease.
- `VALIDATION_LOCK_STOP_GRACE_MS`: SIGTERM grace, default 3000.
- `VALIDATION_LOCK_STOP_KILL_MS`: bounded post-SIGKILL verification, default 5000.
- `VALIDATION_LOCK_PRIORITY_GRACE_MS`: advisory priority grace, default 2000.

All duration values must be integer milliseconds in `1..2147483647`; missing
queue/execution values, zero, negative, NaN, Infinity and timer overflow fail
before enqueue/dispatch. Hosts must additionally restrict these values to their
independently approved bounds. Environment values are configuration, not approval.
Migration: callers formerly relying on implicit three-hour queue/two-hour
execution defaults now fail until both limits are explicitly supplied through
their authorized route. Do not copy those old defaults as presumed approved
limits. Audit aliases, nesting and runtime copies before an authorized cutover.
Elapsed queue, execution, transition and termination deadlines use monotonic time;
wall-clock timestamps remain evidence/lifetime metadata, not elapsed timers.
Pre-launch admission may not dispatch after cancellation or execution expiry.
The wrapper reports its effective limits and local-supervision-only status.
Budget breach takes precedence over raw zero exit at/after the deadline.
Manifest, lease, waiter, transition and development-context JSON inputs use
nonblocking/no-follow descriptor opens, regular-file/ownership checks and byte
bounds. FIFO/device/oversized inputs cannot block a pre-dispatch JSON read.
Kernel/filesystem stalls still require the independent outer watchdog; these
checks are not a hostile-code or uninterruptible-I/O guarantee.

Queue timeout returns 3; blocked discovery/recovery returns 4. Invalid or
production input returns 2. A completed child propagates its raw exit code.
Budget/cancellation/spawn/lifecycle cleanup failure returns nonzero, while
structured output preserves raw child status separately. Do not interpret a
child's raw zero as success when supervision failed. Command strings/arguments
are not printed by the wrapper; the child controls its own log content.

Reentry uses path-keyed `VALIDATION_LOCK_CONTEXT_<sha256>` with a verified
ancestor lease chain. Each nested invocation acquires a sibling slot under its
parent token. Parallel siblings serialize; deeper sequential nesting is allowed.
This assumes parents delegate conflicting mutation sequentially, not continue
mutating the resource alongside children. PID-only legacy context is rejected.
Context is cooperative state, not cryptographic authorization.

The lease persists boot identity, token, owner/start time, phase, group,
observed descendant identities, acquisition and heartbeat times, plus the
mandatory boolean `recoveryRequired`. New reservations set it true BEFORE any
dispatch and never clear it on a supervision error, crash or uncertain cleanup.
Only a verified healthy completion/release transaction writes false; its durable
write and unlink share the same transition. A failed mutating transition retains
its sidecar even when the ordinary finally block runs. Read-only rejection does
not manufacture an abandoned mutation. This field is lifecycle evidence, not a
human authorization token, checked task approval or genuine host recovery route.
Guarded
transitions use an atomic sidecar directory. Interrupted/corrupt sidecars are
never age-deleted: they require separately authorized host recovery with
contenders reconciled/stopped. Similarly, a launch-intent record without known
child identity remains blocked, not guessed to be empty.

Stale heartbeat/max-hold never allow another caller to reclaim live ownership.
The owning wrapper enforces its budget, stops owned processes, and verifies
quiescence before release. Dead-supervisor auto-recovery requires a compatible
finalized (`phase:"finished", recoveryRequired:false`) lease and no remaining
group/observed workload. A retained true flag or unfinalized phase blocks ordinary
recovery even after the recorded workload stops. Older v2 leases lacking the
field are incompatible: reconcile them through actual separately authorized
host recovery, never just add false or erase a sidecar. Discover whether older
callers/copies still run before any approved cutover; all cooperating callers
must use the same accepted contract. Unknown or surviving work remains blocked.

Commands run behind a private IPC startup gate in a separate process group/session.
The gate's identity is durably journaled and independently registered before
user code can start. A second Node process, in its own session, watches the
owner incarnation and the same remaining monotonic execution deadline. It
continuously observes group/descendant identities, survives an original-group
GNU timeout, and enforces bounded TERM/KILL cleanup if the owner stalls/dies.
The registered watchdog PID/start-time is journaled as lifecycle evidence.
Watchdog registration/handshakes are bounded at two seconds; failure blocks
dispatch. Its private worker modes reject ordinary CLI invocation without IPC.
No command arguments are logged by these workers.

Normal and expected budget/cancellation completion both require independent
quiescence acknowledgement before release. Failed/uncertain
completion never releases retained exclusion. The watchdog cannot issue reclaim
approval, delete a lease, mark a validation PASS or authorize a replacement.
Discovery tracks that group
and observed descendants by start time; child exit, SIGTERM delivery, or timeout
does not prove termination. A surviving descendant is cleaned up and makes the
run fail. SIGKILL verification is bounded; uncertainty retains ownership.
Newly observed owned descendants receive the current termination signal. On a
supervision/journal error, attempt bounded owned-tree cleanup without requiring
successful journal writes. Discovery failure permits only best-effort exact-known
target cleanup; it cannot prove quiescence. Error-path leases remain retained,
even if local cleanup succeeds, pending separately authorized reconciliation.

Commands/hooks/workers must NOT daemonize, double-fork, deliberately escape
groups, or start untracked remote jobs. Polling cannot prove detection of every
instantaneous escape. Approve and inspect transitive scope before wiring.
Where such scope cannot be ruled out, use a verified host cgroup/job supervisor
or block the safety claim. These resource leases do not implement Failure Gate
task single-flight, monitor, authorization, or evidence acceptance.

## All-entry-point timeout acceptance

Every finite validation launch needs an enforced budget, regardless of tier,
duration expectation or whether serialization applies. Inventory package aliases,
pre/post scripts, nested runners, workers, server startup, global setup/teardown,
tests and hooks, diagnostics, three isolation retries, and snapshot comparisons.
Watch/server commands cannot masquerade as finite validation. Untracked remote
work must be covered by an actual verified provider cancellation/job deadline or
blocked; stopping a local client is not remote termination.

When Failure Gate is verified active, required-tier runs use its checked
task/approved-plan route. When verified inactive, use verified existing host
policy and equivalent bounded supervision; unknown applicability remains blocked.
When the
audited host runner (for example `scripts/run-tier.mjs`) enforces registry limits,
do not bypass it with a direct package command. A direct command is allowed only
under its separately authorized bounded diagnostic/other capability AND an
equivalent verified supervisor; it is not automatically accepted tier evidence.
There is no such host runner or genuine registry in this bundle.

Require finite queue, per-step execution, startup/teardown/termination, evidence
capture, and parent/cumulative attempt limits. Preserve remaining parent time
across nested wrappers, resource changes, retries and recovery. Local independent
MAX_HOLD values do not establish a shared parent budget. The host must enforce a
protected outer deadline/cancellation boundary across the complete approved tree,
including independently launched nested sessions. Stop admission when remaining
time cannot cover authorized cleanup. Expiry never allows a new workload to start,
but does not abandon supervision of work already started under approval.

For Node tests require explicit finite `test(..., {timeout:...})`/suite-inherited
timeouts AND hook timeouts, or verified supported runner-wide equivalents.
Probe the installed Node version before choosing CLI flags: Node 20+ support
does not imply every newer test-runner flag exists. Audit overrides such as
Infinity and missing inherited limits. Passing TAP/spec output does not disclose
effective timeout configuration; report it explicitly from verified wiring,
including missing/disabled limits. Per-test cancellation is not process cleanup.
An event-loop-blocking test, hung worker, hook or subprocess must be terminated
by an independent finite outer supervisor. A shell/tool timeout is supplementary
unless transitive termination and evidence have actually been demonstrated.

Record route/command identity, approved limit source, selected/effective limits,
queue versus execution elapsed time, parent remainder, observed load, raw exit,
deadline/cancellation reason, descendant termination, retained exclusion and
evidence acknowledgement. A late raw zero, pipeline masking, swallowed timeout,
test cancellation or missing report cannot become validated success. Prove this
with deliberately hanging asynchronous, synchronous, hook and subprocess fixtures,
late zero exit, nested/retry cumulative exhaustion and uncertain cleanup. These
host-wiring proofs are separate from isolated bundle regression evidence.

## Mandatory adversarial acceptance matrix

Run the following twice sequentially from the skill directory. Bundle tests use
explicit 30-second test and 5-second fixture-hook timeouts. The supervised mode
copies canonical runtime modules into a private fixture, supplies its explicit
test-only environment and launches the suite through that fixture's local wrapper
with a 180-second execution deadline. It does not alter the real caller's flags,
configure the shipped authority adapters or prove host admission/authorization:

```sh
node tests/hardening.test.mjs --supervised
```

Add an independent external watchdog with a finite deadline allowing the wrapper's
termination grace and verification; verify it owns the whole fixture tree.
The harness preserves its state on a retained outer lease; never blindly delete
that state. Fixture cleanup is separate from genuine host recovery. Signals
target fixture-owned identities. A direct invocation of the shipped wrapper in
an unverified production-marked environment still blocks; do not strip real flags
or install a simulated adapter to bypass host admission. Run real host-wiring
acceptance only through its separately authorized verified route.

| Boundary | Required assertion |
|---|---|
| Input/production | malformed inputs fail; hard production PLUS valid dev evidence cannot launch/signals |
| Development exception | domain alone blocks; audited root/boot/live-ancestor-bound fresh record admits |
| Independent attestation | a plausible local record without actual provider backing still blocks |
| Checked reclaim | missing/unavailable source, forged reference, altered scope/run, replay and conflicting concurrent claims cannot signal |
| Authority lifetime | revocation/expiry before escalation blocks new signals; partial outcomes remain recorded |
| Evidence source | failed authoritative storage preserves raw outcome but blocks successful completion |
| Capability deadlines | unknown/timed-out claims are not retried; no signals or replacement |
| Invalid context | missing/expired/unsafe/out-of-scope/unverified records block without signals/dispatch |
| Context lifetime | expiry during queue prevents dispatch; expiry after dispatch preserves owned-work supervision; expired cleanup context prevents escalation |
| Discovery | unreadable socket tables return UNKNOWN; never a false FREE |
| Protected busy | unapproved listener and caller-tree holder remain alive; non-success |
| Manifest identity | expiry, wrong boot/start time, extra descendant block all signals |
| Dry-run | exact target inventory changes no processes and remains busy/non-success |
| Authorized action | exact fixture target stops; unrelated fixture survives; port is free |
| Full target cleanup | closing listener alone cannot hide an approved surviving wrapper |
| Normal lease | child 0/7 propagate and remove owned lease; missing executable fails safely |
| Live/aged lease | no takeover/overlap of a live or stale-heartbeat holder |
| Cancellation | retain exclusion until SIGTERM-resistant owned work actually stops |
| Parent/descendants | child exit cannot yield a pass while descendants remain active |
| Dead owner | quiescent compatible lease recovers loudly; surviving/unknown work blocks |
| Reentry | forged PID/token/path cannot bypass; nested sequential calls finish |
| Parallel reentry | inherited-context siblings cannot overlap |
| Resource graph | shared resource conflicts serialize; disjoint resources may overlap |
| Crash transitions | malformed legacy lease, launch gap, abandoned transition block |
| Skill gates | budget gate remains independent when serialization is skipped |
| All-entry-point budgets | missing/zero/infinite/overflow limits block; direct package scripts remain bounded |
| Deadline ordering | wall-clock reversal does not extend elapsed budgets; late raw zero cannot pass |
| Outer supervision | hanging async tests, sync-blocked tests and hooks cannot outlive owned supervision |
| Error lifecycle | journal failure triggers bounded termination; uncertain/retained leases prevent replacement |
| Late descendants | new owned work observed during grace/escalation is signaled; no early release |
| Blocking inputs | FIFO/symlink/oversized JSON fails or is safely ignored as advisory priority; no blocked read |
| Shutdown snapshots | transient read-only gaps are recorded; persistent/permission errors block escalation and success |
| Retained errors | transient journal/discovery faults block ordinary replacement even without an abandoned sidecar; missing recovery disposition blocks legacy auto-recovery |
| Independent watchdog | stalled/dead owner and original-group timeout leave no known owned fixture survivors; no command dispatch before independent registration |
| Manifest members | null/primitive/array/malformed process entries return structured INVALID and send no signals |
| Project integration | file parity is not activation; genuine providers and real checked acceptance are verified or dependent controls remain BLOCKED |
| Lock wiring | conflicting actual entry points share verified lock identity/order; uncovered aliases fail acceptance; independent callers retain finite budgets |
| API health | actual browser/API path validates expected status, JSON media type/body and healthy fields; HTML-200 and other malformed/unhealthy responses cannot pass |

Map each assertion to adapted code, not only to the bundled implementation.
Check approved host callers, exact scope, resource conflict map, real ports,
health endpoints, managed workflows, selected validation coverage, reports,
and Failure Gate checked-route evidence separately. Missing applicable proof
blocks dependent activation/readiness, not otherwise authorized inert staging.
Never waive blocked assertions or substitute fixtures for deployed host outcomes.

The local watchdog is still cooperative Linux `/proc` supervision, not a cgroup,
pidfd guarantee, hostile-code sandbox or uninterruptible-I/O solution. The
independent watchdog's own inability to discover/stop work remains uncertain
and requires retained host exclusion/recovery. Hosts must test their real outer
boundary, including watchdog failure and remote work. Do not claim that GNU
timeout alone owns all sessions, or copy caller-controlled limits as host approval.