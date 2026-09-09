# Cross-browser recovery coverage

The registered `test-standard` workflow runs the complete Chromium recovery
suite and the tagged editor, download, and Claude recovery journeys in Firefox.
Chromium remains the primary project; Firefox is intentionally scoped to the
critical cross-browser tests so unrelated recovery coverage is not duplicated.

## Local runtime contract

The Studio browser-test command installs both managed Playwright engines before
launching the suite, so the registered `test-standard` workflow prepares a
fresh workspace automatically:

```sh
pnpm --filter @workspace/html-port-studio run test:browser
```

To prepare the engines without running tests, use the package-local setup
command:

```sh
pnpm --filter @workspace/html-port-studio run prepare:browsers
```

The browser binaries are stored in the managed Playwright cache and are not
committed to the repository. The workspace's `.replit` Nix configuration
provides the native runtime libraries needed by these headless browsers,
including GLib/GTK, NSS/NSPR, ATK, Pango/Cairo, X11/XCB, GBM/Mesa/OpenGL, and
ALSA. If a browser launch reports a missing executable, install the managed
engines first; if it reports a missing shared library, verify those `.replit`
packages are available in the executor environment.

## Project matrix

- `chromium`: all recovery tests in `tests/recovery.spec.ts`
- `firefox-recovery`: tests marked `[cross-browser]`, covering desktop and
  mobile-width find/replace, local file and ZIP downloads, and Claude
  review/recovery. This project runs with one worker because parallel Firefox
  startup in the managed executor intermittently closed a target before
  navigation; the same test passed three isolated retries and passes
  consistently when this project is serialized.

## Live UX verification — 2026-09-07

The live pass used the running API and Studio artifact workflows through the
preview proxy. Chromium and Firefox were exercised with the same source-mode
layout checks; provider checks were performed from Chromium. The check did not
inspect third-party implementation details.

### Responsive and interaction matrix

| Browser | Viewport / effective zoom | Result |
| --- | --- | --- |
| Chromium | 375 × 812 | Pass after the source-choice wrapping fix; no document overflow and the GitHub and CodePen/JSFiddle labels remain readable. |
| Firefox | 375 × 900 | Pass after the source-choice wrapping fix; no document overflow and the GitHub and CodePen/JSFiddle labels remain readable. |
| Chromium | 768 × 900 | Pass; no document overflow. |
| Firefox | 768 × 900 | Pass; no document overflow. |
| Chromium | 1280 × 900 | Pass; no document overflow. |
| Firefox | 1280 × 900 | Pass; no document overflow. |
| Chromium / Firefox | 150% equivalent layout (853px CSS width) | Pass; no document overflow. |
| Chromium / Firefox | 75% equivalent layout (1706px CSS width) | Pass; no document overflow. |

The managed headless browsers do not expose browser chrome, so the 75% and
150% rows use the equivalent CSS viewport widths rather than claiming a
physical browser-zoom change. A real headed-browser pass should repeat those
two rows before release.

The automated `[cross-browser]` source-choice regression in
`tests/source-focus.spec.ts` checks document width and the rendered bounds of
the GitHub and CodePen/JSFiddle labels at 375, 768, and 1280 CSS pixels in
Chromium and Firefox.

Keyboard and focus checks passed for the source analysis flow, the Claude
consent dialog, Escape dismissal, and Start Over. The Claude dialog returned
focus to its trigger. Two tabs retained independent pasted source values.
The editor exposed a vertical separator with `role=separator` and
`touch-action: none`, confirming the touch-resize affordance is present.
The source editor downloaded both a standalone `index.html` file and an
`Untitled HTML app.zip` bundle. Credential-bearing analysis showed the safe
local warning before repair or download actions. The live Poe response
returned successfully, but the rendered Poe Assistant surface has no copy
control, so clipboard-copy behavior was not applicable to that surface.
The saved reference captures are
`ux-verification/desktop-1280.jpg`, `ux-verification/mobile-375.jpg`, and
`ux-verification/sign-in-768.jpg`.

### Auth and protected handoff

- Clerk `/sign-in`, `/sign-up`, and callback-style navigation rendered through
  the configured development instance in both the preview and Chromium.
- The anonymous Replit handoff button redirected to the Clerk sign-in screen.
- Direct anonymous access to `/api/port/replit-project-connection` returned
  `401 Unauthorized` with the safe `AUTHENTICATION_REQUIRED` code.
- Firefox sign-in text did not stabilize in the headless run while sign-up
  rendered; this is classified as a browser/provider timing limitation, not a
  confirmed product defect.
- Project-creation setup links to `https://replit.com/integrations`, the
  supported Replit integrations surface. The former
  `connectors.replit.com/console/connector-config` deep link redirects to
  `/unauthorized` and is not a supported setup route.
- The current Replit integration catalog does not list
  `replit-project-creation`. Until that first-party capability is made
  available to this workspace, live handoff creation cannot be enabled or
  verified; mocked API and browser coverage does not establish provider
  availability.


### Controlled Clerk lifecycle session — 2026-09-08

