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
| Chromium | 375 × 812 | **Product defect:** the source-mode grid has `scrollWidth=412` and clips the GitHub and CodePen/JSFiddle labels at the right edge. |
| Firefox | 375 × 900 | **Product defect:** reproduces the same horizontal overflow. |
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
- A real account sign-in, sign-up completion, callback completion, logout, and
  expiry/revocation cycle was **environment-limited**: no test account may be
  created or credentials entered by this verification run. These need a
  controlled Clerk test session, not a mocked browser identity.
- Firefox sign-in text did not stabilize in the headless run while sign-up
  rendered; this is classified as a browser/provider timing limitation, not a
  confirmed product defect.

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

### Validation evidence and known harness failures

After installing the managed Chromium and Firefox engines, the registered
`test-standard` run reached 24 passing browser tests and four repeatable
test-harness failures (six browser cases):

1. `recovery.spec.ts:340` references an undefined
   `firstImportResponseSettled` value in the GitHub cancellation test.
2. `recovery.spec.ts:615` references out-of-scope `route`/`statuses` values in
   the authenticated handoff recovery test.
3. `recovery.spec.ts:674` expects `data-state="active"` although the rendered
   tab exposes `aria-selected="true"`.
4. `recovery.spec.ts:850` uses a strict `getByText` locator for a finding that
   is intentionally rendered in two readiness contexts.

The isolated checks for the handoff, tab-state, and analytics cases failed 3/3;
the full run also reproduced the GitHub fixture failure. The handoff and
tab-state failures occur in both Chromium and Firefox.

These are validation/harness defects, not live product failures, and are
separate from the 375px overflow above. The clean-workspace browser-install
limitation observed before engine installation is also an environment issue.
The separate `validate:api` completion check regenerated the API sources but
reported committed React-client declaration drift against its isolated
comparison output; no generated source change was made by this verification
task, so that is tracked as repository validation drift rather than a live UX
failure.
