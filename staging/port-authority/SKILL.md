---
name: port-authority
description: Runtime hygiene for Replit apps, from ordinary projects to multi-service projects with heavy validation. Use for stale or orphaned processes, EADDRINUSE and port conflicts, blank previews, hung or conflicting tests, workflow-count limits, or prevention during project setup. Includes port-cleanup and validation-lock templates. Heavy-project controls activate only when the audited project needs them; no companion skill is required.
---

# Port Authority — Unified Runtime Hygiene

Apply this skill in **prevention** mode during project setup, or **repair**
mode for an existing runtime problem. Both start with Phase 0: audit before
changing anything.

Phases are sequential. ALWAYS means relevant requirements, not unrelated rewrites.
Record CONDITIONAL gates and skip unmet phases; never add machinery speculatively.

Ordinary projects use base phases; workflow pressure or conflicting validation
may activate heavy controls. Never require a separate `port-authority-heavy`.

## Installation contract (ALWAYS)

The bundle contains exactly seven files under `port-authority/`:

- `SKILL.md` — all base and conditional heavy-project instructions.
- `scripts/free-ports.mjs` — dependency-free port-cleanup template.
- `scripts/validation-lock.mjs` — dependency-free serialization template.
- `scripts/runtime-environment.mjs` — shared runtime-admission policy.
- `scripts/host-capabilities.mjs` — unavailable-by-default authoritative adapters.
- `reference/runtime-contract.md` — interfaces, limits, and acceptance matrix.
- `tests/hardening.test.mjs` — executable isolated regression tests.

No companion Heavy skill or `serial-lock.mjs` exists. Runtime files are
templates, not promises that the target project already has those paths.

1. Inspect the archive; extract into a fresh directory, never over a project.
   Verify seven files, frontmatter and references. Missing required files block
   staging. Verify supplied trusted checksums; never invent an expected hash.
2. Audit existing workflows, scripts, locks, and port ownership in Phase 0.
   Compare any existing cleanup/serialization implementation and adapt it
   rather than blindly replacing it.
3. Stage needed templates from `.agents/skills/port-authority/scripts/` only,
   with BOTH shared helpers beside either consumer and executable bits intact.
   Never overwrite active scripts or wire callers during staging. Prefer
   documented adaptation points; necessary safety/lifecycle changes are allowed only
   with applicable approval, interface documentation and regression evidence.
   Never use a `.local/custom_skills/` mirror or another copied definition.
4. Run invalid-input and no-op smoke checks in isolation. Never use a live
   application port or the workspace's actual validation lock directory.
   Failed checks block activation; unavailable permission means checks BLOCKED.
5. Activate only audited, authorized needs after their separate acceptance.
   Templates assume no package manager, ports, workflows, generated files or DB.
   Never copy application-specific paths, `--e2e` behavior, or assumptions.
6. Keep skill sources, scripts, configuration, documentation, and reports
   outside `.local/`. The lock template's `.local/` defaults are disposable
   runtime lock/waiter state only; overrides can relocate that state.

### Validation registration acceptance

Use the project's canonical validation contract and authorized task tier.
If an available canonical `validation-tiers` skill defines that contract,
read it. Its absence must not create a dependency on another installed
skill: discover executable commands and document the choice instead.
Do not silently change an assigned tier or invent a successful registration.

When the host uses the four-tier registration convention, retain these
four names, each with an executable backing command:

| Command | Use when | Minimum acceptance |
|---|---|---|
| `test-fast` | copy/style or UI changes with no logic impact | typecheck and lint targets exist and run |
| `test-standard` | most features and fixes touching existing behavior | fast targets plus unit and relevant documentation/data checks |
| `test-standard-plus` | multi-package static/unit coverage without browser suites | complete non-Playwright target is executable |
| `test-heavy` | schema, auth/security, new routes needing e2e, broad refactors | serialized full applicable target, including browser/schema checks where present |

Do not assign fast solely because a change adds a component: classify its
behavior and risk. Do not default every task to heavy.

Where platform registration is supported, compare the canonical manifest,
platform registrations, and package commands independently. A name without
an executable backing command fails registration; never use placeholders
or silently substitute a tier. If that capability or convention is absent,
record it as not applicable and use existing executable validation commands,
not fictional platform APIs. Missing optional checks must be explicit.

