# Port Authority Runtime Application Verification

**Disposition: BLOCKED — the full Project-local runtime application bound by this verifier is not present or accepted.**

This independent report records the read-only verification of Task #338's delivered state against the unchanged full-application obligations in Task #339. The delivered work is an approved staged source refresh only. The source and inert staging copy have good byte parity, but runtime callers still use the legacy cleanup, no project validation lock is installed, and required host authorization and test routes are unavailable. No runtime code, workflow, task plan, or task status was changed for this verification.

## Project and task binding

- Target Project in the task payload: `ced8e084-60d0-4238-8abc-31704510412d`; workspace: `/home/runner/workspace`. Task readbacks came from this workspace's project-task context. The task API did not return a separate Project-ID field, so an independent platform-ID cross-check is unavailable.
- Primary Task #338: `MERGED`; current description is 16,351 bytes, SHA-256 `4d6d632b507b9ddcb0da13fce689ea92efc11c288147ddca472202cd51e8523a`, exactly matching `docs/validation/port-authority-staged-task-proposal.md`. That description authorizes the narrow staged-only scope; the current handoff records the user's approval of that scope.
- The full-application plan originally bound by this verifier is SHA-256 `a79ef508bd77a05235c87b67e0b9a4f1d3130bcca93aed113a63a7027c8aae7f`, preserved at `docs/validation/port-authority-original-task-plan.md`. It is not the current Task #338 description.
- Verifier Task #339: `IN_PROGRESS`, depends on `#338`; authoritative description is 35,579 bytes, SHA-256 `8fd88205aa5e4ed68869bda6d41f2de0386b9d778b7ff2eaaac836000a6dc3fd`. The local `.local/tasks/task-339.md` body matches the authoritative task description after removing its task-heading wrapper and one final newline. The task's full payload and acceptance scope were not amended.
- Binding key preserved verbatim (version 1): `["ced8e084-60d0-4238-8abc-31704510412d","port-authority","project-task:#338","sha256:a79ef508bd77a05235c87b67e0b9a4f1d3130bcca93aed113a63a7027c8aae7f",["apply-contract","all-applicable-port-authority-project-runtime"]]`.
- Task #173 is an earlier, differently bound verifier; #333 is cancelled and concerns source-bundle clarification. Tasks #336/#337 propose the separate Failure Gate application/verification; #340/#341 propose Failure Gate package update/definition confirmation. They do not substitute for this verifier's primary plan, evidence, or binding.

**Binding result:** Task #338's merged state releases the task dependency, but the authoritative primary plan has changed from full application to staged-only delivery. Task #339 still has the original full-application obligations and source binding. The staging handoff explicitly says a renewed verifier binding is required before the new source can be accepted for the old scope. No authorized Task #339 amendment/readback route was established, and this report does not change the verifier payload.

## Baselines and inspected snapshot

### Original obligation and pre-install baselines

The task's approved environment adaptation remains unchanged: `NODE_ENV=production` and `REPLIT_DEPLOYMENT=1` always block cleanup and locking, including when a development domain is present. `REPLIT_ENVIRONMENT=production` can be admitted only with independent host proof of a development workspace and non-deployment, a fresh safe launcher-issued `PORT_AUTHORITY_DEV_CONTEXT_FILE` bound to root/boot/domain/live same-UID ancestry, and real provider attestation. The maximum context lifetime is 15 minutes; expiry before dispatch or escalation blocks new work. Both shared helpers must be adjacent to every active consumer. A domain, local record, script, task state, or fixture adapter is not authority. This adaptation does not authorize editing the canonical source or weakening hard-marker rejection.

The pre-install record in the task plan identifies revision `675a6bb120a99efd2d37d661b50bdb70ec08e60b`, with a clean tree at that inspection. Its relevant recorded identities remain:

| Input | Planning-time SHA-256 |
|---|---|
| `docs/validation/validation-tiers.json` | `3879570b8c7fcf8a74b69d681e47ea7eff396e87a76615e20c2938506a2fe73a` |
| `docs/validation/failure-baseline.json` | `0d75c373050eb42b4a96661ae96d47f47785ab893000178082c5814247122d71` |
| `.replit` | `dbc36e46a81c07f9a32a40edc7a2fb382eaf6a92e8e86723fcddf0f84929a1fb` |
| `package.json` | `d142223071b3e8a2f4135d8f9ee53121be893c6ca50ae1ef12e291e6b70a63c8` |
| `replit.md` | `e3ae240daeffd3cb2e4b73f517bdfb902638c5d38d9d050a700cd6895c197df2` |

