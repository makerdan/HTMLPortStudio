# Failure Gate v4 Canonical Package Update Handoff

## Status

**Definition package: STAGED.** All 19 canonical package members are present
under `.agents/skills/failure-gate-v4/` with the supplied bytes and modes.
Archive integrity, member hashes, `SKILL.md` frontmatter and required text, and
package-local Markdown references passed static inspection.

**Validation and runtime: BLOCKED/NOT_RUN or pending.** The registered
`test-fast` tier and the bundled authoring suites were not run. This source
update does not install or activate project-local Failure Gate enforcement,
grant a validation run, enable runtime reclaim, or prove runtime-skill
visibility/parity.

This is the file-only handoff for the canonical definition update. It is not an
application, host acceptance, validation result, policy registration, runtime
activation, or permission to execute the supplied scripts.

## Source and consent

- Authorized input:
  `attached_assets/Failure_Gate_v4_(10.04.2026)_1791160196350.zip`
- Archive SHA-256:
  `356fd69fd41b0989f1ec01435f400a16be86ab80773352538c1957257d092932`
- Archive size: 130,986 bytes; 19 members; 374,916 uncompressed member bytes.
- Consent reference: the user-authorized `source_update=install_new` answer
  recorded in the Task #340 specification. This authorizes replacing this
  canonical definition package only. It does not authorize test execution,
  watchdog use, task-ID policy, runtime disruption/reclaim, edits to Task #339,
  or application of the contract.

The archive SHA identifies the supplied input bytes; it is not external
authentication or host authority. Inspection used the exact named archive. ZIP
CRC verification passed; its 19 unique member names exactly matched the
expected manifest. No encrypted, absolute, traversal, symlink, or special-file
entries were present. All entries were regular files with mode `0644`; member
and total sizes stayed within the task's stated bounds. No archived script or
test was executed.

## Pre-write snapshot and installation

Immediately before replacement:

- Git `HEAD`: `22522bc5801115826ac33edbec9091b18447a808`
- `git status --short`: clean.
- The canonical package contained exactly 14 regular files, all mode `0644`.
  Their pre-write hashes are in the manifest below. Twelve differed from the
  authorized source, two already matched, and five source members were absent.
- The complete package inventory and every pre-existing member hash were
  rechecked immediately before writing. The expected baseline still matched.

Only the 17 differing or absent package members were atomically replaced/added.
The two byte-identical members were left untouched. No unrelated package files
were deleted. The five supplied Python files remain mode `0644`; the presence
of a script or test under the skill package does not make it a live hook.