The focused live run used a temporary Clerk development user and a temporary
test inbox created inside the verification process. The address, password,
provider token, and session material were never written to source, logs, or
chat, and the temporary Clerk identity was removed after each run.

| Flow | Result | Classification |
| --- | --- | --- |
| Sign-in with email and password | **Pass**; Clerk client-trust email code completed and returned the browser to `/`. | Product/provider pass |
| Anonymous protected connection read | **Pass**; `401 AUTHENTICATION_REQUIRED`. | Product pass |
| Anonymous protected handoff creation | **Pass**; rejected with `401 AUTHENTICATION_REQUIRED`. | Product pass |
| Authenticated owner connection read | **Pass**; `200` with `setup_required`. | Product pass; no project-creation connector is attached |
| Authenticated handoff creation | Authenticated boundary passed, then returned `503 PROJECT_CREATION_CONNECTION_UNAVAILABLE`. | Integration-limited, not an authorization failure |
| Authenticated reload recovery | **Pass**; the signed-in owner and protected `200` boundary recovered after reload. | Product pass |
| Callback return | **Pass**; callback-style navigation returned to `/` while the session remained active. | Product pass |
| Logout | **Pass**; the header returned to signed-out state and the protected API returned `401`. | Product pass |
| Session revocation recovery | **Product path hardened and locally verified**; Clerk cache invalidation now keys on both user ID and session ID, so a revoked session for the same user clears protected client data when Clerk reloads as signed out. A provider-backed revocation run still requires the controlled inbox to receive its client-trust email. | Product behavior verified; provider email-delivery run pending |
| Sign-up completion | **Product callback path hardened and locally verified**; sign-up now uses a forced callback destination of `/` after verification, while the real Clerk verification step remains provider-controlled. | Product behavior verified; provider verification-mail run pending |

The successful sign-in run had no Clerk asset or request outage: the
development client, environment, and UI assets returned successfully. The
remaining lifecycle evidence gap is specifically the controlled inbox:
verification/client-trust delivery must be observed before the lifecycle is
claimed complete. A delayed or missing provider message is not classified as a
Studio failure. Completing project creation itself requires connecting the
authorized Replit project-creation capability; this run did not add or modify
an integration.

For the final runtime-only verification, record only these non-secret
checkpoints:

1. Create a temporary Clerk development user and temporary inbox inside the
   verification runner; never persist the address, password, provider token,
   or session material.
2. Complete `/sign-up` with the inbox verification code and record that Clerk
   returned to `/` (callback return).
3. While signed in, revoke the active Clerk session, reload the Studio, and
   record the signed-out UI plus `401 AUTHENTICATION_REQUIRED` from the
   protected endpoint.
4. If the expected message is not available within the runner's polling
   window, record `provider_email_delivery_delayed` and stop. Do not mark the
   product path failed or claim the lifecycle complete.

### Live provider matrix

| Flow | Result | Classification |
| --- | --- | --- |
| Public GitHub inspection | Repository metadata loaded for `mdn/beginner-html-site-styled`; snapshot fetch did not finish within the live wait window and remained on the review screen. | Provider/network timing; repeat with a longer observation window. |
| Hosted URL | `https://example.com/` fetched and normalized successfully. | Product pass. |
| CodePen | Public import reached the safe “Playground could not be imported” recovery state. | Provider response/tooling limitation; source remained available. |
| JSFiddle | Public import reached the same safe recovery state. | Provider response/tooling limitation; source remained available. |
| Poe / Claude surface | Poe Assistant rendered and the live model probe returned a usable assistant surface; Claude repair was gated behind the visible consent flow. | Product/provider pass at availability boundary; no repair was applied. |
| Replit connection/project handoff | Anonymous handoff correctly required Clerk sign-in before connection setup or project creation. | Product pass for protected gating; authenticated connection creation remains environment-limited. |

No third-party internals were audited. Provider failures were kept separate
from product failures, and source content remained available after each failed
import.


### Validation evidence

The pre-fix browser baseline reproduced four test-harness defects: an
out-of-scope GitHub cancellation fixture, an authenticated handoff fixture
using undeclared route/status values, a tab assertion checking `data-state`
instead of the rendered `aria-selected` contract, and an unscoped credential
finding locator. The handoff and tab failures reproduced in both Chromium and
Firefox.

After installing the managed Chromium and Firefox engines with
`pnpm --filter @workspace/html-port-studio run prepare:browsers`, the complete
Studio browser phase passed 27 tests across Chromium and the tagged Firefox
recovery project. The authenticated handoff, tab-state, credential-recovery,
and GitHub cancellation checks pass in their supported browser projects.

These were validation/harness defects, not live product failures, and remain
separate from the 375px overflow above. The clean-workspace browser-install
limitation observed before engine installation is an environment issue.
The separate `validate:api` completion check regenerated the API sources but
reported committed React-client declaration drift against its isolated
comparison output; no generated source change was made by this verification
task, so that is tracked as repository validation drift rather than a live UX
failure.