Record every entry point's authorized route, enforced queue/execution/cleanup
and cumulative budgets, Node test/hook limits, and serialization coverage.

If Failure Gate v4 is active in the target project, its authorization,
execution-scope, evidence, and completion rules govern these launches.
Use the verified task-ID/approved-plan checked route for required-tier runs.
Direct package commands, dry runs, smoke checks, isolation retries, and
earlier-snapshot comparisons need their applicable separately authorized
bounded capability; labeling them diagnostic does not grant permission.
No Port Authority instruction grants a tier change, coverage override,
baseline waiver, or bypass. Missing required capability blocks the affected
operation. Bundle authoring/testing in this conversation is not host validation.

### Staged installation and separate activation acceptance

Read [runtime-contract.md](reference/runtime-contract.md) before staging/adapting.
Report per-control states, not an unqualified “installed and operational”:
- `STAGED`: canonical files verified and placed inertly under applicable approval;
  no live callers changed. Record isolated checks PASSED/FAILED/BLOCKED/NOT_RUN.
- `NON_RECLAIM_VERIFIED`: specified controls passed authorized actual host checks;
  no live reclaim or development exception is implied.
- `LIVE_RECLAIM_ENABLED`: real attestation, checked reclaim and outcome evidence
  verified for specified callers/scope; fixtures cannot establish this state.
Missing reclaim authority does not itself block authorized inert staging or
isolated bundle checks. A stricter approved task or Failure Gate policy still
governs: obtain an approved task revision, never reinterpret it to proceed.
Run the contract's bounded suite twice under applicable test permission.
The adversarial acceptance matrix is mandatory, not optional smoke guidance.
Fixture coverage is isolated evidence, not host validation or task completion.
Before any activation, verify its admission, authorization, registrations,
conflict map, budgets and real caller evidence; map assertions to adapted code.
Phase 9's two host runs apply to activated controls, not file-only staging.
Missing evidence blocks the affected control. Preserve existing work/callers
until approved cutover; report unsafe legacy behavior, never call it repaired.

### Clean split — host / Failure Gate / Port Authority

Host attests environment; Failure Gate authorizes reclaim; Port Authority acts.
Verify authoritative sources and checked routes before dependent activation.
No local reference, JSON record, domain, remembered guidance or draft task
creates authority. Bundled host adapters intentionally block until integrated.
Failure Gate owns approval, exact task/plan/run scope, atomic claim, revocation
and evidence acceptance; Port Authority owns discovery, safe signaling and
termination evidence. Missing sources block live reclaim/development exceptions,
not unrelated read-only/prevention work. Never implement a substitute approval
system here. This is a capability requirement, not permission to install a skill.

## Phase 0 (ALWAYS) — Audit first

Before changing anything, inventory:

1. Processes: `ps -eo pid,ppid,comm,args`. Do not rely solely on a truncated
   listing; examine relevant process ancestry. Nix Node may appear as
   `MainThread`, not `node`.
2. Listening ports: `ss -tlnp`, or `/proc/net/tcp` and `/proc/net/tcp6`.
3. Configured workflows, commands, ownership, and actual platform limit
   evidence if workflow pressure is reported.
4. Validation commands, duration, and shared ports, generated files, CPU
   pressure, or database state.
5. Browser/e2e harness, code generation, connection pools, WebSockets/HMR,
   health routes, and available registration/validation capabilities.

Write down the evidence and applicable gates. Audit decisions without
ownership evidence can kill the wrong process or fix an unrelated port.
Before stopping a service or signaling a process, explain the consequence
and obtain authorization for that disruption.

### Heavy-control gates

Evaluate each control independently; a project need not satisfy all gates.

- **Workflow budgeting/consolidation:** observed workflow-limit errors,
  scarce slots, or multiple services and several heavy validation jobs.
- **Serialization:** two or more heavy suites, or any commands sharing
  generated files, DB state, ports, or demonstrated resource contention.
- **Stale-counter handling:** creation rejected after removal, while the
  current inventory indicates available capacity.
- **Execution budgets (always):** every finite validation entry point.

Multiple services alone do not justify serializing unrelated tests.
An ordinary project with a real workflow-limit error may need budgeting.
Base/Heavy guidance is included; no companion acceptance run is required.

## Phase 1 (ALWAYS) — Process discipline

- Never start services or long-lived jobs with `nohup`, `setsid`, or ad-hoc
  background shells (`cmd &`). They can vanish or survive as port-holding
  orphans. Use named managed workflows for persistent services.
