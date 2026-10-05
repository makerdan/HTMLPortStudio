# Stage Port Authority Without Activation

## Proposal and approval status

**PROPOSED REVISION — NOT EXECUTION AUTHORIZATION.**

This is a narrow proposed revision of Task #338 (Apply Port Authority Runtime
Hygiene), prepared in response to the staged-installation request. Approval of
the original full-application plan does not authorize this revision. Updating
or surfacing a task, its Active status, or this document does not prove renewed
plan approval. No staging, tests, caller changes, or signals may start until
the actual supported plan-approval flow approves the finalized source/snapshot
bindings and staging scope.

The prior authoritative task description has SHA-256
`a79ef508bd77a05235c87b67e0b9a4f1d3130bcca93aed113a63a7027c8aae7f`.
Its full-application obligations remain recorded in the original handoff and
downstream verifier. They are deferred, not waived or declared complete.
Task #339 currently binds that prior plan digest and full-application scope;
any amendment must be separately reconciled through the supported task flow.
Do not run that verifier against a staged-only delivery as if it were activated.

## What & Why

Separate inert source placement, isolated bundle testing, non-reclaim runtime
activation, and live reclaim. Stage the verified latest canonical seven-file
Port Authority package only after renewed plan approval, without overwriting
active scripts or changing their callers. Source placement is not operational
installation, host acceptance, successful validation, or baseline repair.

### Proposed source refresh and snapshot binding

The user selected the updated package and supplied
`attached_assets/0_port-authority_(10.04.2026)_1791152288540.zip`.
Archive SHA-256:
`8cb197df01a814a11ae77a755ef3920a7d90588494ca40868cef2390a522cadc`.
It contains exactly seven regular members, totaling 190,762 uncompressed
bytes, under `port-authority/`. CRC/integrity, exact membership, duplicate,
traversal, absolute/backslash paths, encryption and special/symlink type
inspection passed without extraction or execution. Frontmatter and local
references were inspected. These locally computed identities are not a vendor
signature, runtime acceptance or execution approval.

At the new read-only snapshot
`03b1c3fdee86e5a9998e67c65961337fa371b614`, the installed canonical package still
matches the prior package below: five source members differ from the upload;
both shared helpers are byte-identical. The new uploaded specification explicitly
adds staged installation, independent lease watchdog registration, retained
recovery disposition and additional regression coverage. The upload is an
installation input only, not an alternate canonical implementation source.

**Explicit scope change proposed for approval:** replace exactly the seven
canonical `.agents/skills/port-authority/` members with the byte-identical pinned
uploaded package, preserving their modes, before any template staging. The
original full-application plan excluded canonical changes; supplying the ZIP
does not approve this change. If the owner does not approve canonical refresh,
the owner must install the same pinned package through a separate authorized
source-management flow first. No template may be staged from the ZIP or a
mirror to evade canonical-source selection.

After actual task-plan approval, recheck the prior canonical identities,
repository/configuration bindings and destination absence; drift requires
renewal, not silent repinning. Install the approved source atomically/safely
without unrelated overwrites, verify canonical parity with all seven approved
digests, then read and use only that canonical package for implementation.

| Prior canonical baseline under `.agents/skills/port-authority/` | SHA-256 |
|---|---|
| `SKILL.md` | `0e5fabda7113d3c35fa2530d081432db99e36359fdf369b4ca50bcf8504788fd` |
| `scripts/free-ports.mjs` | `69da8c14c517f785dd0f0c033b5a1fbe75b361b223bd73628834ac29514915bf` |
| `scripts/validation-lock.mjs` | `b2baef54ae154e0af44c7626a4a79522c10644c2cf181c57f5d02274a49448c1` |
| `scripts/runtime-environment.mjs` | `ded3050e2f4505bfc192378ae031f059ba0d6361f1ea3a4c0b7f36beb40bfc4e` |
| `scripts/host-capabilities.mjs` | `cde66e139ecbb541f168edf34adbf6583369fd14e6c0590b9f67716fc0514061` |
| `reference/runtime-contract.md` | `c7d72929e0dfd2cb29ad8a663597219cd5a5a05e9cea1253baad4278f4bf4df4` |
| `tests/hardening.test.mjs` | `6bc8199eeb75b960d30b9f6444981b86f664f8ebcd9f6017e1dfb463f9e2676e` |

