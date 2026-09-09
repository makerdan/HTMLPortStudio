---
name: Replit development runtime guards
description: Environment markers needed for safe development-only process cleanup in managed Replit workspaces.
---

**Rule:** A managed Replit development workspace can expose `REPLIT_ENVIRONMENT=production` while also providing `REPLIT_DEV_DOMAIN`. Development-only cleanup must recognize the dev-domain marker before refusing to run.

**Why:** Port cleanup is needed by managed development workflows, but rejecting the environment label alone prevents every service startup and validation smoke test from running.

**How to apply:** Keep production guards strict for environments without a development domain; never use the development-domain exception for deployment or published runtime commands.