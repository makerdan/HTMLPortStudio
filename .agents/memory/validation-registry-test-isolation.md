---
name: Validation registry test isolation
description: Parallel validation tests must not rewrite the tracked tier registry.
---

Validation-tier tests that exercise malformed catalogs should use temporary fixture files and an explicit loader override rather than rewriting the tracked registry.

**Why:** The standard suite runs independent test files concurrently. A temporary rewrite can make unrelated contract tests observe an incomplete registry and fail intermittently.

**How to apply:** Keep the production catalog unchanged during tests, scope fixture selection to the test process or child process, and verify the default loader still reads the tracked catalog.