---
name: Completion validation polling
description: How to handle managed completion checks that do not reach a terminal status.
---

Managed completion validation can remain running until the platform poll budget is exhausted even after the assigned validation command has been run manually and its failures have been classified.

**Why:** A non-terminal completion harness result is distinct from a failing test result; retrying the same managed poll does not add validation evidence and can delay task completion.

**How to apply:** Run the task's exact validation command and focused checks, capture stable failure evidence and ownership, then use the completion callback's audited skip reason only when the managed check reports a poll-budget limitation.