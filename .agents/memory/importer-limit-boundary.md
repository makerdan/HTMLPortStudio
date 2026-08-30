---
name: Importer limit boundary
description: Keep server-side importer limits compatible with both workspace builds and native TypeScript tests.
---

Server-side importer source limits should remain explicit and aligned with the OpenAPI contract, while avoiding direct source imports from library packages that violate an artifact rootDir or fail native extensionless module resolution.

**Why:** The API artifact's declaration validation rejects imports outside its rootDir, and the native strip-types test runner does not resolve the workspace API Zod barrel's extensionless generated exports.

**How to apply:** When changing importer caps, update the explicit route limit source and its near-limit/over-limit tests together; run API codegen validation and the native importer suites before changing generated package boundaries.