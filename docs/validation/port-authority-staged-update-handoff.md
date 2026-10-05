# Port Authority Staged Source Refresh Handoff

## Status

**Files: STAGED. Isolated tests: BLOCKED/NOT_RUN. Runtime activation: BLOCKED.
Live reclaim: BLOCKED.**

This is the later source/staging record for Task #338. It does not replace the
broader blocked runtime assessment in
[`port-authority-application-handoff.md`](port-authority-application-handoff.md),
repair the health-probe mismatch, or establish successful validation.

## Scope and task authorization

- Re-read the current Task #338 after the user reviewed the updated Task plan.
- The user answered “yes” to the direct request to approve the staged-only plan.
  It authorizes only the plan’s exact seven-file canonical refresh and inert
  staging scope. It does not imply host authorization, test/watchdog permission,
  service disruption, runtime activation, or validation PASS.
- Updated plan SHA-256:
  `4d6d632b507b9ddcb0da13fce689ea92efc11c288147ddca472202cd51e8523a`.
- Original full-application plan SHA-256:
  `a79ef508bd77a05235c87b67e0b9a4f1d3130bcca93aed113a63a7027c8aae7f`.
  Its exact text is preserved in
  [`port-authority-original-task-plan.md`](port-authority-original-task-plan.md).
  Broader application obligations are deferred, not waived or passed.
- Task #339 remains the downstream full-application verifier with the original
  plan/source bindings. Those bindings need an approved amendment before it
  can accept this newer source or claim full-application verification.

## Source update and staged placement

Approved input:
`attached_assets/0_port-authority_(10.04.2026)_1791152288540.zip`

Archive SHA-256:
`8cb197df01a814a11ae77a755ef3920a7d90588494ca40868cef2390a522cadc`

The archive passed a repeat read-only integrity check: exactly seven expected
regular members, no duplicates, encrypted entries, traversal/absolute names,
symlink or special-file members, and successful ZIP CRC verification. No
archived code was executed. The extracted temporary text files were bounded to
the exact approved member list and hash manifest before writing.

All seven uploaded member hashes now match
`.agents/skills/port-authority/` and the inert staged copy under
`staging/port-authority/`. Members, hashes and executable permissions:

| Member | Bytes | SHA-256 | Mode |
|---|---:|---|---:|
| `SKILL.md` | 29,648 | `55becee46210ebe74982dfd047a2cd5f5315ba4ea36b6329ecf14a99b21fc1b0` | 0644 |
| `scripts/free-ports.mjs` | 14,686 | `d31d5817fe4635e7e586631be91846cc26ba6683337399d2b969b1fd223cda4f` | 0755 |
| `scripts/validation-lock.mjs` | 30,139 | `d819f38df10b914751471066e36239d843cdbfd3aaa5540563047f9ca49797bb` | 0755 |
| `scripts/runtime-environment.mjs` | 6,357 | `ded3050e2f4505bfc192378ae031f059ba0d6361f1ea3a4c0b7f36beb40bfc4e` | 0644 |
| `scripts/host-capabilities.mjs` | 1,446 | `cde66e139ecbb541f168edf34adbf6583369fd14e6c0590b9f67716fc0514061` | 0644 |
| `reference/runtime-contract.md` | 37,406 | `4c1d1ec7c8b2328f16ad4718d3400d72735eadb308666758709c936ba2de460e` | 0644 |
| `tests/hardening.test.mjs` | 71,080 | `20759a2406656d74a4db7e743be4fa51da32cfad336048f36c32c23714e4b7c1` | 0644 |

The exact seven-member closure, frontmatter, skill-relative references,
consumer-to-runtime helper imports, runtime-to-host helper import, and unchanged
unavailable host adapter were confirmed by bounded read-only inspection. The
lock consumes the host helper transitively through `runtime-environment.mjs`;
it does not need a direct import.

**STAGED** evidence: both directories contain exactly those seven files with
matching bytes/modes, and active package scripts, runtime scripts, artifacts
and `.replit` contain no reference to `staging/port-authority`.