The pre-install baseline's empty failure catalog did not grant any ignore. It also recorded an uninspected `test-standard` run, so that run was not a passing baseline.

### Delivered code snapshot

- Inspected repository revision: `45acef384f843685634f721a9e8419d4662ab350` (`Stage the updated Port Authority source without runtime activation; validation remains blocked.`). The tree was clean before this report was added.
- The relevant configuration hashes above are unchanged at this revision. Current hashes also remain `.replit` `dbc36e46a81c07f9a32a40edc7a2fb382eaf6a92e8e86723fcddf0f84929a1fb`, `package.json` `d142223071b3e8a2f4135d8f9ee53121be893c6ca50ae1ef12e291e6b70a63c8`, `replit.md` `e3ae240daeffd3cb2e4b73f517bdfb902638c5d38d9d050a700cd6895c197df2`, validation tiers `3879570b8c7fcf8a74b69d681e47ea7eff396e87a76615e20c2938506a2fe73a`, failure baseline `0d75c373050eb42b4a96661ae96d47f47785ab893000178082c5814247122d71`, and historical bundle manifest `6daea7411c6c8e7f20495494538006c2a63ea9d978890a7f2488673bef2b5d90`.
- The checked-in Task #338 handoff and inert package are inputs, not independent proof that active callers are safe. No code or workflow changes were made by this verifier; this report is the sole intended addition.
- Runtime inputs observed without exposing the development-domain value: `REPLIT_ENVIRONMENT=production`, `REPLIT_DEV_DOMAIN` present, `PORT_AUTHORITY_DEV_CONTEXT_FILE` absent, `NODE_ENV` absent, `REPLIT_DEPLOYMENT` absent. No marker was unset or spoofed.
- Host facts observed read-only: Linux, Node `v24.13.0`, Btrfs workspace mount, `/proc` available. `/proc/net/tcp6` was absent; `/sys/module/ipv6/parameters/disable` was `1` and `/proc/net/protocols` had no `TCPv6` entry. This is positive evidence for IPv6-table omission in this snapshot only. The lock's filesystem durability assumptions and stronger process-supervision boundary were not exercised or host-approved.

## Canonical source and runtime visibility

The latest supplied archive is `attached_assets/0_port-authority_(10.04.2026)_1791152288540.zip`, SHA-256 `8cb197df01a814a11ae77a755ef3920a7d90588494ca40868cef2390a522cadc`. A stream-only comparison found exactly the following seven archive members; their streamed archive digests match both the canonical source and the inert staging copy. No code from the archive was executed or extracted during this verification.

| Canonical member | Bytes | Current SHA-256 | Original verifier pin | Result against original pin |
|---|---:|---|---|---|
| `SKILL.md` | 29,648 | `55becee46210ebe74982dfd047a2cd5f5315ba4ea36b6329ecf14a99b21fc1b0` | `0e5fabda7113d3c35fa2530d081432db99e36359fdf369b4ca50bcf8504788fd` | changed |
| `scripts/free-ports.mjs` | 14,686 | `d31d5817fe4635e7e586631be91846cc26ba6683337399d2b969b1fd223cda4f` | `69da8c14c517f785dd0f0c033b5a1fbe75b361b223bd73628834ac29514915bf` | changed |
| `scripts/validation-lock.mjs` | 30,139 | `d819f38df10b914751471066e36239d843cdbfd3aaa5540563047f9ca49797bb` | `b2baef54ae154e0af44c7626a4a79522c10644c2cf181c57f5d02274a49448c1` | changed |
| `scripts/runtime-environment.mjs` | 6,357 | `ded3050e2f4505bfc192378ae031f059ba0d6361f1ea3a4c0b7f36beb40bfc4e` | `ded3050e2f4505bfc192378ae031f059ba0d6361f1ea3a4c0b7f36beb40bfc4e` | match |
| `scripts/host-capabilities.mjs` | 1,446 | `cde66e139ecbb541f168edf34adbf6583369fd14e6c0590b9f67716fc0514061` | `cde66e139ecbb541f168edf34adbf6583369fd14e6c0590b9f67716fc0514061` | match |
| `reference/runtime-contract.md` | 37,406 | `4c1d1ec7c8b2328f16ad4718d3400d72735eadb308666758709c936ba2de460e` | `c7d72929e0dfd2cb29ad8a663597219cd5a5a05e9cea1253baad4278f4bf4df4` | changed |
| `tests/hardening.test.mjs` | 71,080 | `20759a2406656d74a4db7e743be4fa51da32cfad336048f36c32c23714e4b7c1` | `6bc8199eeb75b960d30b9f6444981b86f664f8ebcd9f6017e1dfb463f9e2676e` | changed |

