# GitHub Actions validation

This repository's primary remote validation processors are the tracked
workflows at `.github/workflows/validation.yml` and
`.github/workflows/production-build.yml`. They are installable repository
contracts, not evidence that GitHub has activated them, run them successfully,
or made a check required. Those facts remain unknown until real runs are
observed in the private repository.

## Scope and evidence

- Target repository: `https://github.com/makerdan/HTMLPortStudio`
- Default branch: `main`
- Visibility: private, as confirmed for this task
- Local evidence: Node 24, pnpm 10.26.1, and a pnpm workspace with
  `pnpm-lock.yaml`
- Remote evidence: see the verification snapshot below; no successful remote
  workflow run or required-check configuration is currently available

## Verification snapshot

Read-only GitHub API checks on September 9, 2026, using the repository's
authenticated GitHub connection, found:

- The repository exists, is private, and has `main` as its default branch.
- `GET /actions/runs` returned zero workflow runs.
- `GET /actions/workflows/validation.yml` and
  `GET /actions/workflows/production-build.yml` returned `404`, so GitHub has
  not activated either workflow on the remote default branch. The workflow
  files are present locally but are not yet available in the GitHub repository
  revision being inspected.
- `main` reported `protected: false`.
- Both the branch-protection and repository-rulesets endpoints returned
  `403` with GitHub's message that the feature requires GitHub Pro or a public
  repository. No required `validation` check can therefore be confirmed or
  enabled from this repository's current plan.
- There are no pull requests to use as a pull-request or fork behavior
  observation. No secrets or write-capable workflow permissions were added.

This is evidence that remote activation and branch protection are not complete,
not evidence that the workflow jobs pass. A real pull-request, `main` push, or
scheduled post-merge run must be observed after both workflow files reach
GitHub.

The existing Replit workflows remain the local validation owners. This note
does not replace `.replit` or add a second application validation contract;
`production-build` is the registered local contract used by both GitHub
workflows.

## Local-to-remote coverage

| Validation surface                       | Local owner                              | GitHub job      | Command or behavior                                         |
| ---------------------------------------- | ---------------------------------------- | --------------- | ----------------------------------------------------------- |
| Primary application validation           | Replit `test-standard` workflow          | `test-standard` | `pnpm run test-standard`, unchanged                         |
| Generated API freshness and declarations | Replit `api-validation` workflow         | `validate-api`  | `pnpm run validate:api`, separately visible and fail-closed |
| Pull-request production build             | Replit `production-build` workflow       | `production-build` | `pnpm run production-build`, required by `validation` |
| Stable pull-request aggregate             | Replit workflow aggregate                | `validation`    | Fails unless all three upstream jobs finish with `success` |
| Advisory post-merge production build      | Replit `production-build` workflow       | `post-merge-build` | Same command, coalesced by `production-build.yml` |

`test-standard` continues to cover Failure Gate validation, workspace
typechecks, focused script/API/Studio tests, and the browser phase. The
separate API job runs the same generated-source comparison and isolated
declaration checks as `validate:api`; its temporary `.cache/api-validation-*`
output is cleaned by the validator and is never committed.
The production-build job runs the registered `production-build` command, which
enters the Failure Gate before invoking `pnpm run build` for every workspace
package.

## Runtime and service prerequisites

All jobs use GitHub-hosted `ubuntu-24.04`, Node 24, and exactly pnpm
10.26.1. Dependencies are installed with `pnpm install --frozen-lockfile`.
The application job installs the existing Playwright Chromium and Firefox
engines with their Linux dependencies before invoking the canonical command.
The package's browser command then prepares the managed engines as it already
does locally.

The existing Playwright projects are preserved rather than split into an
unverified matrix:

- `chromium`: the complete recovery suite
- `firefox-recovery`: tests tagged `[cross-browser]`, serialized with one
  worker
- `mobile-recovery`: tests tagged `[mobile]`, using the existing Pixel 5
  device profile

The production build intentionally does not install browsers or contact live
services. It checks the complete workspace build only, so it remains portable
and does not require production, deployment, database, Clerk, or Poe
credentials.