- Jobs lasting roughly two minutes or more belong in managed workflows or
  registered validation commands when available, not unmanaged shells.
  Distinguish finite validation from persistent servers/watchers.
- Select validation by task risk using the installation contract. Keep
  the canonical contract; do not create a workflow per test suite by habit.
- Read service ports from the project's authoritative environment/config
  mapping. A single service can use `PORT`; multiple services need distinct
  configured ports, not every service binding the same inherited `PORT`.
  Find hard-coded or conflicting Vite/backend ports and inspect preview
  routing before changing them.

### Conditional heavy controls — Workflow budgeting and consolidation

Gate: Phase 0 shows workflow pressure or a multi-service/heavy-job project.

- Reserve scarce workflow slots for servers, watchers, and persistent
  services. Discover actual limits; do not hard-code a universal cap.
  The former Heavy guide reported approximately ten workflows and possible
  hidden entries; that is a diagnostic clue, not a guaranteed platform rule.
- Run finite tests, lint, typecheck, and audits as registered validation
  commands where supported. Otherwise use the host's managed finite-job
  mechanism. Do not bypass caps with background shells.
- Prefer an existing consolidated validation command over one workflow per
  suite. Keep fast, standard, standard-plus, and heavy distinctions where
  that contract applies. Consolidation does not itself provide locking:
  conflicting runs also need Phase 4.
- Never delete unrelated workflows or move persistent services into ad-hoc
  shells to make room. Budget and consolidate within authorized scope.

### Conditional heavy controls — Stale workflow counters

Gate: a limit error follows workflow removal.

1. List workflows and compare actual inventory with available limit evidence.
2. If a free slot is evident, allow a brief bounded wait and one retry;
   a stale counter is a hypothesis, not a confirmed platform diagnosis.
3. If genuinely full, consolidate. If inventory and platform disagree after
   the bounded retry, report that blocker; do not create an endless retry
   loop or launch unmanaged services as a workaround.

## Phase 2 (ALWAYS) — One canonical port-cleanup implementation

Use one audited cleanup implementation wherever cleanup is needed. The
bundled template is `scripts/free-ports.mjs`.

- Do not depend on `fuser`: it may be absent under Nix.
- Discover holders by socket inode and PID (`/proc` fd scanning or suitable
  `ss`/`lsof` evidence), not process names.
- Protect caller ancestry and the current run's process tree. Never kill
  editors, workflow supervisors, unrelated jobs, or active services merely
  because they share a wrapper name.
- Preserve recursion/disable and production guards. Inspect actual
  deployment flags before wiring; do not weaken guards for convenience.
- `NODE_ENV=production` or `REPLIT_DEPLOYMENT=1` always blocks. Only
  `REPLIT_ENVIRONMENT=production` admits a verified development-workspace
  exception: domain PLUS audited, fresh, root/boot/ancestor-bound evidence.
  Require independent host attestation through the code-owned adapter.
  Follow the runtime contract; a domain or remembered exception alone is
  insufficient. Unknown context blocks. Both scripts use the shared helper.
- Stop the owned stale supervising wrapper tree, not just its listening
  child, to prevent orphan wrappers or respawn.
- Require an unexpired, Failure Gate-authorized ownership manifest v2 binding
  ports, boot identity, and exact PID/start-time targets. A port, process name,
  local JSON field, or CLI action flag cannot establish human authorization.
  Default to dry-run inventory; require explicit action mode for signals.
  Never infer authorization for wrappers or descendants from ancestry alone.
- Bind task/approved-plan/run; consume the checked grant, recheck each signal
  batch and submit actual outcomes through its host-backed evidence route.
- SIGTERM first, allow a grace period, then SIGKILL authorized survivors.
  Confirm the intended port and owned processes reach the expected state.
  Log forced actions loudly.

The hardened template reports `FREE` (0), failed cleanup (1), invalid/prohibited
(2), protected busy/skipped (3), or unknown discovery/ownership (4). Unreadable
socket tables and protected listeners are never successful cleanup. Disabled
or recursive invocations return skipped/non-success, not a free-port claim.
Verify the structured outcome, not only the existence of log output. `FREE`
is an observation, not a reservation; coordinate the subsequent bind.

