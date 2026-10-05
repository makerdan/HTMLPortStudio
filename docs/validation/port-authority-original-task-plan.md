# Apply Port Authority Runtime Hygiene

## What & Why
Apply the current canonical Port Authority contract to Replit Project `ced8e084-60d0-4238-8abc-31704510412d` at `/home/runner/workspace`, across its existing three services and browser/validation workflows. The project already has basic port cleanup and service wiring, but its cleanup can signal processes without an authorized ownership manifest, and the canonical v2 validation lock is not installed. Preserve existing correct wiring and adapt only what the current contract requires. The latest canonical source is the exact seven-file package. The user-provided archive `attached_assets/port-authority_(10.04.2026)_1791134987480.zip` has SHA-256 `41ccf051ba57e87ff33c703351a5b363cb2c7463bc2cef10f0bfc4cbc9f7c434`; its seven members passed archive integrity and duplicate, traversal, absolute-path, symlink, special-file, and encryption checks. Each member is byte-identical to its current canonical `.agents/skills/port-authority/` file:
- `SKILL.md` — 29,343 bytes; SHA-256 `0e5fabda7113d3c35fa2530d081432db99e36359fdf369b4ca50bcf8504788fd`
- `scripts/free-ports.mjs` — 14,614 bytes; SHA-256 `69da8c14c517f785dd0f0c033b5a1fbe75b361b223bd73628834ac29514915bf`
- `scripts/validation-lock.mjs` — 19,091 bytes; SHA-256 `b2baef54ae154e0af44c7626a4a79522c10644c2cf181c57f5d02274a49448c1`
- `scripts/runtime-environment.mjs` — 6,357 bytes; SHA-256 `ded3050e2f4505bfc192378ae031f059ba0d6361f1ea3a4c0b7f36beb40bfc4e`
- `scripts/host-capabilities.mjs` — 1,446 bytes; SHA-256 `cde66e139ecbb541f168edf34adbf6583369fd14e6c0590b9f67716fc0514061`
- `reference/runtime-contract.md` — 27,739 bytes; SHA-256 `c7d72929e0dfd2cb29ad8a663597219cd5a5a05e9cea1253baad4278f4bf4df4`
- `tests/hardening.test.mjs` — 58,970 bytes; SHA-256 `6bc8199eeb75b960d30b9f6444981b86f664f8ebcd9f6017e1dfb463f9e2676e`
Total source payload is 157,560 bytes. These local digests identify planning inputs; they are not an external trust signature. Recompute all seven before implementation and record drift. The historical source manifest still describes an older three-file package; it is not authority for this current seven-file contract. Use only the canonical `.agents/skills/` source, never a mirror or copied definition. The two bundled host/runtime helpers are required integration boundaries, and the host-capability adapter intentionally remains unavailable until independently integrated.

The user-approved classification remains narrow and unchanged: `NODE_ENV=production` and `REPLIT_DEPLOYMENT=1` always block cleanup and lock admission, even with a development domain or attestation. `REPLIT_ENVIRONMENT=production` may be treated as a generic label only when `REPLIT_DEV_DOMAIN` is present AND independent, documented host evidence confirms a development workspace rather than a deployment. Implement the exception only through the latest contract's `PORT_AUTHORITY_DEV_CONTEXT_FILE`, validated file/boot/root/domain/live-launcher binding, freshness and permission checks, plus a real independently verifying host-attestation provider. The record must be short-lived (no more than 15 minutes), regular, same-UID, non-symlink/non-hard-link, and not group/world writable; the live same-UID launcher must remain an ancestor. A domain, local record, remembered guidance, or existing script is not proof. Never unset or spoof production markers. Missing/uncertain proof fails closed for both cleanup and locking. This approval does not authorize local self-attestation or override either hard blocker. Do not edit the canonical skill definition.