The validation jobs do not receive production, database, Clerk, Poe, or
deployment credentials. The focused tests use their existing local fixtures
and configuration; live provider behavior, database migrations, deployment
checks, and release behavior are intentionally outside this portable contract.

## Event scopes and security

The pull-request workflow listens for:

- all `pull_request` events
- pushes to `main`
- `merge_group` `checks_requested` events when GitHub supplies merge queues
- explicit `workflow_dispatch` requests

The post-merge workflow listens only for pushes to `main` and a schedule every
30 minutes. Its eligibility job reads the current default-branch head and the
history of successful `post-merge-build` jobs through the read-only Actions
API. Neither workflow requests production credentials or consumes repository
secrets. The pull-request workflow-wide permission is `contents: read`; the
post-merge workflow adds only `actions: read` so it can inspect its own prior
verification history. Pull requests from forks use the normal
read-only `pull_request` token boundary and do not receive privileged tokens
or secrets. GitHub may apply its own first-contributor approval policy before a
fork workflow is allowed to run; that repository setting is not configured or
claimed here.

Pull-request runs share a concurrency group and cancel superseded pull-request
runs. Push and merge-group runs are not canceled by this expression, so
protected-branch or merge-queue validation is not displaced by later work.
Post-merge runs share a separate main-branch group and cancel obsolete queued
or in-progress work. A later push or schedule can retry a canceled run.
Each job has a finite timeout.

Every third-party action is pinned to an immutable commit reviewed for this
workflow:

- `actions/checkout` `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1)
- `actions/setup-node` `820762786026740c76f36085b0efc47a31fe5020` (v7.0.0)
- `actions/upload-artifact` `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (v7.0.1)

pnpm is installed with npm at the exact required version, so no mutable
package-manager action is needed.

## Diagnostics, caching, and duplicate decisions

No dependency cache is configured: the workflow installs the exact pnpm
version before using the lockfile, avoiding a dependency on a runner image's
preinstalled package-manager binary. Browser engines are installed by
Playwright instead of adding an independent browser cache that could become
stale or hide missing dependencies.

Application jobs publish status-only summaries but never upload files. On an
unexpected workflow non-success, a separate diagnostics job that does not
check out or execute repository source makes a best-effort upload of only the
bounded JSON evidence envelope, retains it for three days, and ignores an
empty file. It deliberately does not upload screenshots, traces,
DOM/error-context files, videos, source bundles, logs, or environment files
because those can contain imported content or other sensitive details.
Artifact upload cannot change the validation result.

Pull-request validation has three visible upstream jobs and one stable
aggregate. Post-merge verification is intentionally separate and advisory:
its eligibility job can skip without claiming that a build passed, while its
`post-merge-build` job reports success only after the canonical build command
completes. The Replit validation workflows are retained as the local owners;
no duplicate package script, validation tier, or application test was
introduced.

## Compact evidence contract

Every instrumented job writes a compact JSON envelope through the
repository-owned `scripts/ci-evidence.mjs` helper. The envelope is a diagnostic
handoff, not a second validation result. It is bounded at 16 KiB and contains
only the approved fields below. The names in the first column are the
repository's normalized handoff vocabulary; the second column shows where the
current envelope represents each value. A field that cannot be collected
without reading source or provider data is explicitly represented as
`not-collected`, never inferred or replaced with a dump.

This compact evidence envelope is the first diagnostic handoff reviewed by
humans; it is never a substitute for the authoritative validation result.
The authoritative validation remains unchanged.

| Normalized field | Current envelope representation and allowed value |
| --- | --- |
| `revision` | `metadata.commitSha` plus the run attempt; the SHA is immutable or `unknown-sha` |
| `branchOrPullRequest` | Bounded `metadata.ref`, containing a branch or pull-request ref only |
| `changedFiles` | `not-collected`; source enumeration is outside this contract |
| `workflow` / `job` | `metadata.workflow` and the stable `metadata.job` name |
| `command` | The canonical local command named by the owning job, never shell arguments or command output |
| `result` | `lifecycle.status` and `outcome`; diagnostic results are independent and `authoritative` is always `unchanged` |
| `exitCode` | The integer exit code on an allowlisted phase record, or `null` when GitHub ended the job before a phase reported one |
| `failureExcerpt` | `excerpts`: bounded, status-only text describing the failing phase or upstream result; never raw output |
| `cancellation` / `retry` | `metrics.cancelled` and bounded `metrics.retryCount` |
| `skip` | `lifecycle.expectedSkips` and the allowlisted `lifecycle.upstream` statuses |
| `timeout` | `timed_out` lifecycle or phase status, including command exit `124`; platform timeouts remain only as precise as GitHub's result |
| `retainedArtifactIds` | Opaque `artifacts[].name` values with kind, condition, retention, and byte limit |
| `localComparisonStatus` | `localComparison.status`: `match`, `mismatch`, `not-compared`, or `not-applicable`, plus the local tier |

