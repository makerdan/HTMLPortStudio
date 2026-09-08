---
name: Rebase validation
description: A rebase can produce malformed test files even when Git reports no remaining conflict markers.
---

After resolving a rebase or merging task branches, validate every touched test file for collection/syntax and run its focused suite before continuing the merge workflow.

**Why:** Automatic merges can interleave nearby test blocks without leaving conflict markers, so a marker-only check can miss broken code.

**How to apply:** Pair conflict-marker and diff checks with the narrowest affected test command and typecheck before calling the merge-resolution continuation. A Playwright `--list` run catches duplicate titles, declarations, and truncated test blocks before a browser launch.