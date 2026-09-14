# HTML Port Studio

Import pasted, single-file, or public GitHub HTML apps as normalized source bundles, run a portability check, preview them safely, and use a server-only Poe bridge when the source app needs AI.

## Run & Operate

- Managed development workflows own these services and inject their configured
  ports: `artifacts/api-server: API Server` (`8080`),
  `artifacts/html-port-studio: web` (`23332`), and
  `artifacts/mockup-sandbox: Component Preview Server` (`8081`). Use those
  named workflows to start or restart services instead of background shells.
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server; its health route is `/api/healthz`
- `PORT=23332 BASE_PATH=/ pnpm --filter @workspace/html-port-studio run dev` — run the HTML Port Studio web app
- `PORT=8081 BASE_PATH=/__mockup pnpm --filter @workspace/mockup-sandbox run dev` — run the Canvas component preview
- `PLAYWRIGHT_PORT=5173 pnpm --filter @workspace/html-port-studio run test:browser` — run browser tests on the same configurable port used by their web server and URL
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run migrate` — apply committed Drizzle migrations; this is required before deploying or starting a new API release
- `pnpm workspace-skill:project` — project the explicit `WORKSPACE_SKILLS_SOURCE` into the generated `.agents/skills/.workspace-projections/` tree
- `pnpm workspace-skill:status -- --skill <skill-id>` — read-only parity check for the disposable runtime mirror
- Runtime port ownership is explicit: API `8080`, Studio `23332`, Canvas `8081`, and Playwright `5173` by default. Development startup runs `scripts/free-ports.mjs` for its owned port before launching; `PORT` is always supplied by the artifact/workflow environment.
- `pnpm run test-fast` runs typecheck and lint, `pnpm run test-standard` adds unit, API/data, and browser checks, `pnpm run test-standard-plus` covers all non-Playwright validation including isolated API code-generation checks, `pnpm run test-heavy` runs the complete suite, and `pnpm run production-build` runs the Failure Gate followed by the complete workspace production build. This workspace has one browser suite, so it does not use Port Authority Heavy locking.
- Optional secret: `POE_API_KEY2` — enables live Poe model discovery and the server-side chat bridge
- GitHub remote validation is documented in `docs/validation/github-actions.md`; every pull request runs `test-standard`, `validate:api`, and `production-build`, while advisory post-merge builds are coalesced by `production-build.yml`.
- Clerk account authentication uses `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`. Set these through Replit’s environment/secrets tools; never put the secret key in browser code, imported HTML, source bundles, or logs.
- Required for project handoff: an attached authorized Replit project-creation connection. The Studio’s **Set up project creation** screen opens Replit’s supported Integrations surface; the capability must be available in the workspace catalog. No project-creation URL or token is configured in the browser or source.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/html-port-studio/` — source-bundle import, source picker, analysis, safe-preview, and optional Poe-assistant UI
- `artifacts/api-server/src/routes/port.ts` — portability analysis and server-only Poe API bridge
- `artifacts/api-server/src/routes/playground.ts` — allowlisted CodePen/JSFiddle adapters and normalized public bundles
- `artifacts/api-server/src/routes/github.ts` — public GitHub metadata, pinned snapshot import, and repository limits
- `artifacts/api-server/src/routes/github-utils.ts` — dependency-free GitHub URL, ref, path, and entrypoint validation
- `lib/api-spec/openapi.yaml` — API contract for HTML analysis and Poe operations

## Architecture decisions

- Imported source bundles stay in the browser session until a signed-in user starts a handoff. Handoff source and setup state are then stored in the database, scoped to that user, so an interrupted setup can safely resume after a restart.
- Browser reload recovery stores only a validated job ID, owner ID, tab-scoped browser-session ID, and timestamp in `sessionStorage`. Raw HTML, analysis, credentials, and source-derived content are never stored there; reloads recover status only after authenticated server reconciliation, and reset, source replacement, logout, completion, or failed ownership checks clear the record.
- Poe requests run only on the API server so `POE_API_KEY2` never reaches a browser or imported page.
- Poe model discovery and chat require the authenticated Clerk Studio session before catalogue, quota, or provider work. The route accepts only the exact, case-sensitive model ID returned by the live catalogue and never substitutes a fallback model.
- The public Poe contract exposes the server-owned text-only capability registry: `generic-assistant` uses ordinary user content, while `gemini-repair` and `claude-repair` require the client’s redacted-source repair flow. Vision, tool calling, structured output, and streaming are explicitly unavailable; capability fallback metadata is descriptive only and does not trigger automatic model substitution.
- Poe route failures use the generated `PoeErrorResponse` union. Studio allowlists the stable code and message, while bounded `retryAfterSeconds`/`Retry-After` metadata is used only for retryable rate-limit, timeout, and provider-unavailable states. Provider bodies, request IDs, credentials, full prompts, and server diagnostics are never returned or rendered.
- Previewed documents run in a sandbox without same-origin access to the Studio itself.
- Project handoff sends every normalized bundle file byte-for-byte with its explicit entrypoint through the attached server-side Replit connection, then waits for each required setup skill to confirm before starting the next one.
- Workspace-managed skills flow one way: explicit workspace source → generated project projection → disposable runtime mirror. The mirror is never authoritative and is never provisioned by repository automation.
- Clerk authentication and Replit project authorization are separate boundaries: Clerk identifies the user and scopes handoff ownership, while an attached Replit connector independently authorizes project creation.