Thus five of seven files differ from the original verifier's source pins; the two shared helpers match. The exact current canonical closure equals the inert `staging/port-authority/` closure, with script modes 0755 and other member modes 0644. The canonical contents match the newer archive, not the original pinned package. The staged-task handoff records approval for this exact staged-only refresh, but that revised scope does not renew Task #339's old source binding or accept runtime installation.

`docs/skills/bundle-source-manifest.json` is historical provenance: its Port Authority entry describes an older three-file archive with different hashes and omits the runtime contract, both helpers, and hardening tests. It is not authority for the current package. The `port-authority` user-provided skill is listed to Agent from `.agents/skills/port-authority/SKILL.md`; no `.local/skills/port-authority` mirror was found. The injected runtime text is not available as a byte-addressable project file, so exact runtime-visible text parity is not independently established.

## Independent host, workflow, process, and resource evidence

### Authority and active consumers

- The only current project cleanup implementation is `scripts/free-ports.mjs`. At lines 19–28 it lets `REPLIT_DEV_DOMAIN` bypass all three production guards. It has early successful exits for `FREE_PORTS_DISABLE=1` and recursive `FREE_PORTS_RUNNING=1` at lines 11–17. Its TCP table reader catches read failures and continues at lines 70–89; its signal path directly sends SIGTERM/SIGKILL at lines 220–277 without host attestation, checked Failure Gate reclaim, a signed/host-owned exact manifest, or per-signal authorization recheck.
- Active callers remain root/scripts aliases, API `dev`, Studio `dev`, Canvas `dev`, and Playwright's `webServer.command`. A read-only scan found no active `.replit`, package-script, script, or artifact reference to `staging/port-authority/`. The new canonical helpers are not beside these active root consumers.
- `scripts/validation-lock.mjs`, `scripts/runtime-environment.mjs`, and `scripts/host-capabilities.mjs` do not exist. The only current project cleanup test files are `scripts/free-ports.test.mjs` and `scripts/port-authority.test.mjs`; the current `port-authority.test.mjs` explicitly tests the old cleanup's tree-kill behavior and Playwright's current health URL.
- The canonical host adapter is deliberately unconfigured: `attestRuntime()` throws `HOST_ATTESTATION_UNAVAILABLE` and `beginReclaim()` throws `FAILURE_GATE_AUTHORIZATION_UNAVAILABLE` in `.agents/skills/port-authority/scripts/host-capabilities.mjs`. No independent host attestation provider, checked reclaim claim, outcome journal, or host-authorized ownership-manifest generator was found. The current environment has no `PORT_AUTHORITY_DEV_CONTEXT_FILE`. Prior Replit documentation searches recorded in the handoff found no supported host-attestation or reclaim interface. No local record, task status, domain, or test adapter was treated as authority.

### Workflow and live-process inventory

The configured service workflows are declared as foreground commands with distinct authoritative ports: API 8080, Canvas 8081, Studio 23332. Playwright defaults to 5173, reads `PLAYWRIGHT_PORT`, validates its range, starts cleanup before Vite, and sets `reuseExistingServer: false` (`artifacts/html-port-studio/playwright.config.ts:3–23`). The tier registry contains six tiers: `test-fast`, `test-standard`, `test-standard-plus`, `test-heavy`, `production-build`, and `studio-analytics-privacy`. `.replit` provides workflows for the first five plus a separate `api-validation` workflow; it does not define a workflow for `studio-analytics-privacy`. `.replit` declares a parallel `Project` workflow that requests `test-standard` and `api-validation`; the workflow-status API did not expose a `Project` status during this audit.

At the read-only workflow snapshot (2026-10-05, approximately 00:35 UTC):

| Workflow | Observed state | Notes |
|---|---|---|
| `artifacts/api-server: API Server` | running | API listener on 8080 |
| `artifacts/mockup-sandbox: Component Preview Server` | running | Canvas listener on 8081 |
| `artifacts/html-port-studio: web` | running | Studio listener on 23332 |
| `test-standard` | running | Unrequested pre-existing/ad-hoc run; `TASK_PLAN_FILE` absent |
| `api-validation` | finished | Its logged success is unrelated to this verifier and is not tier acceptance |
| `test-fast`, `test-standard-plus`, `test-heavy`, `production-build` | not started | No task run was started |
| `studio-analytics-privacy` | no `.replit` workflow | Registry-only tier; no run was started |

