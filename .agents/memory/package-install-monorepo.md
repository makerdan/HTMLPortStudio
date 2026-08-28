---
name: Monorepo package installation
description: Package installs in this workspace must target the owning package rather than the workspace root.
---

The language-package helper may invoke `pnpm add` at the workspace root and fail on pnpm's workspace-root safety check. Target the specific package with pnpm's filter when adding a dependency.

**Why:** Frontend-only dependencies should remain scoped to their artifact; adding them at the root changes unrelated workspace dependency resolution.

**How to apply:** For an artifact dependency, use the artifact package name as the pnpm filter and verify both its package manifest and the lockfile importer changed.