`--include-own-tree` is only for an audited boundary BETWEEN serialized
steps, when no legitimate service in that tree should hold the listed ports.
It additionally requires manifest permission; it never authorizes killing
caller ancestors or unrelated services. No live process is signaled by default.
The template is Linux `/proc` based; unsupported discovery is a blocker,
not permission to claim cleanup worked.

## Phase 3 (CONDITIONAL) — Browser/e2e startup safety

Gate: a browser/e2e harness exists.

- Playwright starts `webServer` processes before `globalSetup`. Put sweeps
  in each relevant `webServer` command, not `globalSetup`, where cleanup
  can kill freshly started servers. Config-load cleanup is acceptable only
  with explicit guards and verified startup order.
- Pass `addInitScript` values explicitly, not through lost serialized closures.

## Phase 4 (CONDITIONAL) — Crash-safe validation serialization

Gate: two or more heavy suites, or commands sharing generated files,
database state, ports, or demonstrated resource contention.

Use the existing audited lock or `scripts/validation-lock.mjs`:

```sh
VALIDATION_LOCK_TIMEOUT_MS=<queue-ms> VALIDATION_LOCK_MAX_HOLD_MS=<execution-ms> node scripts/validation-lock.mjs [--resource <name>] -- <command...>
```

### Resource striping and priorities

`--resource <name>` selects a per-resource lock; default `global` is simply
another independent resource name, NOT a hierarchical or catch-all lock.
Conflicting commands must acquire the same lock identity on a supported local
filesystem. Publish a caller-to-resource conflict map covering every entry
point; block wiring when any conflict is uncovered.

The template supports **one resource per invocation**, not a list:

| Audited conflict | Example resource |
|---|---|
| commands regenerating the same outputs | `codegen` |
| measured unit/e2e CPU contention | `validation-cpu` |
| browser suites sharing service ports | `e2e-port` |
| suites sharing database state | `test-db` |
| independent lint/static checks | none, unless evidence shows a conflict |

These are examples, not installed paths. Either ALL conflicting callers use one
composite/global lock, or ALL acquire their overlapping resource sets in one
verified order. A composite lock does not conflict with its constituent names.
One invocation acquires one resource. Names must be lowercase; reentry keys
bind the canonical lock path, not a case-normalized name. Override paths are
part of lock identity; different files do not coordinate despite equal names.

Priority is 1 (highest) through 9 (lowest), default 5. Disposable waiter manifests
live beside the lock or override; higher priority acts after a two-second grace.
Priority is advisory, not a fairness or execution-time guarantee.
Recommended tier priorities: fast 1, standard/standard-plus 2, heavy 3.
Do not wrap independent checks unnecessarily.

### Reentrancy and crash safety

- Verified reentry binds the exact lease path/token, boot identity, owner
  process incarnation, and actual ancestry. Legacy PID-only variables are
  rejected. Nested wrappers acquire a parent-token-specific sibling slot;
  siblings serialize while deeper sequential nesting avoids self-deadlock.
  Parent/child simultaneous resource mutation and daemonization are prohibited.
- Prefer unwrapped inner commands, such as `test:e2e:run`, in a locked
  serial runner. Correct same-resource reentrancy is supported; inconsistent
  resource identity, environment propagation, or lock ordering can deadlock.
- Neither stale heartbeat nor max-hold age permits another caller to reclaim
  a live or uncertain workload. The owner enforces its execution budget,
  stops verified owned work, and confirms quiescence before release.
  Independent IPC watchdog registration precedes gated command dispatch.
- Track the owned process group and observed descendant incarnations. Parent
  exit, signal delivery, or timeout alone never proves workload termination.
  Surviving descendants are cleaned up; that run fails rather than passes.
- Dead-owner auto-recovery needs a compatible finalized lease with
  `recoveryRequired:false` and no surviving/unknown work. Error/unfinalized
  leases, older records missing that field, launch gaps, abandoned mutexes or
  unknown discovery require separately authorized recovery; never unlink blindly.
- Read the runtime contract's supervision limits. Verify the actual command
  tree does not daemonize or escape supervision before accepting wiring.
  Failure Gate task single-flight/monitoring remains a separate host control.
- Execution budgets start AFTER acquisition. Queue-wait limits are separate
  and labeled as queue timeouts, not slow-test failures.

Lock only conflicting consolidated tiers, not automatically heavy. Preserve
non-Playwright coverage. Evaluate the independent budget gate below even
when this entire serialization phase is skipped.