## Done looks like
- Every applicable Port Authority phase and conditional gate has an evidence-backed disposition in the tracked implementation handoff; skipped gates include the observed reason.
- Cleanup is a single audited Linux `/proc` implementation. Default operation is inventory-only; every action requires both a trusted host attestation and a Failure Gate checked `runtime.process-reclaim` grant bound to the exact task, approved plan, run, port/process scope, boot, and attestation. The host-generated v2 manifest is untrusted input, not authorization. Recheck the grant and attestation before each signal batch, durably journal signal intent, and record actual raw outcomes through the authoritative evidence route. A local manifest, process name, ancestry, port number, or CLI flag never establishes authorization. If either host or checked reclaim capability is absent, live signaling stays blocked.
- Cleanup fails closed on incomplete socket/PID discovery, protected or unapproved listeners/descendants, unknown identity, production context, disabled/recursive invocation, or missing authority. It preserves caller/ancestor protections, signals only approved targets, logs forced actions, verifies target exit as well as port release, and preserves the documented structured exit outcomes.
- Cleanup and validation locking use both shared helpers (`runtime-environment.mjs` and `host-capabilities.mjs`) beside each consumer, with the exact user-approved classification above. Tests prove the structured, fresh, root/boot/domain/live-ancestor-bound development record and independent provider attestation; reject domain-only/local-record-only evidence; reject expiry during queueing or before signal escalation; and reject `NODE_ENV=production` or `REPLIT_DEPLOYMENT=1` even with valid development evidence. The shipped host adapter remains unavailable until independently integrated; never ship or rely on the test-only adapter.
- The v2 validation lock is adapted from the canonical template only after Node 20+, Linux `/proc`, and local-filesystem exclusive-create/rename/directory-sync assumptions are verified and recorded in the host capability manifest. Both queue-wait and post-acquisition execution limits are explicit, finite, positive, timer-safe, and host-approved; no former defaults are presumed authorized. It uses monotonic elapsed deadlines, supervises child groups and observed descendants, propagates raw child failure separately from supervision status, retains uncertain/live ownership, and releases only after workload quiescence is proven. Admission, hooks, startup/teardown, evidence capture, nested work, diagnostics, retries, and parent/cumulative time all have bounded coverage.
- A caller-to-resource conflict map covers registered tiers, package scripts, Replit workflows, Playwright, code generation, and applicable local CI entry points. Only demonstrated shared resources are serialized; isolated code-generation outputs and independent checks remain unwrapped where evidence supports that choice. Port Authority locking remains separate from Failure Gate task authorization/single-flight.
- The existing port contract remains API `8080`, Studio `23332`, Canvas `8081`, Playwright `5173`; Playwright cleanup remains in its `webServer` startup command, backend health probes reach JSON `/api/healthz`, and the SPA fallback is not accepted as backend health.
- The user-facing startup path fails clearly rather than signaling a process when ownership approval or development-context proof is unavailable. No host approval/manifest adapter is invented; if Replit provides no verified capability, signal-based reclaim stays blocked and the handoff reports the limitation. The task is not called fully applied while a required gate remains blocked.
- Before changing a service or workflow caller, run the latest isolated bundle acceptance exactly as `node tests/hardening.test.mjs --supervised` from the canonical skill directory, twice sequentially, only through a verified authorized bounded route and under an independent finite outer watchdog that owns the whole fixture process tree. The supervised suite uses a private fixture and test-only environment, explicit 30-second test and 5-second hook timeouts, and a fixture wrapper with a 180-second execution deadline; it does not authorize real cleanup or prove host wiring. If permission, watchdog, or fixture isolation is unavailable, stop and report blocked without wiring. After wiring, run the selected registered `test-standard` tier twice consecutively through the checked route, with no manual port clearing, process killing, or lock deletion. Any unavailable or unauthorized check remains blocked, not passed.
- A tracked handoff is published at `docs/validation/port-authority-application-handoff.md`, recording the fixed obligations, pre-application baseline, delivered snapshot, gate decisions, authorization/attestation sources, conflict map, changes, exact checks/results, adaptations, limitations, and remaining owners/actions. It contains no secrets.

## Out of scope
- Installing, copying, editing, or modifying the canonical Port Authority skill or its disposable mirrors; this applies its contract to project runtime code.
- Product/API/authentication/database changes, deployment redesign, or signaling live processes during this task without explaining the service impact and obtaining the required authorization.
- Adding an unverified platform approval API, process owner, manifest generator, workflow cap, or task-lifecycle integration.
- Deleting existing workflows or creating a workflow per test suite; changing remote CI, production, or published runtime behavior without separate authority.
- Adding WebSocket keepalives without an observed idle-disconnect requirement, or installing a separate Port Authority Heavy skill.