The read-only `/proc/net/tcp` inventory mapped the three service ports to their service processes; it also showed tool/platform listeners and ephemeral test listeners. The process ancestry showed the service workflows and test subprocesses under the project workflow supervisor. No listener, process, browser, workflow, or lock was signaled, stopped, restarted, or removed. No health request was issued during this verifier.

The active `test-standard` log at `/tmp/logs/test-standard_20261005_003502_095_c6f57baa.log` showed `✖ default guidance checks use project documents without reading or rewriting the canonical v4 skill` and was still `RUNNING` at log capture. Its invocation was `pnpm run test-standard` in ad-hoc mode without `TASK_PLAN_FILE`; it was not initiated or accepted by Task #339 and had no final result in the captured evidence. It is unresolved failure evidence, not a passing baseline and not authorized for retry. `docs/validation/failure-baseline.json` remains empty; no failure was ignored or reclassified.

### Caller-to-resource map (observed, not installed)

| Caller | Shared or isolated resource | Coverage finding |
|---|---|---|
| `.replit` `Project` workflow | Starts `test-standard` and `api-validation` in parallel | No common Port Authority lease; the standard flow does not invoke code generation, while `validate:api` creates a unique temp output root. Workflow state API did not expose the aggregate `Project` run. |
| `test-fast` | Workspace typecheck state and lint/static-check inputs | It runs the Failure Gate check and static typecheck/lint only; no port, database, browser, or API codegen use was found. Potential overlap in typecheck/build metadata is not fully characterized. |
| `test-standard` and `test-heavy` | Playwright port 5173 and Playwright browser provisioning/cache | Both use the same fixed/default local browser port and prepare/use the Studio browser suite; neither acquires a project shared-resource lease. |
| `test-standard`, `test-standard-plus`, `test-heavy` | API and Studio unit suites; API integration tests, `DATABASE_URL`, API `dist` builds | These commands overlap the same API test/database and Studio unit-test boundaries and invoke the API build; no shared lock or single-flight is present. No database contents were read. |
| `test-standard-plus`, `test-heavy`, `api-validation` | Generated API sources and declaration checks | `scripts/validate-api-codegen.mjs` uses a unique `.cache/api-validation-*` root and supplies `API_CODEGEN_OUTPUT_ROOT`; this validator's generated/typecheck outputs are isolated per invocation. This does not establish complete coverage for all possible generator/build entry points. |
| `studio-analytics-privacy` | Studio analytics/privacy contract source and documentation | The registered tier runs `validate:studio-analytics`; no service port, database, browser, or generated output is called by that script. It has no `.replit` workflow. |
| `production-build` and API service startup/tests | Workspace outputs including API `dist` | Build and API startup/test callers can share package outputs; no resource lease coordinates them. |
| API/Studio/Canvas service startup and Playwright `webServer` | Ports 8080/23332/8081/5173 | Service ports are distinct and config-driven. Every startup still calls legacy cleanup, which has no trusted authorization. |
| Direct local package aliases | `test:static`, `test:unit`, `test:api`, `test:browser`, `test:codegen`, `test-standard:run`, `test-heavy:run`, and root/scripts `free-ports` | Nested aliases can be invoked without the outer registered tier prefix; no common resource lease or complete checked-route enforcement wraps them. API service startup also builds shared `dist` before launch. |
| GitHub Actions | Separate remote runners for standard, API validation, and production build | Remote jobs have separate runners and are outside a local lease namespace; they were not triggered or claimed as covered. |

`docs/validation/validation-tiers.json` assigns 900,000 ms to the five main tiers and 120,000 ms to the Studio privacy tier. These registry values are not inherited by the direct `.replit` `shell.exec` commands. `scripts/run-tier.mjs` has a per-tier process-group timeout, but `.replit` invokes package scripts directly; `run-locked-tier` is not wired into those workflows and does not provide the missing host approval or Port Authority lock. The observed root Node test invocation includes `--test-timeout=0`; finite test/hook timeout coverage is not established. No verified outer/cumulative supervisor covers every finite entry point, browser startup/teardown, children, or retries.

No workflow-creation rejection after workflow removal was observed. No platform workflow cap was established, so no cap is inferred and no workflow was consolidated or removed. Vite HMR/WebSockets exist; no idle-disconnect evidence was found.

## Original and resolved Port Authority requirement matrix

The original expectations below are unchanged from Task #339. Each resolved status uses only `verified`, `failed`, `blocked`, or justified `not applicable`.

