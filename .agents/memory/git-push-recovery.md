---
name: Git push recovery evidence
description: Safe evidence and decision rules for rejected pushes when tracking refs or Git transport may be stale or unavailable.
---

For a rejected push, identify the configured push target and read its branch tip through a fresh authenticated channel before changing refs. Compare that tip with the local tip and preserve both histories: a remote ancestor of local permits only a normal push; a remote-ahead or divergent graph requires reconciliation; authentication failure stops the operation.

**Why:** A stale tracking ref or an unavailable Git transport can hide the actual remote state, while force-pushing can silently discard remote-only commits.

**How to apply:** Keep remote inspection read-only, record the exact target and commit IDs, use an internal authenticated API connector when direct Git transport is unavailable, and never treat a normal push as ready until the remote tip is an ancestor of local.