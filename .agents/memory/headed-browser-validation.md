---
name: Headed browser validation
description: Playwright setup probes and headed source-choice zoom coverage in the Studio package.
---

Browser preparation should invoke the package-local `playwright` binary directly from the
package script environment; `pnpm exec playwright` is not reliably resolvable from a package
setup module. Probe browser launches separately from the test command so missing browser
downloads and missing native libraries can be diagnosed without rewriting Playwright assertion
failures.

**Why:** The managed browser cache and native runtime are separate prerequisites, and a setup
failure must not hide a real product regression.

**How to apply:** Keep setup classification before `playwright test`, preserve the test runner's
exit status and stack traces, and run headed source-choice checks in dedicated browser projects.