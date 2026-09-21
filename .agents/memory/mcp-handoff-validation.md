---
name: MCP handoff validation
description: Browser-test conventions and validation limits for the external-MCP handoff flow.
---

External-MCP handoff browser tests should treat Radix status controls as `combobox` elements and close the options popup before interacting with fixed header controls.

**Why:** The first focused browser runs timed out because the test assumed a button role and then left the combobox popup open over the header. The corrected interaction matches the accessible DOM.

**How to apply:** Use accessible combobox labels for phase status, select the option by role, press Escape, and only then assert or click controls outside the status section.

The locked validation runner can be blocked before application checks when the repository baseline catalog contains malformed or duplicate records; keep that infrastructure failure separate from feature-test evidence and do not repair it in an unrelated handoff task.

**Why:** Failure Gate validates the whole catalog before it resolves the selected tier, so unrelated catalog drift prevents `test-standard` from starting.

**How to apply:** Report the exact catalog error, retain focused type/unit/browser evidence, and use the audited skip reason rather than bypassing the locked tier.