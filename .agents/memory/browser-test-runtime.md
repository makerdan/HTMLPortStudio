---
name: Browser test runtime
description: Playwright browser tests need the workspace-managed browser binary and native graphics/audio libraries.
---

The Studio browser suite uses Playwright with Chromium. A fresh environment may need the Playwright Chromium download plus native GLib/GTK, GBM, and ALSA libraries before browser tests can launch.

**Why:** The Node package alone does not provide a runnable browser in the minimal Replit container.

**How to apply:** When browser tests fail before opening a page with a missing executable or shared library error, install the browser/runtime dependencies before changing test assertions. In this workspace, invoke Playwright through the Studio package filter so its binary is resolved (`pnpm --filter @workspace/html-port-studio exec playwright install chromium`).