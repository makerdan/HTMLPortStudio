# Approved skill-bundle installation

## Scope and source authority

Installed the 19 owner-approved ZIP packages into their mapped canonical
destinations under `.agents/skills/`. The uploaded archives, not runtime mirrors,
are the source authority. All 19 `SKILL.md` files retain their complete uploaded
bytes, frontmatter, and display names, even where the directory slug differs.

This is definition installation and reference migration, **not application of
all 19 contracts**. In particular, it does not implement Failure Gate v4's local
allocator, authorization registry, approval adapters, runner, or completion
machinery. Existing project validator scripts and commands remain unchanged.

## Reproducible source evidence

- [Source manifest](bundle-source-manifest.json) records each exact archive
  filename, approved SHA-256, explicit source-root stripping, destination,
  complete relative file set, per-file byte length and SHA-256, and exclusions.
  It also records the pre-install file sets and hashes of preserved packages.
- [Independent comparison](bundle-comparison.json) records the independently
  recomputed installed counts and skill digests, plus original and installed
  byte lengths and digests for each authorized catalog delta.
- All 19 complete archive digests matched the approved pins before any
  destination was changed. Every member header was checked before installation:
  absolute/traversal/noncanonical paths, duplicate entries, links, special
  files, encryption, and unexpected source-root payloads were rejected.
- All packages were staged and checked together before replacement. Ordinary
  directory entries were not copied. The only excluded payloads were
  `__MACOSX/._SKILL.md` from Project Skill Inventory and
  `__MACOSX/UX E2E/._SKILL.md` from UX E2E.
- Replacement removed stale contents only within mapped destinations.
  Independent verification reopened the original ZIPs, recomputed file sets,
  lengths and hashes from their bytes, and separately walked installed regular
  files. There are no missing or extra destination files.
- Total authorized source payload: **38 files, 564,871 bytes**. The two
  authorized router-resource edits change installed byte totals; their exact
  differences are recorded separately, not hidden in the source manifest.

| Canonical destination | Files | Source bytes |
|---|---:|---:|
| app-support-ops | 2 | 23,370 |
| bug-audit | 2 | 11,774 |
| chunk-it | 2 | 25,803 |
| ci-validation-parity | 1 | 12,044 |
| clerk-for-dan | 1 | 14,712 |
| failure-gate-v4 | 9 | 130,840 |
| install-github-actions | 1 | 23,420 |
| list-skills | 1 | 17,413 |
| poe-setup | 1 | 34,302 |
| port-authority | 3 | 41,752 |
| project-skill-inventory | 1 | 10,687 |
| react-render-audit | 1 | 25,685 |
| regression-guard | 1 | 20,467 |
| skill-application-router | 7 | 92,689 |
| skill-compression | 1 | 23,895 |
| skill-install-confirmation | 1 | 4,080 |
| skill-mirror-sync | 1 | 7,368 |
| task-triage | 1 | 18,008 |
| ux-confirmation-audit | 1 | 26,562 |

Supporting resources are included in those counts: both eval sets, the bug
report template, both Port Authority scripts, v4 README and full reference,
adapter and test tree, and router README and full references tree. None of
the code shipped in these packages was run.

## Preservation and reference migration

The unmatched `import-confirmation`, `import-source-bundle`, and
`validation-tiers` packages retain their exact pre-install file sets, lengths,
and hashes. The old `.agents/skills/failure-gate/` package was removed in full
only after the independent source comparison passed.

Backend setup now requests `failure-gate-v4` while preserving the display name
`Failure Gate`, setup ordering, existing status handling, and retry workflow.
Regression tests assert both initial and retried v4 identities, no legacy
lookup, and no reinstallation of completed earlier steps.

The canonical source is `.agents/skills/failure-gate-v4/SKILL.md`, whose
SHA-256 is
`70e624776e9202062ed551d5f96042276f61f3be0e2e5987f0737c9a7358b418`.
Project-generated policy and examples now live in
`docs/validation/task-plan-guidance.md` and `replit.md`, rendered by the existing
shared renderer. Both identify the separate canonical v4 skill. Default
freshness validation reads only those project documents, never the removed
package or neutral v4 definition. Tests exercise stale/read-only behavior,
explicit repair, and unchanged uploaded v4 bytes. Existing fail-closed
diagnostics and rollback checks remain in place.

Implementation names such as `scripts/check-failure-gate.mjs`,
`scripts/lib/failure-gate.mjs`, `validate:failure-gate`, and illustrative names
inside the supplied v4 references were intentionally not renamed.

## Authorized package-source deltas

Only these two supporting files differ from their archive members:

1. `skill-application-router/references/custom-skill-commands.md`: replaced
   only the old Failure Gate routing section with `failure-gate-v4`, its
   canonical path, and a v4-faithful capability/authorization/evidence routing
   prompt. Added a warning that only this entry was refreshed.
2. `skill-application-router/references/custom-skill-command-manifest.json`:
   replaced the `failure-gate` key with `failure-gate-v4`, recomputed its digest
   from the installed canonical v4 `SKILL.md`, and clarified the exception in
   the manifest note. All other keys and historical digests remain unchanged.

These are routing aids, not substitute definitions. The rest of the catalog is
historical and **does not have claimed current canonical parity**. No other
bundled resource or any uploaded `SKILL.md` was rewritten.

## Validation and limitations

- Actual pre-edit backend baseline:
  `pnpm --filter @workspace/api-server run test:unit` — **48 passed, 0 failed**.
  This supersedes the planning-time write restriction, which had established
  no backend test baseline.
- Both strict plan guards passed against the approved task plan.
- Independent source/file-set comparisons passed for all 19 packages, with
  exactly the two authorized resource differences above.
- The existing Clerk safety checker passed after installation. Clerk and
  List Skills source definitions were already byte-identical to their uploads;
  their existing contract checks were preserved, not weakened.
- Selected task acceptance is exactly the registered `test-standard` tier,
  invoked through `scripts/run-locked-tier.mjs` with the approved task plan.
  **Passed, exit 0**: workspace typechecks/lint and Clerk checker passed;
  148 project-script/contract tests, 68 Studio unit tests, 48 backend/API
  tests, and 53 browser tests passed. No failures, ignored failures, isolated
  retries, tier substitutions, or validation escalation were needed.
- The managed API workflow was restarted after the backend change and its
  health endpoint returned `{"status":"ok"}`. The previously stopped Studio
  workflow was started; the signed-out landing screenshot rendered normally
  with API Connected. Workflow startup logs were clean. This public preview
  check did not verify signed-in UI or contact a live creation provider.
- User-approved completion support: Both Vite apps now set their own
  build-only settings: Canvas uses `PORT=22 BASE_PATH=/__mockup`, and Studio
  uses `PORT=22 BASE_PATH=/`. This makes the ordinary `pnpm run
  production-build` command self-contained. These settings do not affect the
  managed preview services; their artifact configurations continue to supply
  Canvas `PORT=8081 BASE_PATH=/__mockup` and Studio's workflow-owned port and
  root base path.

No live project-creation provider was contacted. Uploaded scripts and tests
were inspected/copied only, not executed. Runtime mirrors, workspace
publication/projections, private profile, memory, and historical task archives
were not modified. This report proves canonical installation and the bounded
reference migration, not successful application or implementation of every
installed contract.