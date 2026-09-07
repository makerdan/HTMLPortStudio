---
name: Node test TypeScript extensions
description: The native Node test runner's behavior for TypeScript test file extensions.
---

**Rule:** Use `.ts` for Node-native TypeScript tests that contain no JSX. Use a configured TSX-capable runner for tests that do contain JSX.

**Why:** Node's `--experimental-strip-types` test runner rejected a `.tsx` test file even though its contents had no JSX, while the same source ran successfully after changing the extension to `.ts`.

**How to apply:** When adding source-level tests that only inspect files or exercise non-JSX code, give them a `.test.ts` extension and expose a package script that invokes the native Node test runner. Use explicit `.ts` extensions for local imports reached by those tests; native resolution does not apply Vite's extension fallback. If a test imports a shared helper, prefer its explicit source `.ts` path when the package barrel re-exports generated extensionless modules that Node cannot resolve.