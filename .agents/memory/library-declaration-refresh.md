---
name: Workspace declaration validation
description: Composite declaration checks must consume emitted output without racing parallel workspace validation.
---

When validating a composite TypeScript library, force-refresh declarations and make the downstream consumer resolve the emitted `.d.ts` entry explicitly rather than the package's source export. Generate validation-only code and declarations in an isolated ignored directory.

**Why:** A package export can keep a consumer typecheck on source even when project-reference redirects are disabled, giving false confidence that declarations work. Validation commands may also run concurrently, so cleaning the normal generated directory can briefly remove files used by another typecheck.

**How to apply:** Use a dedicated validation tsconfig/path mapping to the isolated declaration entry, force-build it, verify resolution when changing the setup, and compare isolated codegen output with committed generated source. Keep mutators and other generator inputs outside any output workspace configured with `clean: true`; copy or normalize them only after generation.