| Approved-source candidates: uploaded member / proposed canonical output | Bytes | SHA-256 |
|---|---:|---|
| `SKILL.md` | 29,648 | `55becee46210ebe74982dfd047a2cd5f5315ba4ea36b6329ecf14a99b21fc1b0` |
| `scripts/free-ports.mjs` | 14,686 | `d31d5817fe4635e7e586631be91846cc26ba6683337399d2b969b1fd223cda4f` |
| `scripts/validation-lock.mjs` | 30,139 | `d819f38df10b914751471066e36239d843cdbfd3aaa5540563047f9ca49797bb` |
| `scripts/runtime-environment.mjs` | 6,357 | `ded3050e2f4505bfc192378ae031f059ba0d6361f1ea3a4c0b7f36beb40bfc4e` |
| `scripts/host-capabilities.mjs` | 1,446 | `cde66e139ecbb541f168edf34adbf6583369fd14e6c0590b9f67716fc0514061` |
| `reference/runtime-contract.md` | 37,406 | `4c1d1ec7c8b2328f16ad4718d3400d72735eadb308666758709c936ba2de460e` |
| `tests/hardening.test.mjs` | 71,080 | `20759a2406656d74a4db7e743be4fa51da32cfad336048f36c32c23714e4b7c1` |

Consumers remain mode 0755; other members remain 0644. Both helpers must be
beside each consumer. The lock imports runtime-environment, which imports
host-capabilities; direct host imports are not required to prove adjacency.
No test adapter may be promoted as host authority.

Snapshot configuration bindings:

| Input | SHA-256 |
|---|---|
| `.replit` | `dbc36e46a81c07f9a32a40edc7a2fb382eaf6a92e8e86723fcddf0f84929a1fb` |
| `package.json` | `d142223071b3e8a2f4135d8f9ee53121be893c6ca50ae1ef12e291e6b70a63c8` |
| `replit.md` | `e3ae240daeffd3cb2e4b73f517bdfb902638c5d38d9d050a700cd6895c197df2` |
| `docs/validation/validation-tiers.json` | `3879570b8c7fcf8a74b69d681e47ea7eff396e87a76615e20c2938506a2fe73a` |
| `docs/validation/failure-baseline.json` | `0d75c373050eb42b4a96661ae96d47f47785ab893000178082c5814247122d71` |

## Done looks like

- After exact renewed approval, the canonical seven-file package is placed
  byte-for-byte in a separate inactive destination, proposed as
  `staging/port-authority/`. The destination was absent at proposal time and
  must be rechecked before writing. Refuse collisions rather than overwriting.
- Both helpers remain beside both consumer templates. Preserve source modes
  and relative reference structure. The inactive package is a delivery copy,
  never an alternate canonical definition or an authority provider.
- Verify source/destination membership, hashes, modes, helper imports, and
  lack of active caller references through permitted integrity inspection.
  Report `STAGED` only when this is actually proven; until then report
  `NOT_STAGED`, not a fabricated successful state.
- Preserve all active scripts, package scripts, workflows, service callers,
  pre/post hooks, aliases, health configuration, and validation coverage.
- Report the exact isolated suite command, route, deadlines, raw results/logs,
  and check status separately from placement. If no authorized bounded route
  and independent watchdog is available, report `BLOCKED/NOT_RUN`.
- Publish paths/hashes, unchanged-caller inventory, per-control states,
  real-host acceptance prerequisites, unresolved defects and authority blockers
  in the tracked application handoff. Staging does not close the broader
  application as validated or repair the existing baseline.

