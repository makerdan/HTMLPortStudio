---
name: MCP handoff validation
description: Browser-test conventions and validation limits for the external-MCP handoff flow.
---

External-MCP handoff browser tests should treat Radix status controls as `combobox` elements and close the options popup before interacting with fixed header controls.

**Why:** The first focused browser runs timed out because the test assumed a button role and then left the combobox popup open over the header. The corrected interaction matches the accessible DOM.

**How to apply:** Use accessible combobox labels for phase status, select the option by role, press Escape, and only then assert or click controls outside the status section.

When a handoff UI is replaced by a different route or product flow, migrate browser fixtures to the current recovery contract before diagnosing the old route's assertions as a runtime regression.

**Why:** The embedded Replit creation panel was replaced by the external MCP handoff, but legacy tests still tried to click its button and obscured the independent reload-recovery behavior.

**How to apply:** Seed a valid owner/session-bound recovery record when testing recovery directly, and keep assertions on the current user-visible handoff surface. Pass storage keys into Playwright init/evaluate callbacks; those browser callbacks cannot close over test-module constants.

The locked validation runner can be blocked before application checks when the repository baseline catalog contains malformed or duplicate records; keep that infrastructure failure separate from feature-test evidence and do not repair it in an unrelated handoff task.

**Why:** Failure Gate validates the whole catalog before it resolves the selected tier, so unrelated catalog drift prevents `test-standard` from starting.

**How to apply:** Report the exact catalog error, retain focused type/unit/browser evidence, and use the audited skip reason rather than bypassing the locked tier.