The envelope may also contain only the contract metadata needed to interpret
these fields: `version`, event, run ID, bounded phase measurements, artifact
size (`artifactSizeBytes` and its 16 KiB limit), and the explicit `redactions`
list. Phase names are limited to `setup`,
`dependency-install`, `browser-install`, `eligibility`, `command`, and
`upload`. Failure excerpts are limited to four status messages of at most 512
characters each; the producer uses fixed messages and upstream status names.

The following content is expressly prohibited in every summary and retained
artifact: repository dumps, source bundles, imported HTML, changed-file
contents, environment files or values, credentials, secrets, provider
payloads, prompts, request identifiers, full logs, full dependency-install
logs, and unbounded browser traces, videos, DOM snapshots, or screenshots.
The contract does not permit a path, filename, or opaque artifact identifier to
be used as a way to smuggle any excluded content. The helper reads only
allowlisted GitHub metadata and phase state.

Lifecycle statuses are preserved rather than collapsed into a green/failed
boolean. A skipped post-merge build is marked as an expected skip when the
coalescing policy intentionally skipped it; an unexpected skip remains visible
diagnostic evidence. A timeout or cancellation is never represented as
success. The stable pull-request `validation` aggregate still checks every
upstream result for exact `success`, independently of this envelope.

Excerpts are fixed status messages, capped in count and length, and never copy
command output. The helper does not inspect source, secrets, or external
telemetry.

Phase state and the per-job summary envelope use separate runner-temporary
files. Wrapped commands do not receive either evidence path or the GitHub
step-summary path. Publishing strictly rebuilds metadata and phase records
from allowlisted fields and writes atomically. Uploadable evidence is generated
later on a clean diagnostics runner that never checks out or executes
repository source. This runner writes a new bounded status-only file and only
uploads after that preparation succeeds, so a command or surviving descendant
cannot replace the bytes selected for upload.

The helper preserves an exit-124 result from the registered command as
`timed_out`. A GitHub platform job timeout can terminate the runner before any
final step executes; in that case the independent workflow diagnostic reports
the upstream job's available non-success result and must not claim more precise
timeout evidence than GitHub supplied.

## Diagnostic artifacts and cost signals

Diagnostic uploads are best-effort and use the pinned artifact action. They
run only after a failure, cancellation, or unexpected skip, tolerate an empty
file, retain only the bounded JSON envelope for three days, and use
`continue-on-error: true`. They execute on a clean runner, independently of
the mandatory jobs, and can never change the authoritative result. A final
status-only summary line records the upload step outcome without rewriting the
already selected artifact. Successful jobs and intentional post-merge skips
publish summaries without uploading an artifact.

The envelope reports bounded setup, dependency-install, browser-install,
eligibility, command, upload, retry, cancellation, lifecycle, and artifact-size
signals. These are measurements for diagnosis only. A single run, a passing
retry, or a small artifact is insufficient evidence for removing a validation
step, changing a timeout, adding a cache, or otherwise optimizing CI. Gather
an evidence window covering multiple successful and unsuccessful runs, compare
the same job and event classes, and obtain a separately reviewed smallest
change before proposing an optimization. Cost observations never authorize a
weaker validation contract; they must not weaken validation or become
permission to weaken validation.

## Diagnosis and escalation checkpoints

Use this order when a remote job is unexpected. Branch isolation means keeping
the observed commit and diagnostic edits separate from unrelated work:

1. Isolate the branch and commit. Reproduce on the same branch or an isolated
   diagnostic branch; do not mix unrelated edits into the evidence.
