---
name: Regression Guard guidance freshness
description: The synchronization boundary for planner help and canonical Regression Guard documentation.
---

Regression Guard policy wording and decision examples should be rendered from one maintained source. Canonical documents may contain generated blocks, but validation must compare them without rewriting tracked files and report the document and section that drifted.

**Why:** Planner help and canonical documents previously carried overlapping policy text, so a policy change could leave validation examples or exception wording stale.

**How to apply:** Keep the explicit updater separate from the read-only validation check. Run the check before plan or suite validation, and make stale or malformed output include the updater command.