## Steps
1. **Baseline and re-audit the runtime** — In the executor's task environment, capture the pre-edit snapshot and run the authorized `test-standard` baseline once only if current port/process state makes the existing cleanup path safe; otherwise record the concrete blocker and do not signal anything. Then compare cleanup, service/workflow ports, health, Playwright, test/codegen callers, process ancestry, listeners, and durations with the pinned contract; the planner's currently running workflow is not this task's baseline.
2. **Verify host authority and development identity** — Identify independent host sources for runtime attestation, a development-context record, and Failure Gate's checked reclaim/evidence route. Verify actual task/approved-plan/run/scope binding, expiry/revocation, replay protection, operation single-flight, and journaled signal checks. Apply the user's exact production-marker guard to both scripts; if a required source is unavailable, keep live action blocked rather than substituting a local flag, fixture adapter, or remembered assumption.
3. **Run pre-wire canonical acceptance** — Before adapting scripts or changing any service/workflow caller, run `node tests/hardening.test.mjs --supervised` twice sequentially from the canonical Port Authority skill directory through an independently verified authorized bounded route. Use the suite's private fixture/test-only environment, 30-second test and 5-second hook timeouts, and 180-second fixture-wrapper execution deadline. Add a separate finite outer watchdog that owns and terminates the full fixture tree, allowing termination grace and verification; preserve retained state and never delete a retained lease blindly. No real service ports, host adapters, or production flags may be modified. If the route/watchdog is unavailable or any assertion fails, stop and report blocked without wiring.
4. **Adapt and smoke-test cleanup** — Use the canonical `free-ports.mjs`, `runtime-environment.mjs`, and `host-capabilities.mjs` as one source set, preserving executable bits and documented adapter boundaries. Keep `host-capabilities.mjs` unavailable until a real independent provider is verified; never ship the test-only provider. Adapt only the approved environment classifier and verified host integration. Before wiring callers, run invalid-input and no-op checks against isolated fixtures and temporary state through an authorized bounded route; confirm IPv6-table omission only with both positive disabled-kernel and no-TCPv6 evidence, otherwise return UNKNOWN.
5. **Install the audited validation lease and budget boundary** — Adapt `validation-lock.mjs` with its two shared helpers, verify filesystem/process-supervision assumptions, and require explicit bounded queue and execution limits from an authorized source. Inventory every finite launch path, including package aliases/hooks, server startup/teardown, test and hook timeouts, diagnostics, retries, workers, evidence, nested work and parent/cumulative deadlines. Produce the full caller-to-resource map; every demonstrated conflict must acquire a shared lock identity or a globally consistent resource set. Do not wrap independent commands or confuse resource leases with Failure Gate authorization/single-flight.
6. **Reconcile service and workflow wiring** — Preserve authoritative PORT mappings and foreground named workflows, keep browser cleanup before its web server, route health checks to the API, and apply only the heavy-control gates supported by evidence. Reserve workflow slots for services; do not infer a platform-wide limit or stale-counter condition without evidence.
7. **Add recurrence coverage** — Map the complete latest runtime-contract matrix to adapted tests, including independent attestation and checked reclaim, scope/replay/concurrency/revocation, evidence persistence, context expiry, socket discovery, protected targets, cleanup, lease recovery/reentry, shared/disjoint resources, all-entry-point and parent deadlines, timeout/outer-supervision failures, unsafe blocking inputs, shutdown snapshots, and independent caller behavior.
8. **Accept the wiring** — Through the project-checked route, run exactly the selected registered tier twice consecutively without manual process/port/lock intervention; verify backend health, cleanup skip and forced-action outcomes, child failure propagation, and lock release. Restart affected managed workflows only after explaining the disruption and obtaining the required authorization; if safe live acceptance cannot be authorized, retain that check as blocked.
9. **Publish implementation evidence** — Write the tracked handoff at `docs/validation/port-authority-application-handoff.md`, mapping every applicable clause and runtime-contract acceptance row to delivered wiring and evidence, and explicitly list blocked gates, owners, and next actions.

## Pre-existing failures to ignore
None verified during planning. `docs/validation/failure-baseline.json` currently contains no records, so no failure is authorized for ignore. The planner did not start a backend spot-check because the registered `test-standard` workflow was already running; its final result was not inspected. Treat all task-time failures as potential regressions and follow the current project failure-evidence policy; a passing retry alone does not prove pre-existing provenance.

