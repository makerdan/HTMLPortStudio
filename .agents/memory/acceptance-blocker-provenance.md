---
name: Acceptance blocker provenance
description: How to classify final acceptance failures that prevent the locked tier from reaching task-specific checks.
---

When final acceptance is blocked by a deterministic failure in an unrelated surface, preserve the evidence and do not widen the task into repairing that surface.

**Why:** A malformed baseline catalog and a pre-existing API syntax error can fail the locked tier before port-lifecycle checks run; treating either as a runtime regression would obscure ownership.

**How to apply:** Run the plan guards, isolate the failing command three times, capture the exact compiler or workflow diagnostic, run independent task checks, and queue the unrelated repair as follow-up work. For browser tiers, preserve the browser/project and assertion so a repeated cross-browser failure is not misattributed to backend changes.