| Canonical member | Bytes | Mode | Supplied SHA-256 | Pre-write state |
|---|---:|---:|---|---|
| [`README.md`](../../.agents/skills/failure-gate-v4/README.md) | 20,114 | `0644` | `73b62ae149293f76a09d42df393fc8bb2d643611c49012e371dbc21f49d54319` | Replaced; prior `f1af83232ad023d33ee93983a2f79ff97439e92d8360f1dfe2a52d47c0efefac` |
| [`SKILL.md`](../../.agents/skills/failure-gate-v4/SKILL.md) | 33,088 | `0644` | `f254989c41b3d366d2ad0f993185711e825097856ede3c17581dcfa8aafcbb49` | Replaced; prior `3293a1342d459f740598b919ed06c2d6a30235459b173bebfd93ad118ab33644` |
| [`reference/acceptance.md`](../../.agents/skills/failure-gate-v4/reference/acceptance.md) | 46,084 | `0644` | `ad84265b5aa260084440d0e4d1a50ee1da111b304a8fab4d62d068d89e8cd005` | Replaced; prior `928ad2a66d8a59fb03c5298ca223979da66063c8877353714c43b2d4117a1f47` |
| [`reference/adapters/posix-writer-lock/README.md`](../../.agents/skills/failure-gate-v4/reference/adapters/posix-writer-lock/README.md) | 7,432 | `0644` | `b576ef0c6bfc60907b643454bf8fa2b1c9539c725974e4c1dd63f1ad5719183d` | Replaced; prior `e4d30359e7436332b6f322ff116c9f3aec2f50b1667775b90dccc6fb96f766f1` |
| [`reference/adapters/posix-writer-lock/tests/test_writer_lock.py`](../../.agents/skills/failure-gate-v4/reference/adapters/posix-writer-lock/tests/test_writer_lock.py) | 6,398 | `0644` | `777035d2a9ceae4c976734125869686b9d713f0dec008dba18692e119a8eedb8` | Unchanged; already matched source |
| [`reference/adapters/posix-writer-lock/writer_lock.py`](../../.agents/skills/failure-gate-v4/reference/adapters/posix-writer-lock/writer_lock.py) | 6,101 | `0644` | `791a20ee9909127f2d03b577a6573cc382317cf8a58a898f146a89db5befe503` | Replaced; prior `3d4474496bf2019e58c35f8002b600275b06c35884f9d5407671c67e7e06f654` |
| [`reference/evidence-and-recovery.md`](../../.agents/skills/failure-gate-v4/reference/evidence-and-recovery.md) | 13,648 | `0644` | `5d13d7010c360c4fa4a41bab2c9b00f68299517effadecdfc80d08922d8cc120` | Replaced; prior `e036eb83f7abb0feea60fc15ebe059a568dc166dc7c0f88dfa47167130dd40e5` |
| [`reference/execution-monitoring.md`](../../.agents/skills/failure-gate-v4/reference/execution-monitoring.md) | 16,741 | `0644` | `7d027e71ed23c349eb52990ffb967dc2bc7c9bd15cd11eb01a397bce18ea54ed` | Replaced; prior `4e544a37431881440ac384f173a60ad3c9298af893beb3d907748a6942bfef1a` |
| [`reference/implementation.md`](../../.agents/skills/failure-gate-v4/reference/implementation.md) | 54,218 | `0644` | `15fee268766f694a95b4fe5801bb2f0516f77d637838997635b3462390096c8f` | Replaced; prior `f1f8fa97ffc2bf07ffa1493c5a4c001b1c4d76e0359289c655f288b5a35747d4` |
| [`reference/owner-directed-closure.md`](../../.agents/skills/failure-gate-v4/reference/owner-directed-closure.md) | 8,482 | `0644` | `ab30931f6615b4b361e15f5da3d47595606945354720f9c0ea45e2ed5dd5a3ff` | Replaced; prior `e4c22039b735919adf6502284a6920cb1ad8da2beeee7e256fe775fa39a56641` |
| [`reference/runtime-reclaim.md`](../../.agents/skills/failure-gate-v4/reference/runtime-reclaim.md) | 23,209 | `0644` | `3cf00d3ecf2170876a8105c331c14261a54df281710debfb01b9c0747458aed8` | Replaced; prior `4905c962848407dd1d4452020fe4be864a6523652d9c21192ef221c39d21e9a2` |
| [`reference/staging-and-lifecycle.md`](../../.agents/skills/failure-gate-v4/reference/staging-and-lifecycle.md) | 11,615 | `0644` | `bbda5ce063ae9b37045f5d88217c73b16ab499e2c82fe1ac10d39b43aecd0987` | Added; absent before installation |
| [`reference/validation-budgets.md`](../../.agents/skills/failure-gate-v4/reference/validation-budgets.md) | 20,577 | `0644` | `21f3c32393e3603d889e0d6b9109861527c188eede12c4d1a78e50aa451f1606` | Replaced; prior `fec28c2b1f84b6566bfea643726440261448b473de9311054f8b790ed340256e` |
| [`scripts/run-authoring-tests.py`](../../.agents/skills/failure-gate-v4/scripts/run-authoring-tests.py) | 2,225 | `0644` | `7cb97c3b61927e56a00bbe02e7f2cf9adc8adddc8e76c55d183f406a777cfc0f` | Added; absent before installation |
| [`tests/authoring_supervision.py`](../../.agents/skills/failure-gate-v4/tests/authoring_supervision.py) | 11,418 | `0644` | `c759dee01e36b2ea0acee65d80b7e2a0d2b0977725f52d09dc6ccf2d672a7698` | Added; absent before installation |
| [`tests/test_audit_regressions.py`](../../.agents/skills/failure-gate-v4/tests/test_audit_regressions.py) | 9,759 | `0644` | `f27ec34c92cbac232df86d31dc909784e8c2ed27bacc91a733df050a9fec0df9` | Added; absent before installation |
| [`tests/test_runtime_reclaim_contract.py`](../../.agents/skills/failure-gate-v4/tests/test_runtime_reclaim_contract.py) | 30,166 | `0644` | `4c4d5d589b662642e8eef20347af34514a0cb6fb657b0eb81e61fcd7626b2bbd` | Unchanged; already matched source |
| [`tests/test_staging_lifecycle.py`](../../.agents/skills/failure-gate-v4/tests/test_staging_lifecycle.py) | 24,668 | `0644` | `ac1e3a013980d051e99ee182b5ae2200497af19d415d76c64961365742020381` | Added; absent before installation |
| [`tests/test_validation_budgets.py`](../../.agents/skills/failure-gate-v4/tests/test_validation_budgets.py) | 28,973 | `0644` | `75823a4f3b274a58b7312b77409c722df5a89136be71f98fc026b36f068c26e2` | Replaced; prior `a4bc00c15b02880d01bace9c4c9ea81e2895e48cc6cafd9406a98d9b0cb04f89` |