| ID | Original fixed expected result | Resolved status and evidence |
|---|---|---|
| PA-SRC | Verify the pinned seven-file canonical closure, runtime-visible skill separately, no unauthorized canonical substitution, and report the stale three-file manifest. | **blocked**. Latest archive, canonical source, and inert staging hashes match each other, but five source files differ from the original pins under the separately approved staged-only plan. Exact injected runtime-text parity is unavailable; no local runtime mirror exists. |
| PA-0 | Inventory process ancestry, listeners, workflows/callers, platform limits, validation durations/resource overlap, browser/codegen/database/WebSocket/health/registration capabilities without signaling. | **blocked**. Current processes, listeners, configured workflows, callers, ports, registry and HMR were inventoried read-only. No verified platform cap, complete historical durations, host capability manifest, database verification, or live health execution was available. |
| PA-1 | Keep persistent services in foreground managed workflows using authoritative distinct ports; avoid ad-hoc background shells and hidden long jobs. | **verified**. Three named managed service workflows use foreground commands and the configured 8080/8081/23332 ports. Current process ancestry matched those managed workflows. Cleanup safety is separately failed under PA-2A/B/C/ENV. |
| PA-H1 | Reserve workflow capacity for persistent services and prefer existing consolidated registered commands; do not invent caps or delete unrelated workflows. | **blocked**. Three persistent services and several validation workflows exist; no authoritative platform limit or reserve policy was exposed. No cap was inferred and no workflow was removed. |
| PA-H2 | Map callers to resources and serialize every demonstrated conflict with a shared identity/order; identify remote callers outside the local boundary. | **failed**. The map above identifies shared browser, API test/database, and build-output resources, but no project Port Authority lock or shared lock identity exists. Remote CI is separately identified as outside the local lease boundary. |
| PA-H3 | If workflow creation is rejected after removal, inventory, make one bounded wait/retry, then consolidate or report disagreement; no retry loop. | **not applicable**. No workflow-creation rejection-after-removal event was observed. |
| PA-H4 | Bound queue, each step, children/hooks, startup/teardown, termination, evidence, parent/cumulative time, and retries at every entry point, independent of serialization. | **failed**. Registered tier timeouts alone do not bound direct `.replit` scripts or every nested step. No project lock/budget wrapper or independent outer watchdog covers direct workflows, Node test/hook execution, children and cumulative lifetime. |
| PA-2A | One audited Linux `/proc` cleanup discovers by socket inode/PID; incomplete TCP tables are UNKNOWN; absent IPv6 requires positive disabled-kernel and no-TCPv6 evidence. | **failed**. The legacy implementation discovers by inode/PID, but suppresses table-read errors and can return success when discovery is incomplete. The current host had positive IPv6-disabled evidence, but the script does not require it before omitting a missing table. |
| PA-2B | Every cleanup action, even unmarked, requires independent host attestation and checked Failure Gate reclaim for the exact task/plan/run/scope, per-signal revalidation/journaling, and durable raw outcome; uncertain calls are reconciled, not retried. | **failed**. Active `scripts/free-ports.mjs` signals without any of these checks. The canonical host adapter is unconfigured; no checked claim or evidence provider exists. No live signal was attempted by this audit. |
| PA-2C | Protect caller/ancestor/current run; authorize exact wrappers/descendants; recheck process incarnation before each signal; bounded TERM then loud KILL only for approved survivors; verify stopped targets and released port. | **failed**. Legacy code infers a tree from current process ancestry, then signals stored PIDs without manifest approval or incarnation recheck, suppresses signal errors, and reports only port-release success. No exact target manifest or structured authoritative outcome is wired. |
| PA-ENV | Hard production/deployment markers always block. Allow the narrow `REPLIT_ENVIRONMENT=production` exception only with fresh safe context and independent host attestation; helpers beside each consumer. | **failed**. `scripts/free-ports.mjs:19–28` treats a development domain alone as sufficient to bypass all production checks, including hard markers. It has no safe context/provider check; current environment has no context file. The new helpers are staged/canonical only, not beside consumers. |
| PA-3 | Playwright cleanup precedes server launch in `webServer`, never runs after launch in `globalSetup`; pass init-script data explicitly and verify port/reuse/failure behavior. | **blocked**. Static inspection confirms cleanup-before-Vite ordering, validated `PLAYWRIGHT_PORT`, `reuseExistingServer: false`, no `globalSetup`, and explicit arguments for data-bearing `addInitScript` calls. The failure/restart behavior was not exercised through an authorized route; no live restart was authorized. This does not bless the unsafe cleanup or the health URL (PA-8). |
| PA-4A | Verify Node 20+, local exclusive-create/rename/directory-sync assumptions, lease v2 bounds, monotonic budgets, safe reads, one resource/invocation, nested reentry, owned-work quiescence, and conservative stale/corrupt-state recovery. | **failed**. Node 24.13.0 and Btrfs were observed, but no project `scripts/validation-lock.mjs` exists and no required filesystem behavior was host-approved or exercised. Only the inert canonical/staged lock exists. |
| PA-4B | Every conflicting caller takes the same composite lease or all shared resources in one global order; preserve Failure Gate separation and exclude uncoordinated remote jobs. | **failed**. Direct workflows/package scripts do not acquire a Port Authority lease. No local lock identity/order is wired; remote CI remains outside the local namespace. |
| PA-5 | Trace every generator/consumer/output; prevent same-output overlap and keep isolated temporary generation isolated. | **blocked**. The `validate:api` implementation's temp output isolation is statically visible, but every potential generator/build entry point and same-output overlap could not be accepted without the authorized route and execution. No shared lock covers other build outputs. |
| PA-6 | Inspect fake-timer isolation, failure tracking, and long-lived pool error handling; do not hide failures; use current Failure Gate evidence rules. | **failed**. The active ad-hoc standard workflow logged a failing test and remained running with no final result; the baseline catalog is empty. No failure was waived or ignored. Effective finite test/hook budgets and all applicable pool/timer policies were not established. |
| PA-7 | Do not add keepalive absent idle-disconnect evidence; if present, verify protocol-level reconnect behavior. | **not applicable**. HMR/WebSockets are present, but no idle-disconnect evidence was observed; no keepalive was added. |
| PA-8 | Health checks must reach JSON `/api/healthz`, not SPA fallback; no restart without disruption approval; verify actual live behavior when claimed. | **failed**. API source defines JSON `/api/healthz`, but Playwright checks that path on the Studio Vite server (`playwright.config.ts:20–23`), whose fallback can return HTML. The prior handoff recorded a 200 HTML response from Studio. No live probe or restart was repeated in this verifier. |
| PA-9 | Run the authorized tier twice consecutively without manual cleanup and separately run the exact supervised hardening suite twice under an external finite watchdog; preserve raw results and verify health, failure propagation and lock release. | **blocked**. Neither required check was started by this verifier. No authorized checked route or independent watchdog was established. The already-running ad-hoc `test-standard` is not a substitute; it contains unresolved failure evidence. |
| PA-LIMIT | Make no distributed, cross-workspace, hostile-code, or atomic PID-reuse claim beyond verified host supervision. | **blocked**. No cgroup/job boundary or host-supervision proof is available. This report makes no stronger guarantee; the staged runtime contract itself describes cooperative `/proc` limits. |
| PA-REPORT | Separate source/runtime visibility, project implementation, and platform task lifecycle; never treat task state, handoff, or isolated fixtures as application proof. | **verified**. This report separates those evidence classes and records the Task #338 plan change, inert staging, missing host routes, active implementation state, and unrun checks independently. |

