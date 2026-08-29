---
name: Clerk workspace constraints
description: Non-obvious Clerk configuration and React-version constraints in this monorepo.
---

Clerk’s `publishableKeyFromHost` can synthesize a hostname-derived key when no fallback key is supplied, so missing-key handling must check the actual environment value before mounting Clerk.

**Why:** Treating the helper’s return value as proof of configuration causes missing Clerk setup to enter the provider and fail with a misleading provider error instead of leaving import and preview usable.

**How to apply:** Gate the browser provider on the explicit Vite publishable-key variable and return a safe unavailable-auth state when it is absent.

This workspace intentionally pins React 19.1.0 for Expo compatibility; Clerk’s peer range omits that patch, so changing the shared React catalog is not a safe default.

**Why:** Upgrading React just to silence Clerk’s peer warning can break the mobile toolchain and unrelated workspace packages.

**How to apply:** Use the repository’s pnpm peer-version allowance for Clerk while preserving the shared React pin, then verify the install is warning-free.