---
name: Replit project-creation capability
description: Supported setup boundary and availability limits for authenticated project handoffs.
---

Use Replit's documented Integrations/Connectors surface for project-creation setup. Do not construct links to the connectors service's internal `connector-config` route or claim that it verifies workspace-owner eligibility.

**Why:** The internal deep link redirects to an unauthorized page, official documentation directs users to the Project Editor's Connectors panel, and the required first-party capability may not be present in the workspace integration catalog.

**How to apply:** Keep Clerk identity and project-creation authorization as separate boundaries. Explain that handoffs remain unavailable when the capability is absent, and do not treat mocked connector tests as proof of live provider availability.