## Isolated hardening suite assertion map

The latest canonical `tests/hardening.test.mjs` contains source-level tests for the following boundaries. Test names and fixture configuration were mapped statically; no suite execution is claimed. Its `--supervised` branch declares 30,000 ms test limits, 5,000 ms hook limits, and a 180,000 ms fixture execution limit, creates private fixture state, and substitutes an explicit test-only host adapter with `hostActivationEvidence: false`. Those internal fixtures are not a trusted host or Failure Gate route and are not the external watchdog required by Task #339.

| ID | Current source-level assertion mapping | Outcome |
|---|---|---|
| HM-01 | Tests at lines 327, 359; invalid input/production, hard-marker precedence, and disabled/recursive paths. | **blocked** — source mapped; no authorized run. |
| HM-02 | Tests at lines 346, 518; valid context and missing/stale/out-of-scope context. | **blocked** — source mapped; no authorized run. |
| HM-03 | Tests at lines 372, 384; unavailable adapter and local record without independent provider backing. | **blocked** — fixtures only; no real-provider evidence or authorized run. |
| HM-04 | Tests at lines 394, 402, 422, 431, 441, 467; missing/forged/altered/replayed/concurrent grants. | **blocked** — source mapped; no authorized run. |
| HM-05 | Tests at lines 454, 480; revocation/expiry before escalation and partial outcome. | **blocked** — source mapped; no authorized run. |
| HM-06 | Test at line 492; authoritative evidence-write failure retains raw outcome and cannot pass. | **blocked** — source mapped; no authorized run. |
| HM-07 | Test at line 502; timed-out/unknown claims and malformed handles cannot signal or retry. | **blocked** — source mapped; no authorized run. |
| HM-08 | Test at line 518; absent, expired, unsafe, out-of-scope, or unverified context. | **blocked** — source mapped; no authorized run. |
| HM-09 | Tests at lines 557, 569, 583; expiry during queue, after dispatch, and before escalation. | **blocked** — source mapped; no authorized run. |
| HM-10 | Tests at lines 593, 604; unreadable TCP inventory and missing IPv6 capability proof. | **blocked** — source mapped; no authorized run. |
| HM-11 | Test at line 626; unapproved and caller-tree listeners remain protected. | **blocked** — source mapped; no authorized run. |
| HM-12 | Tests at lines 635, 649, 680; expiry/incarnation/ancestor/descendant and closed-listener identity. | **blocked** — source mapped; no authorized run. |
| HM-13 | Test at line 661; dry-run changes nothing and remains non-success/busy. | **blocked** — source mapped; no authorized run. |
| HM-14 | Test at line 661; exact approved fixture stops, unrelated target survives, port releases. | **blocked** — source mapped; no authorized run. |
| HM-15 | Test at line 672; closing listener alone does not hide a surviving approved process. | **blocked** — source mapped; no authorized run. |
| HM-16 | Test at line 690; child exit statuses propagate and missing executable fails safely. | **blocked** — source mapped; no authorized run. |
| HM-17 | Test at line 716; live owner and stale-heartbeat/max-hold do not permit takeover. | **blocked** — source mapped; no authorized run. |
| HM-18 | Test at line 802; exclusion remains until resistant child stops. | **blocked** — source mapped; no authorized run. |
| HM-19 | Tests at lines 787, 1167; surviving descendants and post-signal exit re-observation. | **blocked** — source mapped; no authorized run. |
| HM-20 | Tests at lines 724, 737, 1038, 1073; quiescent dead owner, survivors, abandoned state, and retained errors. | **blocked** — source mapped; no authorized run. |
| HM-21 | Test at line 753; forged PID/token/path cannot bypass a lease. | **blocked** — source mapped; no authorized run. |
| HM-22 | Test at line 771; valid sequential reentry and parallel sibling serialization. | **blocked** — source mapped; no authorized run. |
| HM-23 | Test at line 700; shared resources serialize while disjoint resources overlap. | **blocked** — source mapped; no authorized run. |
| HM-24 | Tests at lines 737, 1038, 1073; malformed/legacy leases and abandoned transitions fail closed. | **blocked** — source mapped; no authorized run. |
| HM-25 | Tests at lines 273, 834; independent skill/budget checks and pre-dispatch validation. | **blocked** — source mapped; no authorized run. |
| HM-26 | Tests at lines 834, 853; missing/zero/infinite/overflow limits and direct dispatcher deadline. | **blocked** — source mapped; no authorized run. |
| HM-27 | Tests at lines 891, 904, 921; wall-clock reversal, late raw zero, and expired admission. | **blocked** — source mapped; no authorized run. |
| HM-28 | Tests at lines 865, 883, 1081, 1119, 1141; async/sync stalls, independent watchdog registration/loss, detached work. | **blocked** — source mapped; no external watchdog permission/evidence and no authorized run. |
| HM-29 | Tests at lines 932, 947, 1038, 1141; journal failure, owned cleanup, retained lease, and recovery exclusion. | **blocked** — source mapped; no authorized run. |
| HM-30 | Test at line 954; descendant observed during termination receives termination. | **blocked** — source mapped; no authorized run. |
| HM-31 | Tests at lines 518, 972; unsafe/symlink context and FIFO/oversized bounded reads. | **blocked** — source mapped; no authorized run. |
| HM-32 | Tests at lines 988, 1007; transient post-signal inventory and persistent/permission failure. | **blocked** — source mapped; no authorized run. |

