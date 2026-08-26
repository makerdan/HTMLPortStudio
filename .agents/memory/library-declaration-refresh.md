---
name: Workspace library declaration refresh
description: Composite package declaration output can lag source changes during artifact typechecks.
---

When shared TypeScript libraries change, refresh their composite declaration output with the workspace build before diagnosing downstream artifact type errors.

**Why:** Artifact typechecks may resolve generated declaration output rather than the current library source, making valid exports appear missing.

**How to apply:** Run the workspace library typecheck/build before rerunning dependent artifact typechecks.