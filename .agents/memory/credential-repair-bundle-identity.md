---
name: Credential repair bundle identity
description: Safety invariant for model-assisted repair of credential-bearing multi-file source bundles.
---

Credential recovery must treat both file paths and file contents as potentially credential-bearing. Model-facing repair context uses deterministic opaque file IDs and redacted display paths; the mapping back to original paths stays local.

**Why:** A valid imported filename can itself contain a provider-token pattern. Sending or rendering raw paths would bypass otherwise complete content redaction.

**How to apply:** For any bundle-wide assistant or repair flow, scan and redact paths and contents, fail closed on incomplete redaction, accept proposals only for known opaque IDs, and re-scan the complete patched bundle.