## Activation gates

| State | Evidence needed; no implied progression |
|---|---|
| `STAGED` | Verified inert placement/integrity under the approved staging plan; no active callers changed. |
| `NON_RECLAIM_VERIFIED` | Separate approved cutover; genuine runtime admission; verified filesystem/process assumptions; finite transitive and parent budgets; complete conflict coverage; two real authorized host acceptance runs. Unavailable evidence blocks this state. |
| `LIVE_RECLAIM_ENABLED` | Independent host attestation plus exact Failure Gate checked claim, live per-batch rechecks/journal, scope/run binding, outcome acknowledgement and approved host checks. Missing any part blocks signals regardless of general validation governance. |

Production-marked development admission still requires the real provider and
fresh, safe, root/boot/domain/live-ancestor-bound context record. A domain or local
record alone is insufficient. `NODE_ENV=production` and `REPLIT_DEPLOYMENT=1`
always block. Never strip/spoof production markers or ship fixture authorities.

## Current governance and unresolved observations

`replit.md` and `docs/validation/task-plan-guidance.md` explicitly state that
the v4 allocator, authorization registry, approval adapters, runner and completion
machinery are not implemented. The existing plan-file/tier validation contract
remains in force. Do not infer full v4 enforcement merely from installed source
or demand invented v4 validation endpoints. Recheck activation at execution;
unknown applicability is not inactive, and any actually activated v4 rules
must be retained.

Earlier read-only observations from the preceding proposal turn (not rerun
as host acceptance for this ZIP):

- Former orphan PID 1735 is absent. That historical identity is no longer
  current; this is not proof that all orphan listeners are gone. Future audits
  must rediscover sockets and process incarnations without signaling.
- Active legacy cleanup still uses the development-domain bypass and
  wrapper-tree inference without a checked reclaim grant. Leaving it unchanged
  preserves an unresolved risk, not safety.
- API port 8080 returns HTTP 200 `application/json` on `/api/healthz`; Studio
  port 23332 returns HTTP 200 `text/html` on that path. The Playwright startup
  URL still names `/api/healthz` on its Vite server. The routing mismatch is
  unresolved; staging does not fix it.
- Active cleanup callers remain the root and scripts-package `free-ports`
  aliases, API/Studio/Canvas `dev` scripts, and Playwright's `webServer.command`.
  No `validation-lock` caller was found in those inspected definitions.

## Out of scope

- Editing canonical skill content beyond the proposed exact seven-file source
  refresh, changing any other canonical skill or any mirror, active runtime
  scripts/imports, package/workflow/service callers, startup or cleanup hooks,
  production or CI.
- Removing a safety dependency, changing coverage/tier, installing mock/local
  authority, manufacturing approval/context records, or fabricating endpoints.
- Running legacy cleanup, restarting/terminating services, removing leases,
  or signaling current services to satisfy a checklist.
- Non-reclaim cutover and live reclaim activation; both need separately
  approved plans and genuine host acceptance.

## Steps

1. **Approve exact source refresh and staging** — Preserve the original plan
   archive and obtain approval of this exact pinned revision through the
   supported task flow. The new ZIP is resolved, but installation/staging are
   not approved by its upload or the task's IN_PROGRESS status.
2. **Refresh canonical source only after approval** — Recheck all bindings and
   apply the proposed seven-file source refresh, or verify an independently
   authorized owner installation. Verify every canonical output digest/mode,
   read its complete contract, and implement only from canonical `.agents`.
3. **Verify governance and caller scope** — Recheck active validation policy,
   canonical frontmatter/references, source identity, destination absence, and
   all callers/aliases/hooks. Preserve the existing policy where v4 is not
   active and block unknown applicability rather than inventing authority.
4. **Place inert source** — Copy only the approved canonical package into the
   separate inactive destination, preserving modes and helper adjacency.
   Verify integrity and lack of active references before reporting `STAGED`.