## Delivered snapshot and integrity checks

- Canonical `SKILL.md` SHA-256:  
  `f254989c41b3d366d2ad0f993185711e825097856ede3c17581dcfa8aafcbb49`
- The package has exactly 19 regular files totaling 374,916 bytes; all are
  mode `0644` and each matches the supplied byte count and SHA-256 above.
- Sorted package-manifest SHA-256:
  `a0c53a41104d0b941a807940edabf1f5139bc2f86745888c20051f8672fc4cd4`.
  This is SHA-256 over UTF-8 lines sorted by package-relative path, each
  formatted `<path>\t<size>\t<mode as four octal digits>\t<sha256>\n`.
- `SKILL.md` frontmatter delimiters, `name: failure-gate-v4`, and folded
  `description` were checked. The required lifecycle reference, ACTIVE /
  INACTIVE / UNKNOWN routing, and canonical `.agents`/non-mirror wording are
  present.
- The source states: “Classification is not a waiver: provenance alone cannot
  authorize acceptance.” Its acceptance section restricts
  `ACCEPTABLE_WITH_IGNORED_FAILURES` to qualifying catalog ignores or a
  separately approved, pinned, exact-bound current policy decision.
- All 45 package-local Markdown links in the 11 Markdown files resolve to
  existing files or directories.
- No archive member was executed. No authoring test, application test, service
  restart, workflow restart, process signal, lease removal, or live runtime
  probe was performed.
- Post-write Git snapshot remains based on
  `22522bc5801115826ac33edbec9091b18447a808`. Before this handoff was added,
  Git showed the 17 changed package members only: 12 modifications and five
  additions. The two already-matching members remained untouched. No commit
  was made as part of this handoff.

## Controls, callers, and open verification