The required exact command `node tests/hardening.test.mjs --supervised` was not run either time. There is no raw result to accept. Static test names and fixture limits do not prove runtime behavior or host integration.

## Ordered verification work and method resolution

| Work item | Result |
|---|---|
| V-01 — task identity, payload, dependency, readiness | Task readbacks and digests verified; local verifier plan matches except its wrapper/final newline. **Blocked** for the original full-runtime dependency/readiness because #338 now binds staged-only scope and the independent Project UUID field is unavailable. |
| V-02 — source manifest, runtime visibility, distinct baselines | Current seven-member source/staging/archive byte identity and current/pre-install configuration identities verified. **Blocked** for original source pins and exact injected runtime-text parity. |
| V-03 — callers, workflows, ports, health, lock/recovery, capabilities | Read-only current configuration/source/process/workflow inventory completed; differences are classified above. Host authority and current live health behavior remain unresolved. |
| V-04 — resolve deferred methods without weakening scope | **Blocked.** No trusted host attestation, checked reclaim route, separately authorized bounded route, or verifier-plan amendment was found. The fixed acceptance matrix was not changed. |
| V-05 — two hardening-suite runs and HM mapping | Test map and fixture limits inspected; both required runs **blocked/not run** due missing independent watchdog and permitted route. |
| V-06 — two registered `test-standard` runs | Both task runs **blocked/not run**. Current ad-hoc `test-standard` is already running and has an unresolved failing test; no retry, manual cleanup, process kill, or lock operation was attempted. |
| V-07 — snapshot/payload recheck and report | Report published at the required tracked path. Code snapshot and both task payload digests were rechecked; only this report is intended to differ from the inspected code snapshot. |