2. Review the smallest change first and compare the compact envelope with the
   local baseline and the exact registered local tier. A local/remote mismatch
   is evidence to investigate, not permission to replace the canonical command.
3. Start with the compact-evidence-first summary. Inspect only the bounded
   status metadata and approved artifact reference before considering any
   deeper investigation. Do not download or create excluded logs, source
   bundles, provider payloads, environment files, traces, videos, DOM
   snapshots, or screenshots.
4. At the pre-merge checkpoint, verify the workflow files, job ownership, and branch policy
   through the authorized GitHub read-only checks. Local workflow files do not
   prove remote activation or required-check configuration.
5. After merging, monitor the main push and scheduled post-merge result. The
   advisory post-merge job cannot replace the stable pull-request aggregate.

AI assistance is conditional, not automatic. It may be considered only after
the branch is isolated, compact evidence is complete, the local comparison is
recorded, two-factor provenance is available where a failure is being
classified, and a human has authorized the specific diagnostic question and
redacted evidence scope. Human authorization is required before any escalation.
It must not receive source, imported content,
provider payloads, environment values, secrets, or unbounded logs. This
repository must not invoke AI automatically; it does not invoke a model, add
credentials, send telemetry, or change
GitHub policy as part of CI diagnostics.

If a workflow change is unsafe, stop at the smallest reversible boundary:
preserve the authoritative validation jobs and aggregate, revert the
diagnostic-only change, and rerun the same registered local tier. Before
removing or renaming a stable job, check whether branch protection or a
ruleset references it; never remove a required check first. Rollback is a
human-authorized repository operation, not an automated response to a
diagnostic upload failure.

## Post-merge coalescing policy

The post-merge workflow is advisory and never substitutes for the
pull-request `validation` check. On each `main` push and every 30-minute
schedule tick, it considers the current default-branch head:

1. If that exact commit already has a successful `post-merge-build` job, it is
   skipped and is not rebuilt.
2. Otherwise, it runs when at least four commits have accumulated since the
   newest successful post-merge verification.
3. It also runs when the newest default-branch commit has been quiet for at
   least 30 minutes, even if fewer than four commits have accumulated.
4. If no successful verification exists yet, the commit count starts at the
   repository root, allowing the first eligible verification to establish the
   history.

Only successful build jobs are used as history. Failed or canceled workflow
runs are not recorded as successful verification, so the same head remains
eligible on a later push or schedule tick. A canceled eligibility/build run
also cannot make the pull-request aggregate pass: that aggregate is in the
separate workflow and requires its own production-build job result.

## Exclusions and remaining evidence gaps

This change does not:

- change repository visibility, billing, environments, variables, secrets,
  runner labels, branch protection, rulesets, or required checks
- dispatch, rerun, approve, or mutate a remote workflow run
- add credentials or write-capable tokens
- add release, deployment, performance, security-scanner, migration, or live
  provider jobs

Still unavailable locally are proof that GitHub accepted and activated either
workflow, passing remote runs, the exact check names shown by GitHub, private
repository plan support for merge queues, and any branch policy requiring the
`validation` check. These must not be inferred from these files.

## Remaining manual GitHub settings

After the first real pull-request, `main` push, and scheduled post-merge run
are verified in GitHub:

1. Confirm both workflows are active and the pull-request jobs
   `test-standard`, `validate-api`, `production-build`, and `validation`
   appear with the expected names.
2. Confirm the post-merge workflow's eligibility decision and
   `post-merge-build` result match the current head and policy.
3. Confirm fork and first-contributor behavior is acceptable for the private
   repository without granting secrets or write permissions.
4. Separately authorized repository administrators may require the stable
   `validation` check in branch protection or a ruleset. That setting is not
   part of this task.
5. If merge queues are enabled and supported by the repository plan, confirm
   the `merge_group` event produces the same aggregate check.

## Rollback and follow-up actions

Before removing or disabling either tracked workflow, check whether any GitHub
branch-protection rule or ruleset references its checks. Removing a workflow
first can leave a required check permanently pending. Local Replit validation
remains available while the workflows are disabled.

The workflows should be kept unchanged until real GitHub runs supply the
missing activation and check-name evidence. Any later settings change belongs
to separately authorized GitHub administration work.