## Callers and host controls

Active cleanup callers remain the root and scripts-package aliases, API, Studio,
and Canvas `dev` commands, and Playwright’s pre-server `webServer.command`.
None was edited. The API remains on port 8080, Canvas 8081, Studio 23332, and
Playwright 5173 by the existing contract. No workflow, service, package script,
health route, workflow registration, or test discovery setting was changed.
Managed workflows were not restarted.

| Per-control state | Evidence and remaining blocker |
|---|---|
| `STAGED` — canonical seven-file source and inactive runtime-template snapshot | Integrity closure, hashes, modes and no active references passed as recorded above. |
| Cleanup/runtime admission | `NON_RECLAIM_VERIFIED` **BLOCKED/NOT_REACHED.** Active cleanup callers are unchanged. No real development attester/context record, runtime permission route, or safe host-acceptance run was established. |
| Validation resource lock | `NON_RECLAIM_VERIFIED` **BLOCKED/NOT_REACHED.** Template remains inert; no host-approved execution budgets/capability manifest or complete caller locking was accepted. |
| `LIVE_RECLAIM_ENABLED` | **Blocked.** No independent host attestation, checked `runtime.process-reclaim` claim, per-signal rechecks/journal or authoritative outcome route was established. No process was signaled. |

The project states in `replit.md` that Failure Gate v4 authorization and
completion machinery is not implemented. This does not supply a reclaim route
and does not replace the existing checked validation requirements. Do not infer
v4 enforcement from the staged skill or invent missing interfaces.

## Check disposition

| Check | Result |
|---|---|
| Archive membership/path/type/CRC inspection | **Passed — read-only inspection**, no execution |
| Canonical and staged seven-file digest/permission comparison | **Passed — read-only integrity comparison** |
| Frontmatter/references/helper-boundary inspection | **Passed — static inspection only** |
| Inert-stage reference scan in active entry points | **Passed — no references found** |
| `node tests/hardening.test.mjs --supervised` (two sequential isolated runs) | **BLOCKED/NOT_RUN.** No independently verified authorized bounded route/outer fixture-tree watchdog and separate test permission were available. No direct launch or substitute timeout was used. |
| Registered `test-standard` required tier | **BLOCKED/NOT_RUN.** The approved staging plan did not approve tier execution; checked current-snapshot execution and safe test supervision were not established. It must not be reported as passed. |
| Cleanup/lock live smoke checks or current-service health recheck | **NOT RUN.** They are outside the approved file-only checks and may affect running services. |
| Workflow restart, live cleanup, process kill, lease removal | **NOT RUN.** None was needed or authorized. |

An earlier package-member mode check detected that newly written JavaScript files
had default mode 0644. The four canonical/staged executable scripts were
corrected to 0755 and the full seven-file mode/parity check then passed. This is
not a test-suite failure or validation pass.

The previous handoff reported a test named `default guidance checks use project
documents without reading or rewriting the canonical v4 skill` failing in an
already-running `test-standard` workflow. It remains unclassified potential
failure evidence. No run or retry was attempted; no failure was ignored,
quarantined, or removed from the baseline.

## Open owners and next actions

1. A validation-route owner must establish a permitted bounded route and
   independent watchdog, plus applicable test permission, before the exact
   supervised bundle suite or registered `test-standard` tier is run.
2. A trusted runtime/platform owner must provide real independent development
   attestation/context and reclaim/evidence routes before cleanup can signal.
3. The task owner must separately approve and renew Task #339’s full-verifier
   bindings after runtime implementation is authorized. Do not let the task’s
   original hash/scope accept this staged snapshot as a full application.
4. Preserve and separately propose a fail-closed cleanup remedy and the
   Playwright-to-API JSON health-probe correction. The observed cleanup risk and
   HTML fallback are not repaired by this staged bundle; recheck live state
   read-only when later authorized.

**Overall result:** canonical bundle and inert copy are **STAGED**. The broader
runtime adoption remains incomplete, and no validation is reported as passed.