5. **Assess isolated checks** — With separate applicable permission, run the
   documented supervised suite twice sequentially under an independently
   verified finite fixture-tree watchdog. If authority, safe supervision or
   limits are unavailable, record `BLOCKED/NOT_RUN` without a bypass.
6. **Deliver separate states** — Publish the staging manifest, unchanged
   callers, bundle-check results and per-control activation blockers. Propose
   scoped later remediation/cutover and renew affected verifier bindings;
   do not claim operational application or validation success.

## Deferred remediation proposals

Separate future approval is needed for:

- A fail-closed cleanup cutover that rejects missing authority and hard
  production markers, preserves protection/ownership and reports skipped
  outcomes loudly. Test in isolation before caller cutover; do not reclaim a
  current service. This is not fulfilled by staging.
- A health-probe correction that proves backend JSON and fails when only SPA
  HTML is available, with API-up/API-down regression coverage.
- Non-reclaim budgeting/resource-lease cutover after verified host admission,
  transitive supervision and shared-resource coverage; inspect implicit cleanup
  dependencies rather than removing them.

No additional task is created or activation authorized by these proposals.

## Pre-existing failures to ignore

None authorized. The earlier handoff's reported standard-test failure has not
been independently classified or repaired by this proposal. Preserve raw
failure evidence, current applicability and existing provenance/retry rules.
No retry, quarantine, ignore, coverage waiver or baseline repair is authorized.

## Validation

**Command:** `test-standard`
**Why:** Preserve the currently approved registered tier while this revision
awaits approval; do not silently choose a lighter tier for staging. This
proposal does not claim that inert placement requires operational acceptance
or that placement integrity substitutes for the assigned tier.
**Do not escalate:** No tier or diagnostic run is approved by this proposal.
After renewed approval, use only the verified existing checked host route
under its applicable policy, or the actual v4 checked route if then active.
The isolated bundle command is separately authorized, exactly
`node tests/hardening.test.mjs --supervised` from the canonical directory,
twice sequentially, with documented finite test/hook/wrapper budgets and an
independent watchdog for the entire fixture tree. No direct package-script
bypass, changed flags, manual port clearing, process killing or lock deletion.
Blocked checks remain blocked and prevent validated completion where required.
The uploaded suite declares 30-second tests, 5-second hooks and a 180-second
fixture-wrapper execution limit; these are inspected source settings, not a
verified host-approved diagnostic budget. Its added independent lease watchdog
does not prove an independently authorized outer supervisor for the full suite.

## Regression Guard

Purely inert additive source placement does not alter existing runtime
behavior. The original runtime regression obligations remain required for
later cutover; this proposal neither rewrites existing tests nor claims those
obligations are satisfied by bundle fixtures or source integrity.

## Relevant files

- `.agents/skills/port-authority/SKILL.md`
- `.agents/skills/port-authority/scripts/free-ports.mjs`
- `.agents/skills/port-authority/scripts/validation-lock.mjs`
- `.agents/skills/port-authority/scripts/runtime-environment.mjs`
- `.agents/skills/port-authority/scripts/host-capabilities.mjs`
- `.agents/skills/port-authority/reference/runtime-contract.md`
- `.agents/skills/port-authority/tests/hardening.test.mjs`
- `.agents/skills/failure-gate-v4/SKILL.md`
- `docs/validation/port-authority-application-handoff.md`
- `docs/validation/task-plan-guidance.md`
- `docs/validation/validation-tiers.json`
- `scripts/free-ports.mjs`
- `scripts/run-locked-tier.mjs`
- `scripts/package.json`
- `package.json`
- `.replit`
- `artifacts/api-server/package.json`
- `artifacts/html-port-studio/package.json`
- `artifacts/mockup-sandbox/package.json`
- `artifacts/html-port-studio/playwright.config.ts`
- `replit.md`