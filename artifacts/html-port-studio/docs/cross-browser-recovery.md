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
