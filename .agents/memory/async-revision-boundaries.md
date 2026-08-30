---
name: Async revision boundaries
description: Prevent delayed analysis and repair responses from being accepted or rejected because a React render closure captured an old revision.
---

When a user action increments a source revision and immediately starts an asynchronous analysis or repair request, keep the current revision in a synchronously updated ref and compare callbacks against that ref.

**Why:** A callback created before React commits the state update can compare its requested revision with the previous render's state. That can discard a valid rescan after apply or undo, or weaken stale-response protection if the comparison is adjusted incorrectly.

**How to apply:** Update the ref at the same boundary that updates revision state, pass the resulting revision into the request, and reject callbacks when either the import session or the ref no longer matches.