## Phase 5 (CONDITIONAL) — Generated-file safety

Gate: the project regenerates clients, schemas, types, or other files.

- Never run regenerators of the same outputs concurrently. Include all
  entry points in Phase 4's shared resource coverage when needed.
- For generated-file parse/missing-export failures, rerun the failing step
  alone before attributing the symptom to a source bug. Preserve evidence
  of a generation race rather than silently rerunning until green.

## Phase 6 (ALWAYS, per-item gates) — Test hygiene

- If fake timers exist, use isolated file/suite lifecycle setup and explicit
  restoration. Avoid global per-test clock resets that break cross-file
  TTL/cache assumptions; preserve frameworks' isolation semantics.
- Pre-existing failing tests require explicit tracking and the project's
  authorized evidence policy. Do not skip, quarantine, filter, rename, delete,
  or alter discovery merely to obtain a green run or shorten validation.
  A tracking note or “known-failing” label is not permission to reduce coverage.
- Long-lived pools with error events, such as `pg.Pool`, need appropriate
  listeners; unhandled background pool errors can terminate the process.

### Failure Gate v4 — Failure evidence and quarantine boundaries

Gate: Failure Gate v4 governs the target project's validation. Read its
canonical `.agents` source and applicable evidence/recovery reference before
classifying failures. Do not install or copy another skill merely to satisfy
this gate; if active policy cannot be verified, block the affected decision.
Without Failure Gate, use the verified host policy; these instructions never
create their own permission to waive tests.

- **Owned repair first:** a declared owned baseline repair remains an
  obligation. Expiry, reclassification, skipping, filtering, renaming,
  deletion, or non-discovery cannot prove repair or discharge ownership.
- **Explicit ignore:** only an exact match to an authoritative, active,
  unexpired catalog record applicable to the environment authorizes an
  ignore. Match suite/test, variant/environment, and failure signature.
  Keep the raw failing result. An ignore permits assessment of that observed
  failure; it does NOT authorize excluding the test or a required step.
- **Unlisted failure:** perform exactly three authorized isolation retries
  through the registered bounded diagnostic capability, with each attempt
  recorded. The initial failure is not a retry. Preserve actual selectors,
  transitive scope, per-attempt/cumulative budgets, and task/run bindings.
  A passing retry proves intermittency, not pre-existing provenance.
  Crashes, skips, missing reports, and zero-test runs are not passing attempts.
  If isolation is unsafe/unavailable or cannot fit the authorized budget,
  use only a registry-defined approved equivalent policy, or report
  classification blocked; do not retry until lucky or broaden the tier.
- **Pre-existing provenance:** require direct evidence of the same failure
  on a verified earlier task-unaffected snapshot plus independent
  corroboration, with matching environment applicability and original-source
  lineage. Copies of one observation count once. Narrative memory or
  untouched files without direct provenance is insufficient.
- **Quarantine is a coverage change, not an ignore:** no automatic quarantine
  is allowed under this skill. Any proposed exclusion needs separate
  applicable coverage/policy approval before use, with renewed bound plan/
  tier authorization wherever affected. Never apply it retroactively to
  turn an incomplete or failed run into acceptable evidence, broaden the
  catalog, waive an owned repair, or evade required coverage.
- **Complete evidence:** account for every assigned-tier step even if an
  ignored failure appears. An unsafe dependent step may stop, but the run
  remains incomplete. Diagnostics cannot replace complete checked-tier
  evidence on current inputs. Unexpected zero-test runs, missing reports,
  or skipped required steps cannot become acceptable via baseline classification.
- **Assessment and completion:** preserve raw exit status separately from
  `PASS`, `ACCEPTABLE_WITH_IGNORED_FAILURES`, `FAIL`, `BLOCKED`, or `INCOMPLETE`.
  Insufficient provenance leaves an unresolved potential regression and
  blocks validated completion. Only the verified local checker can accept
  applicable complete task evidence; never call an ignored failing suite a
  clean pass. Owner-directed administrative closure is separate:
  “Closed by owner direction—not validation passed.” It does not waive
  repairs or convert missing/failed evidence into validation success.

## Phase 7 (CONDITIONAL) — WebSockets and preview HMR

Gate: WebSockets/live updates/HMR exist; add keepalive changes only when
idle disconnects are observed or confirmed by the environment contract.