## Product

- Select a single `.html`/`.htm` file or paste HTML source; both become a versioned source bundle.
- Choose Paste HTML, Upload HTML, Upload ZIP, GitHub, hosted URL, or the CodePen/JSFiddle adapter flow from the landing source picker.
- Inspect a public GitHub repository, choose a branch or immutable commit, review the resolved SHA and entrypoint, then confirm the read-only snapshot.
- Import public CodePen exports or a JSFiddle rendered result through provider-specific server adapters; attribution and provider limitations stay on the normalized bundle.
- Receive a compact readiness report for scripts, external assets, browser-side requests, and likely AI calls.
- Preview the document in a sandbox, then follow a tailored migration checklist.
- When `POE_API_KEY2` is configured, choose a live Poe model and ask for targeted porting help.
- Assistant, Gemini repair, and redacted Claude repair send an explicit capability with each request. Repair source, consent, history, pending prompt, exact model selection, cooldown, and retry state remain local to the current Studio revision; delayed responses cannot overwrite a newer source or request.
- After analysis, sign in, then use **Create Replit Project** to create a separate runnable HTML project. The setup status is shown step-by-step in this order: Port Authority, Failure Gate, Regression Guard, Skill Mirror Sync, App Support Ops, then Poe Setup. Each step is resolved by canonical workspace skill identity through the authorized project-creation connection, so new projects receive the latest workspace version rather than repository copies or disposable mirrors. A failed step can be retried without repeating completed steps, including after a server restart.

## User preferences

- Keep the product focused on importing and porting a single HTML document. Do not add a code editor or version-control workflow.

## Gotchas

- Run `pnpm --filter @workspace/db run migrate` against the target database before every API deployment. Migrations are intentionally controlled and are never run automatically at API startup.
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before using generated client or Zod types.
- Poe model IDs are case-sensitive. Use the exact identifier returned by Poe's live model catalogue.
- Do not call Poe from browser code or imported HTML, add a provider SDK, log raw provider responses, or silently fall back to another model. Update `lib/api-spec/openapi.yaml` first and run `pnpm --filter @workspace/api-spec run codegen` whenever the Poe request, model metadata, response, or error union changes.
- Set `POE_API_KEY2` through Replit Secrets and restart the API server after changing it.
- The landing header provides **Sign in** before import. The handoff panel keeps **Log in to create** for users who defer sign-in; both open the same Clerk `/sign-in` flow without clearing the in-memory import, analysis, or preview.
- Configure the Clerk instance’s allowed origins with the Studio’s development and published HTTPS origins. Configure redirect URLs for the Studio base path plus `/sign-in/*` and `/sign-up/*`; the app uses `/sign-in` and `/sign-up` as its browser routes. The production server-side Clerk proxy is available at `/api/__clerk`.
- If Clerk configuration is missing, import, analysis, preview, and assistant features remain usable and the UI shows a safe sign-in-unavailable state. Protected API operations return an actionable configuration error instead of attempting legacy OIDC redirects.
- The project handoff requires sign-in and an attached authorized Replit project-creation connection. The API server resolves the connection through Replit’s server SDK; it never passes a credential to the Studio, imported HTML, or generated project. Each handoff job is accessible only to the authenticated owner; unauthenticated or cross-user status/retry requests are rejected.
- The project handoff is unavailable until the supported authorized Replit project-creation connection is attached. When it is missing, the Studio keeps the imported HTML in the current browser session and shows an owner-only setup screen with a secure Replit connection link and a refresh check.
- HTML that appears to contain a credential is blocked before handoff. Move service keys to Replit Secrets and use a server route rather than embedding them in `index.html`.
- GitHub import accepts only canonical public `https://github.com/owner/repository` URLs. It resolves the selected ref to a commit, fetches approved text files through GitHub's public API, skips generated/vendor content, enforces file/depth/size limits, and never executes repository code.
- Playground import accepts only canonical HTTPS CodePen and JSFiddle URL forms. It fetches fixed provider-owned endpoints server-side, rejects credentials and unsafe redirects, bounds responses, and never accepts arbitrary browser-side third-party requests. CodePen settings/private assets are omitted; JSFiddle imports its public rendered result rather than editor-only source.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

## Agent rules

### Failure Gate

Task-driven work follows the canonical `.agents/skills/failure-gate/SKILL.md`.
Before writing a plan, complete its discovery checklist: read relevant memory,
inspect the validation baseline catalog, search recent task failures, run the
backend spot-check when applicable, record pre-existing failures or explicitly
record none, and choose the lightest registered validation tier that covers the
task. Announce the completed checklist before the first plan heading.

