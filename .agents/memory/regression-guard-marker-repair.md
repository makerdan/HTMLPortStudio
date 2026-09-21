---
name: Regression Guard marker repair
description: How to recover when generated Regression Guard documentation contains duplicate marker blocks.
---

The guidance updater intentionally fails closed when a generated block has zero or multiple marker pairs, including a missing end marker. Restore the marker structure while preserving the canonical block, then rerun the updater and its read-only check.

**Why:** Automatic replacement is unsafe when the updater cannot determine the block boundary or which duplicate block is authoritative.

**How to apply:** When post-merge setup reports that a Regression Guard section is missing, duplicated, or stale, inspect the document for complete marker pairs, restore or remove markers as needed, and rerun the canonical updater before retrying setup.