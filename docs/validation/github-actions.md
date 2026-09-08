# GitHub Actions validation

This repository's primary remote validation processor is the tracked workflow
at `.github/workflows/validation.yml`. The workflow is an installable
repository contract, not evidence that GitHub has activated it, run it
successfully, or made it a required check. Those facts remain unknown until a
real run is observed in the private repository.

## Scope and evidence

- Target repository: `https://github.com/makerdan/HTMLPortStudio`
- Default branch: `main`
- Visibility: private, as confirmed for this task
- Local evidence: Node 24, pnpm 10.26.1, and a pnpm workspace with
  `pnpm-lock.yaml`
- Remote evidence: no verified workflow run, branch protection, ruleset, or
  required-check configuration is available in this workspace

The existing Replit workflows remain the local validation owners. This note
does not replace `.replit`, change package scripts, or add a second application
validation contract.

## Local-to-remote coverage

| Validation surface                       | Local owner                              | GitHub job      | Command or behavior                                         |
| ---------------------------------------- | ---------------------------------------- | --------------- | ----------------------------------------------------------- |
| Primary application validation           | Replit `test-standard` workflow          | `test-standard` | `pnpm run test-standard`, unchanged                         |
| Generated API freshness and declarations | Replit `api-validation` workflow         | `validate-api`  | `pnpm run validate:api`, separately visible and fail-closed |
| Stable required-check candidate          | Replit workflow aggregate is not changed | `validation`    | Fails unless both upstream jobs finish with `success`       |

`test-standard` continues to cover Failure Gate validation, workspace
typechecks, focused script/API/Studio tests, and the browser phase. The
separate API job runs the same generated-source comparison and isolated
declaration checks as `validate:api`; its temporary `.cache/api-validation`
output is cleaned by the validator and is never committed.

## Runtime and service prerequisites

Both jobs use GitHub-hosted `ubuntu-24.04`, Node 24, and exactly pnpm
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

The validation jobs do not receive production, database, Clerk, Poe, or
deployment credentials. The focused tests use their existing local fixtures
and configuration; live provider behavior, database migrations, deployment
checks, and release behavior are intentionally outside this portable contract.

## Event scopes and security

The workflow listens for:

- all `pull_request` events
- pushes to `main`
- `merge_group` `checks_requested` events when GitHub supplies merge queues
- explicit `workflow_dispatch` requests

The workflow-wide permission is `contents: read`. It does not request or
consume repository secrets. Pull requests from forks use the normal
read-only `pull_request` token boundary and do not receive privileged tokens
or secrets. GitHub may apply its own first-contributor approval policy before a
fork workflow is allowed to run; that repository setting is not configured or
claimed here.

Pull-request runs share a concurrency group and cancel superseded pull-request
runs. Push and merge-group runs are not canceled by this expression, so
protected-branch or merge-queue validation is not displaced by later work.
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

On an application-job failure, the workflow makes a best-effort upload of
only PNG files under Playwright's test-results directory, retains them for
three days, and ignores an empty directory. It deliberately does not upload
traces, DOM/error-context files, videos, source bundles, logs, or environment
files because those can contain imported content or other sensitive details.
Artifact upload cannot change the validation result.

There is one GitHub workflow with two visible validation jobs and one stable
aggregate. The Replit validation workflows are intentionally retained as the
local owners; no duplicate package script, validation tier, or application
test was introduced.

## Exclusions and remaining evidence gaps

This change does not:

- change repository visibility, billing, environments, variables, secrets,
  runner labels, branch protection, rulesets, or required checks
- dispatch, rerun, approve, or mutate a remote workflow run
- add credentials or write-capable tokens
- add release, deployment, performance, security-scanner, migration, or live
  provider jobs

Still unavailable locally are proof that GitHub accepted and activated the
workflow, a passing remote run, the exact check name shown by GitHub, private
repository plan support for merge queues, and any branch policy requiring the
`validation` check. These must not be inferred from this file.

## Remaining manual GitHub settings

After the first real pull-request or `main` run is verified in GitHub:

1. Confirm the workflow is active and both upstream jobs plus `validation`
   appear with the expected names.
2. Confirm fork and first-contributor behavior is acceptable for the private
   repository without granting secrets or write permissions.
3. Separately authorized repository administrators may require the stable
   `validation` check in branch protection or a ruleset. That setting is not
   part of this task.
4. If merge queues are enabled and supported by the repository plan, confirm
   the `merge_group` event produces the same aggregate check.

## Rollback and follow-up actions

Before removing or disabling `.github/workflows/validation.yml`, check whether
any GitHub branch-protection rule or ruleset references the stable `validation`
check. Removing the workflow first can leave a required check permanently
pending. Local Replit validation remains available while the workflow is
disabled.

The workflow should be kept unchanged until a real GitHub run supplies the
missing activation and check-name evidence. Any later settings change belongs
to separately authorized GitHub administration work.
