---
name: GitHub action pin review
description: Review release notes and resolve immutable action tag SHAs before updating workflow pins.
---

Pin third-party GitHub Actions only after checking the upstream release notes and security/advisory pages, then resolve the exact tag to its full commit SHA from the upstream repository. Verify the SHA length and version comment together.

**Why:** Release pages can expose newer major versions and verified commits that are easy to mis-copy when a shortened SHA or mutable tag is used as the source of truth.

**How to apply:** For future workflow maintenance, compare the current pin with the intended release, use the tag's full SHA, and validate every action reference plus its comment before running the registered tier.