The prior guide reported preview idle disconnects around thirty seconds.
Treat that value and proxy behavior as environment-dependent, not universal.
Where supported and indicated, use server protocol-level ping frames (for
example `ws.ping()`) at a suitable interval, historically about twenty seconds.
An application JSON heartbeat is not a protocol ping; browsers do not expose
a native ping API. Clean up timers and connections; verify actual reconnection
and idle behavior before claiming the symptom is fixed.

## Phase 8 (ALWAYS) — Health checks and restarts

- For a backend app, health probes must genuinely reach the backend, such
  as `/api/healthz`, and validate the expected response. SPA HTML fallback
  can return a misleading 200 while the API is down. Static-only apps do
  not need an invented backend endpoint.
- After dependency/config changes, restart affected managed workflows
  rather than assuming hot reload applied everything.

## Phase 9 (ALWAYS) — Regression hardening and acceptance

- For host activation, run the authorized tier/command twice back-to-back
  with no manual port cleanup, process killing, or lock deletion between.
   Automatic authorized, audited cleanup may run; forced actions remain visible.
  If intervention is needed, hygiene acceptance has not passed.
- When Failure Gate v4 is active, both runs use its checked route and retain
  applicable current-snapshot evidence. Apply Phase 6's failure rules to
  each run; two invocations or a passing retry do not prove clean acceptance.
  Qualifying ignored failures retain their raw outcomes and explicit assessment,
  not a fabricated `PASS`. Quarantined/skipped required coverage cannot
  satisfy this acceptance gate.
- Verify only the conditional controls that actually apply, plus their
  positive and skip paths. An ordinary project must not need a Heavy file,
  heavy workflow allocation, or serialization merely to install this skill.
- Production and recursion guards remain permanent. Every forced unlock or
  kill stays loud. Fix recurring script/rule defects, not only an instance.
- Report inventory, applicable/skipped gates, changes, exact checks and
  results, per-control stage, selected tier, budgets and remaining blockers.
  Staging checks never substitute for blocked host acceptance or task validation.

## Independent gate — ALL validation execution budgets

Apply independently of Phase 4, even a SINGLE non-conflicting suite. Fast,
direct package scripts, hooks, diagnostics, retries and comparisons are included.
- Use the checked tier runner (e.g. audited `run-tier.mjs`) or a separately
  authorized equivalent finite supervisor. Direct launch inherits no registry
  timeout; a package name, workflow, shell/tool timeout or diagnostic label
  proves neither transitive supervision nor authorization.
- Enforce explicit queue, execution, cleanup and parent/cumulative budgets.
  Never reset parent deadlines on reentry/retry or accept missing/unlimited
  limits. The template requires queue/MAX_HOLD values; it cannot enforce host
  registry approval. Read the runtime contract's all-entry-point acceptance.
- Set finite Node test AND hook timeouts; report effective limits, including
  disabled/missing ones. Node output does not advertise unlimited defaults.
  Test timers do not stop blocked synchronous code or owned subprocesses:
  require an independent outer watchdog and verified transitive termination.
- Fail budget breaches even with raw exit zero; retain exclusion on uncertainty.
  Bound error-path cleanup; confirm termination before replacement. Keep raw
  outcomes/timeout incidents loud. Diagnose contention before tuning budgets;
  never skip coverage, disable deadlines or silently widen authorized limits.

## Migration from the two-skill setup

Replace the workspace's Port Authority skill with this bundle. Once the
replacement is accepted, remove the obsolete separate Port Authority - Heavy
entry so future sessions do not load contradictory instructions.

For existing projects, inventory both canonical skill entries and references,
then consolidate authorized references onto
`.agents/skills/port-authority/SKILL.md`. Compare existing runtime wiring;
do not reinstall scripts blindly. Never edit disposable platform mirrors.
Replacing the workspace bundle does not by itself migrate every project's
installed copy or prove its runtime validation passes.

This revision replaces legacy scripts and adds runtime/host-capability helpers.
Migrate approved callers to the documented development-context, v2 lease,
  and ownership-manifest interfaces, including recovery disposition; old leases
  and PID-only reentry need
verified safe cutover, not optimistic reuse. Preserve Failure Gate governance,
coverage, independent caller compatibility, and real raw results. Templates
remain cooperative adaptation points with explicitly documented limits.
No separate Heavy installation is necessary.