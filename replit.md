# HTML Port Studio

Import one standalone HTML file or pasted HTML, run a portability check, preview it safely, and use a server-only Poe bridge when the source app needs AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/html-port-studio run dev` — run the HTML Port Studio web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Optional env: `POE_API_KEY` — enables live Poe model discovery and the server-side chat bridge

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/html-port-studio/` — import, analysis, safe-preview, and Poe-assistant UI
- `artifacts/api-server/src/routes/port.ts` — portability analysis and server-only Poe API bridge
- `lib/api-spec/openapi.yaml` — API contract for HTML analysis and Poe operations

## Architecture decisions

- Imported HTML stays in the browser session; the app does not persist source documents by default.
- Poe requests run only on the API server so `POE_API_KEY` never reaches a browser or imported page.
- Previewed documents run in a sandbox without same-origin access to the Studio itself.

## Product

- Select a single `.html`/`.htm` file or paste HTML source.
- Receive a compact readiness report for scripts, external assets, browser-side requests, and likely AI calls.
- Preview the document in a sandbox, then follow a tailored migration checklist.
- When `POE_API_KEY` is configured, choose a live Poe model and ask for targeted porting help.

## User preferences

- Keep the product focused on importing and porting a single HTML document. Do not add a code editor or version-control workflow.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before using generated client or Zod types.
- Poe model IDs are case-sensitive. Use the exact PascalCase ID returned by Poe, such as `Claude-Sonnet-4.6`.
- Set `POE_API_KEY` through Replit Secrets and restart the API server after changing it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
