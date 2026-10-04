# Hardened runtime contract and acceptance

These scripts operate on Linux `/proc` and a local filesystem with exclusive
creation, rename, and directory sync semantics. Validate those capabilities.
Do not claim distributed, cross-workspace, or hostile-code exclusion.
Require Node 20+ and verified OS capabilities in the host manifest.

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

The verified host generates a narrowly scoped expiring manifest:

```json
{
  "version": 1,
  "bootId": "<actual /proc/sys/kernel/random/boot_id>",
  "expiresAt": 1234567890000,
  "ports": [8080],
  "processes": [{"pid": 12345, "startTime": "<actual /proc stat field 22>"}],
  "authorizationReference": "<verified host decision reference>",
  "allowOwnTree": false
}
```

Values above are illustrative, not ready-to-use identities or authorization.
The host verifies the actual decision and targets BEFORE launch; the script
validates structure, expiry, scope, same UID, boot/incarnation, protected caller
ancestry, and descendants. Neither a local manifest nor `--authorized-cleanup`
authenticates approval against a caller who can write both.

Include only approved stale listeners and their audited wrappers/descendants.
No wrapper is inferred from names. Any unapproved live descendant, listener,
changed incarnation, missing ownership, or expired manifest blocks the action.
An own-tree target additionally requires manifest `allowOwnTree: true` and
`--include-own-tree`, permitted only BETWEEN serialized steps. Ancestors of
cleanup are never targets.

Production flags win over development markers. Disabled/recursive invocations
return skipped/non-success. Exit/status semantics:

| Exit | State | Meaning |
|---|---|---|
| 0 | FREE | complete socket discovery says no listener; after action, exact targets stopped |
| 1 | CLEANUP_FAILED | owned workload/port did not reach the required state |
| 2 | INVALID / PROHIBITED | bad input or explicit production indicator |
| 3 | PROTECTED_BUSY / SKIPPED | no action authorization, protected target, or disabled/recursive |
| 4 | UNKNOWN | discovery, identity, or recovery uncertainty |

Target signaling rechecks Linux start time immediately before each numeric-PID
signal. Node does not expose pidfd signaling here: this is cooperative identity
checking, not atomic anti-PID-reuse protection under adversarial churn. Hosts
requiring that stronger guarantee must provide pidfd/job-identity supervision
and test it before acceptance. Never market the template as a security sandbox.

## Lease v2 contract

```sh
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
- `VALIDATION_LOCK_TIMEOUT_MS`: queue-wait limit, default three hours.
- `VALIDATION_LOCK_MAX_HOLD_MS`: owner's execution limit after acquisition,
  default two hours; set a host-appropriate bound.
- `VALIDATION_LOCK_POLL_MS`: positive integer milliseconds, default 100.
- `VALIDATION_LOCK_HEARTBEAT_MS`: default 1000.
- `VALIDATION_LOCK_STALE_HEARTBEAT_MS`: default 10000, greater than heartbeat;
  a health indicator, NEVER permission to steal a live lease.
- `VALIDATION_LOCK_STOP_GRACE_MS`: SIGTERM grace, default 3000.
- `VALIDATION_LOCK_STOP_KILL_MS`: bounded post-SIGKILL verification, default 5000.
- `VALIDATION_LOCK_PRIORITY_GRACE_MS`: advisory priority grace, default 2000.

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
observed descendant identities, acquisition and heartbeat times. Guarded
transitions use an atomic sidecar directory. Interrupted/corrupt sidecars are
never age-deleted: they require separately authorized host recovery with
contenders reconciled/stopped. Similarly, a launch-intent record without known
child identity remains blocked, not guessed to be empty.

Stale heartbeat/max-hold never allow another caller to reclaim live ownership.
The owning wrapper enforces its budget, stops owned processes, and verifies
quiescence before release. Dead-supervisor auto-recovery requires verified
compatible incarnation records and no remaining group/observed workload.
Unknown or surviving work retains the lease and blocks replacement.

Commands run in a separate process group/session. Discovery tracks that group
and observed descendants by start time; child exit, SIGTERM delivery, or timeout
does not prove termination. A surviving descendant is cleaned up and makes the
run fail. SIGKILL verification is bounded; uncertainty retains ownership.

Commands/hooks/workers must NOT daemonize, double-fork, deliberately escape
groups, or start untracked remote jobs. Polling cannot prove detection of every
instantaneous escape. Approve and inspect transitive scope before wiring.
Where such scope cannot be ruled out, use a verified host cgroup/job supervisor
or block the safety claim. These resource leases do not implement Failure Gate
task single-flight, monitor, authorization, or evidence acceptance.

## Mandatory adversarial acceptance matrix

Run `node --test tests/hardening.test.mjs` twice sequentially from the skill
directory. It creates only isolated fixtures and private temporary runtime
state; authorized test signals target only those fixture identities.

| Boundary | Required assertion |
|---|---|
| Input/production | malformed inputs fail; production PLUS dev marker cannot launch/signals |
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

Map each assertion to adapted code, not only to the bundled implementation.
Check approved host callers, exact scope, resource conflict map, real ports,
health endpoints, managed workflows, selected validation coverage, reports,
and Failure Gate checked-route evidence separately. Missing applicable proof
blocks installation/readiness; fixtures do not prove a deployed host outcome.