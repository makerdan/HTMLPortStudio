---
name: Workspace declaration validation
description: Composite declaration checks must consume emitted output without racing parallel workspace validation.
---

When validating a composite TypeScript library, force-refresh declarations and make the downstream consumer resolve the emitted `.d.ts` entry explicitly rather than the package's source export. Generate validation-only code and declarations in an isolated ignored directory.

**Why:** A package export can keep a consumer typecheck on source even when project-reference redirects are disabled, giving false confidence that declarations work. Validation commands may also run concurrently, so cleaning the normal generated directory can briefly remove files used by another typecheck.

**How to apply:** Use a dedicated validation tsconfig/path mapping to the isolated declaration entry, force-build it, verify resolution when changing the setup, and compare isolated codegen output with committed generated source. Keep mutators and other generator inputs outside any output workspace configured with `clean: true`; copy or normalize them only after generation.

API declaration validation also needs to account for test files that import generated source through relative paths outside the artifact root. Otherwise the validation tsconfig can fail on `rootDir` before it checks the emitted declarations.

**Why:** The API's normal typecheck and standard test suite can pass while the separate declaration-validation workflow rejects an existing test import boundary.

**How to apply:** When changing API tests or declaration validation, distinguish this `rootDir` setup failure from failures in the implementation under review; fix the validation config or import boundary in its own task.