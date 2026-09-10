---
name: OpenAPI integer codegen
description: Orval and the workspace Zod version have an incompatibility around OpenAPI integer schemas.
---

When adding numeric fields to the OpenAPI contract, use a numeric schema rather than `type: integer` unless the generated Zod version is upgraded in the same change.

**Why:** The current Orval output emits `zod.int()` for integer schemas, but the workspace Zod runtime does not expose that API, so code generation can succeed while library typechecking fails.

**How to apply:** After changing numeric OpenAPI fields, regenerate immediately and run the library typecheck before editing downstream consumers.