## Differences, authority, and stale evidence

| Finding | Classification | Effect |
|---|---|---|
| Task #338 now binds the merged staged-only proposal (digest `4d6d...`) rather than its original full-application plan (`a79ef...`). | Approved primary-plan/scope change, recorded by the staging handoff; not an implementation defect in the inert staging step. It is a material mismatch with this verifier's unchanged binding. | Does not satisfy Task #339. Requires the authorized task owner to renew/reconcile the verifier binding; this report does not do so. |
| Five source members were refreshed to the newer uploaded package, while two shared helpers stayed byte-identical. | Expected under the approved staged-only source-refresh plan; material source identity change relative to Task #339. | Current archive/canonical/staging parity is verified, but evidence against the old source pins is invalidated. |
| Active cleanup callers, Playwright configuration, service scripts, and workflows were not switched to the staged source. | Expected under the approved staging-only plan; incomplete relative to the old full-application scope. | The old cleanup's unsafe authority and discovery behavior remains active. |
| Root validation lock and shared runtime/host helpers are absent. | Unresolved full-application obligation and concrete caller-coverage gap. | Do not claim lock coverage, runtime activation, or authorized reclaim. |
| Playwright probes `/api/healthz` on the Studio Vite server. | Existing health-check mismatch; handoff observed HTML fallback there. | PA-8 fails; no live probe or restart was made in this verification. |
| Current `test-standard` run is ad hoc, still running at log capture, and emitted one failed test. | Unresolved current failure evidence; not a verifier-run result and not an authorized baseline ignore. | Do not report pass, retry, or classify as pre-existing without applicable evidence. |

Evidence from earlier snapshots, task status, handoff assertions, static test names, and the isolated simulated host are not promoted into current runtime acceptance. Any task/source/configuration/snapshot change after this report invalidates affected evidence and requires authorized re-binding/reconciliation.

## Blocked owners and next actions

1. **Task #338 / task-plan owner:** use the supported approval flow to renew/reconcile Task #339's full-application binding after actual runtime implementation is authorized. Preserve the fixed PA/HM matrix; do not accept the staged-only plan as equivalent.
2. **Replit runtime/platform owner:** identify a genuine independent non-deployment/development attestation provider and launcher-issued safe context record. Keep the production-label exception disabled until it exists.
3. **Host / Failure Gate owner:** provide an independently checked `runtime.process-reclaim` grant, exact scope/run binding, pre-signal rechecks/journaling, revocation/replay handling, and durable outcome evidence. Do not signal processes or install a local substitute before this is available.
4. **Validation-route owner:** provide an authorized bounded route and independent watchdog that owns the complete fixture tree, plus an authorized shared-lock route for two consecutive registered `test-standard` runs. Do not use ad-hoc commands or shell timeouts as a substitute.
5. **Project/test owner:** investigate the exact failing test recorded above without suppressing it; preserve the raw result and classify it under current policy.
6. **Project owner:** review the Playwright-to-API JSON health check. Any live workflow restart still requires specific disruption authorization.
7. Once those prerequisites and approved binding are in place, repeat the full independent matrix against a freshly recorded snapshot. Do not treat these blocked checks as passed or N/A.

## Final result

The seven-file canonical source and inert staging copy match the latest supplied archive. That establishes source placement integrity only. The full Project-local runtime application is **not verified**: cleanup authorization is absent and the active legacy cleanup violates the required production/authority boundaries; there is no active validation lock; resource and budget coverage is incomplete; the Studio health probe is mismatched; and required supervised tests and tier runs were not authorized or executed. No live service was restarted or signaled, no cleanup/lock operation was performed by this verifier, and no validation is reported as passed.