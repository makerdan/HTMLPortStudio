# HTML Port Studio

Import pasted, single-file, or public GitHub HTML apps as normalized source bundles, run a portability check, preview them safely, and use a server-only Poe bridge when the source app needs AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/html-port-studio run dev` — run the HTML Port Studio web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run migrate` — apply committed Drizzle migrations; this is required before deploying or starting a new API release
- Optional env: `POE_API_KEY` — enables live Poe model discovery and the server-side chat bridge
- Clerk account authentication uses `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`. Set these through Replit’s environment/secrets tools; never put the secret key in browser code, imported HTML, source bundles, or logs.
- Required for project handoff: an attached authorized Replit project-creation connection. From the Studio’s **Set up project creation** screen, Replit’s secure connection console verifies workspace-owner eligibility before authorization; no project-creation URL or token is configured in the browser or source.

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
- Poe requests run only on the API server so `POE_API_KEY` never reaches a browser or imported page.
- Previewed documents run in a sandbox without same-origin access to the Studio itself.
- Project handoff sends every normalized bundle file byte-for-byte with its explicit entrypoint through the attached server-side Replit connection, then waits for each required setup skill to confirm before starting the next one.
- Clerk authentication and Replit project authorization are separate boundaries: Clerk identifies the user and scopes handoff ownership, while the Replit connector independently verifies workspace-owner eligibility and authorizes project creation.

## Product

- Select a single `.html`/`.htm` file or paste HTML source; both become a versioned source bundle.
- Choose Paste HTML, Upload HTML, Upload ZIP, GitHub, hosted URL, or the CodePen/JSFiddle adapter flow from the landing source picker.
- Inspect a public GitHub repository, choose a branch or immutable commit, review the resolved SHA and entrypoint, then confirm the read-only snapshot.
- Import public CodePen exports or a JSFiddle rendered result through provider-specific server adapters; attribution and provider limitations stay on the normalized bundle.
- Receive a compact readiness report for scripts, external assets, browser-side requests, and likely AI calls.
- Preview the document in a sandbox, then follow a tailored migration checklist.
- When `POE_API_KEY` is configured, choose a live Poe model and ask for targeted porting help.
- After analysis, sign in, then use **Create Replit Project** to create a separate runnable HTML project. The setup status is shown step-by-step in this order: Poe Setup, Port Authority, Failure Gate, Harden Bug Fixes, then Skill Install Confirmation. A failed step can be retried without repeating completed steps, including after a server restart.

## User preferences

- Keep the product focused on importing and porting a single HTML document. Do not add a code editor or version-control workflow.

## Gotchas

- Run `pnpm --filter @workspace/db run migrate` against the target database before every API deployment. Migrations are intentionally controlled and are never run automatically at API startup.
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before using generated client or Zod types.
- Poe model IDs are case-sensitive. Use the exact identifier returned by Poe's live model catalogue.
- Set `POE_API_KEY` through Replit Secrets and restart the API server after changing it.
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
