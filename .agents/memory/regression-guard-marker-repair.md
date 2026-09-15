---
name: Regression Guard marker repair
description: How to recover when generated Regression Guard documentation contains duplicate marker blocks.
---

The guidance updater intentionally fails closed when a generated block has zero or multiple marker pairs. Remove the extra marker block while preserving the single canonical block, then rerun the updater and its read-only check.

**Why:** Automatic replacement is unsafe when the updater cannot determine which duplicate block is authoritative.

**How to apply:** When post-merge setup reports that a Regression Guard section must contain exactly one generated block, inspect the document for duplicate marker pairs, remove the duplicate, and rerun the canonical updater before retrying setup.