| Control or caller | Observed state | Boundary / remaining evidence |
|---|---|---|
| Canonical definition | **STAGED** at `.agents/skills/failure-gate-v4/`; `replit.md` names this as the canonical skill path. | This records source placement and integrity, not host enforcement or runtime visibility. |
| Failure Gate v4 host enforcement | **Not implemented / not activated.** | `replit.md` says the v4 allocator, authorization registry, approval adapters, runner, and local completion machinery are not implemented by the installed definitions. Existing project plan checks are not proof of these controls. |
| Supplied scripts and tests | **Definition resources only; inert in observed wiring.** | No references to the new package `scripts/` or `tests/` paths were found in `.replit`, root `package.json`, `scripts/`, artifacts, or `.github/`. These files were not run or wired as hooks. |
| `test-fast` tier | **BLOCKED/NOT_RUN.** | It is registered with a 900,000 ms tier timeout. `.replit` invokes `pnpm run test-fast` directly; the package script runs Failure Gate plan checks and then static checks. No verified task-bound execution permission plus independent transitive outer supervision/resource-safe route was established for this task. The source-update consent is not test permission. |
| Bundled authoring suites | **BLOCKED/NOT_RUN.** | No separate permission to run them or verified authorized finite supervisor was established. The supplied supervisor/test files remain unexecuted resources. |
| Runtime skill visibility and mirror parity | **PENDING independent verification.** | No `.agents/skills/.workspace-projections/failure-gate-v4` or `.local/skills/failure-gate-v4` path was found by name; no `.local` mirror was read, copied, or changed. The Agent runtime's actual resolution/parity was not exercised. |
| Existing source-digest references | **Unreconciled; unchanged.** | `docs/skills/bundle-installation.md`, `bundle-source-manifest.json`, and `bundle-comparison.json` still record prior digest `70e624…`; the skill-application-router command manifest still lists `44f44…`. `docs/validation/task-plan-guidance.md` also says the uploaded bytes are preserved. These files are outside this package replacement; their relationship to the newly installed source must be independently resolved. They are not authority for the installed bytes. |
| Validation workflows and callers | **Configuration unchanged; live workflow status not queried.** | `.replit`, root scripts, CI files, and project callers were not modified. Direct workflow configuration does not itself prove a Failure Gate v4 checked route or an independent watchdog. |
| Port Authority / runtime reclaim | **No change; live state not re-probed.** | The existing [Port Authority staged-update handoff](port-authority-staged-update-handoff.md) reports tests/runtime activation blocked and no live reclaim authorization. This package update grants no signal, cleanup, or lease authority. |
| Task #336 / #337 / #341 linkage | **No task plan or dependency changed.** | At handoff, Task #336 was reported in progress but blocked waiting for input; Tasks #337 and #341 were pending behind their parent. Independent verifier linkage remains blocked until the permitted workflow binds the actual finalized installer delivery. |

The paired Task #341 confirmation is limited to `SKILL.md`; it cannot replace
full-package, source-manifest, caller, or runtime verification. Task #337 remains
the independent full-package/application-verification track. Do not treat task
labels, this handoff, runtime discovery, or a static fixture as acceptance.

## Check disposition

| Check | Result |
|---|---|
| Authorized archive identity, size, member set, duplicate/path/type/encryption checks, and ZIP CRC | **PASS — read-only inspection; no code executed** |
| Pre-write canonical package inventory and hashes | **PASS — matched the recorded 14-file baseline immediately before replacement** |
| Delivered member hashes, sizes, modes, and exact 19-file closure | **PASS — static byte comparison** |
| `SKILL.md` frontmatter, required routing/provenance wording, and package-local references | **PASS — static inspection** |
| Registered `test-fast` tier | **BLOCKED/NOT_RUN — no verified permitted finite execution route established** |
| Supplied bundle authoring tests | **BLOCKED/NOT_RUN — no test execution permission/verified supervisor** |
| Runtime skill visibility/parity and host enforcement | **PENDING/BLOCKED — independent evidence not established** |
| Runtime reclaim, service/workflow restart, signaling, or lease mutation | **NOT RUN — outside scope and not authorized** |

**Overall:** the exact revised canonical definition package is **STAGED**.
Validation, application, live integration, runtime visibility/parity, and
enforcement acceptance are not claimed.