## Task-local environment observations
- Pre-application repository revision: `675a6bb120a99efd2d37d661b50bdb70ec08e60b`; the working tree was clean during planning.
- The three development services were actively listening on their declared ports (API `8080`, Canvas `8081`, Studio `23332`). They were left running and no process was signaled. `ss` is unavailable; `/proc/net/tcp` provided the listener inventory. `/proc/net/tcp6` is absent, but `/sys/module/ipv6/parameters/disable` reported `1` and `/proc/net/protocols` had no TCPv6 entry, satisfying the canonical positive evidence for omitting the IPv6 table in this environment.
- The current workspace exposes `REPLIT_ENVIRONMENT=production` and `REPLIT_DEV_DOMAIN`; `NODE_ENV` and `REPLIT_DEPLOYMENT` were not set in the inspected planner/workflow environments. No independent documented development-workspace attestation or host-authorized cleanup-manifest generator was found in the inspected project files. The executor must rediscover these capabilities and fail closed if they remain unverified.
- `scripts/free-ports.mjs` currently signals discovered wrapper trees without a host ownership manifest; `scripts/validation-lock.mjs` is absent. Playwright already performs cleanup in its `webServer` command and checks `/api/healthz`. The `test-standard` and `test-heavy` tiers share the Playwright port; `validate:api` uses unique temporary validation directories. Verify the complete resource map before deciding its lock layout.
- The project has three managed services and several validation workflows, so workflow budgeting and the independent long-running-budget gate need evaluation. No workflow-limit rejection or stale-counter incident was found; do not claim either. Vite HMR exists, but no idle disconnect was observed.
- The canonical project task-validation contract names `test-standard` in `docs/validation/validation-tiers.json` and requires `scripts/run-locked-tier.mjs`. Task #336 (Apply Failure Gate v4) is still only proposed and is not a dependency or evidence of active v4 enforcement.

## Validation
**Command:** `test-standard`
**Why:** This registered tier covers workspace typechecks, focused runtime/script tests, API/data tests, and Playwright startup/health behavior changed by the cleanup, lock, and workflow wiring. The canonical package suite is a separate mandatory pre-wire acceptance check and does not replace this registered tier.
**Do not escalate:** Run exactly this task-selected tier through `scripts/run-locked-tier.mjs` using this plan. The separately required pre-wire canonical package check is permitted only through an independently verified bounded diagnostic route; it never substitutes for the selected tier. Do not use an unapproved diagnostic launch or treat blocked smoke/host checks as a pass.

## Regression Guard
**Covers:** A cleanup or validation run must not signal an unapproved/stale process, treat unverifiable development or socket state as safe, overlap a proven shared-resource workload, or release a lock while owned descendants remain active.
**Test location:** scripts/port-authority.test.mjs
**What it checks:** Integration assertions reject production-with-development-domain bypasses and missing authority, preserve unrelated/caller-owned listeners, require exact approved process incarnations, verify both cleanup and lock outcomes, and ensure conflicting configured entry points do not overlap.

## Relevant files
- `.agents/skills/port-authority/SKILL.md`
- `.agents/skills/port-authority/reference/runtime-contract.md`
- `.agents/skills/port-authority/scripts/free-ports.mjs`
- `.agents/skills/port-authority/scripts/validation-lock.mjs`
- `.agents/skills/port-authority/scripts/runtime-environment.mjs`
- `.agents/skills/port-authority/scripts/host-capabilities.mjs`
- `.agents/skills/port-authority/tests/hardening.test.mjs`
- `.agents/skills/failure-gate-v4/SKILL.md`
- `.agents/skills/validation-tiers/SKILL.md`
- `.agents/skills/regression-guard/SKILL.md`
- `scripts/free-ports.mjs`
- `scripts/free-ports.test.mjs`
- `scripts/port-authority.test.mjs`
- `scripts/run-locked-tier.mjs`
- `scripts/run-tier.mjs`
- `scripts/validate-api-codegen.mjs`
- `scripts/validation-steps.mjs`
- `scripts/package.json`
- `package.json`
- `.replit`
- `docs/validation/validation-tiers.json`
- `docs/validation/failure-baseline.json`
- `artifacts/api-server/package.json`
- `artifacts/api-server/src/routes/health.ts`
- `artifacts/api-server/.replit-artifact/artifact.toml`
- `artifacts/html-port-studio/package.json`
- `artifacts/html-port-studio/playwright.config.ts`
- `artifacts/html-port-studio/.replit-artifact/artifact.toml`
- `artifacts/mockup-sandbox/package.json`
- `artifacts/mockup-sandbox/.replit-artifact/artifact.toml`
- `replit.md`