Every plan must contain `## Pre-existing failures to ignore` and `## Validation`.
Validation must name a registered tier in `**Command:**`, include a real
`**Why:**`, and include `**Do not escalate:**`. Use
`TASK_PLAN_FILE=<plan>` with `scripts/check-failure-gate.mjs` and
`scripts/check-regression-guard.mjs` before creating a task.

Task validation must run exactly the plan-selected tier through
`scripts/run-locked-tier.mjs`; it must not substitute a heavier or lighter
command. Missing or malformed plan/tier data fails closed. The validation
workflow may add missing section stubs for the current `TASK_PLAN_FILE`, but
then runs strict linting so placeholders, invalid tiers, and unfilled
explanations still fail. Typecheck and build failures are task failures, not
pre-existing test baselines. A passing retry proves intermittency only; an
unlisted failure needs two-factor provenance before it can be classified as
pre-existing.

Create plans with `scripts/new-plan.mjs`, which requires exactly one of:

- `--guard-covers`, `--guard-test-location`, and `--guard-checks`
- `--guard-na-reason` with a permitted N/A reason
- `--guard-self-satisfying` naming the guard-writing deliverable

Run `node scripts/new-plan.mjs --help` (or `-h`) for inline guidance and
examples. Supported non-guard options are:

- `--title` and `--why` for required plan metadata
- `--slug` to override the output filename slug
- `--validation-tier` to select a registered validation tier (defaults to
  `test-standard`)
- `--baseline-id` for an unrelated active catalog baseline
- `--owned-baseline-id` for a baseline this task explicitly repairs
- `--pre-existing` for task-local failure evidence
- `--environment-observation` for temporary harness or resource observations
- `--output` to choose the plan file location instead of
  `.local/tasks/<slug>.md`

Baseline, pre-existing, and environment options are documentation only: they
do not lower the selected validation tier or weaken the execution gate. For
example:

```sh
node scripts/new-plan.mjs --title "Refresh imports" \
  --why "Keep imported content current." \
  --validation-tier test-standard-plus --baseline-id BASE-ACTIVE \
  --guard-self-satisfying "the Regression Guard checker and focused recurrence test" \
  --output .local/tasks/refresh-imports.md
```

To record temporary environment evidence while retaining strict validation:

```sh
node scripts/new-plan.mjs --title "Fix browser startup" \
  --why "Make browser checks reliable." \
  --validation-tier test-standard \
  --environment-observation "The headed browser is unavailable in this container." \
  --guard-na-reason "The failure is a visual regression with no screenshot infrastructure."
```

Missing or invalid non-guard inputs point back to this help section. The
Regression Guard decision examples are:

```sh
# Concrete guard
node scripts/new-plan.mjs --guard-covers "A concrete scenario or invariant." \
  --guard-test-location "path/to/recurrence.test.mjs" \
  --guard-checks "The assertion that fails if the old behavior returns."

# N/A guard
node scripts/new-plan.mjs --guard-na-reason "The failure is a race condition requiring real timing: genuine wall-clock concurrency cannot be faithfully reproduced with fake timers."

# Self-satisfying guard
node scripts/new-plan.mjs --guard-self-satisfying "the Regression Guard checker and focused recurrence test"
```

Incomplete or mixed decisions fail before a plan is written. To inspect
environment-local history without changing it, run
`node scripts/check-regression-guard.mjs --archive`. That command produces a
clearly labeled `HISTORICAL` read-only report; it does not affect strict
current-task validation, which remains scoped to `TASK_PLAN_FILE`.

## Regression Guard

```markdown
**Covers:** <concrete scenario, boundary, invariant, lifecycle, reliability property, or contract>
**Test location:** <specific test file in the layer where the wrong behavior lives>
**What it checks:** <specific assertion or observable behavior that fails if it returns>
```

The permitted exceptions are: a race condition requiring real timing, an
unmockable external API behavior, a visual regression with no screenshot
infrastructure, or a fix that removes the feature entirely. Each N/A must say
`**N/A**` and give a specific `**Why N/A:**` reason. A guard-writing task may
instead declare `**Self-satisfying**` and identify its guard or test
deliverable. Placeholder, vague, wrong-layer, and misplaced declarations fail
strict validation. Regression Guard never replaces Failure Gate or raises the
plan's validation ceiling.
## Regression Guard

```markdown
**Covers:** <concrete scenario, boundary, invariant, lifecycle, reliability property, or contract>
**Test location:** <specific test file in the layer where the wrong behavior lives>
**What it checks:** <specific assertion or observable behavior that fails if it returns>
```

The permitted exceptions are: a race condition requiring real timing, an
unmockable external API behavior, a visual regression with no screenshot
infrastructure, or a fix that removes the feature entirely. Each N/A must say
`**N/A**` and give a specific `**Why N/A:**` reason. A guard-writing task may
instead declare `**Self-satisfying**` and identify its guard or test
deliverable. Placeholder, vague, wrong-layer, and misplaced declarations fail
strict validation. Regression Guard never replaces Failure Gate or raises the
plan's validation ceiling.
