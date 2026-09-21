---
name: MCP handoff attempt reconciliation
description: External MCP project creation must be reconciled locally before retrying.
---

Treat an external MCP creation result as unknown until the user searches or lists projects
and explicitly confirms exactly one destination ID. Keep the attempt ID, source revision, and
generated project name stable across retries and reloads, and never persist the transfer token.

**Why:** MCP creation has no documented idempotency input, so an automatic retry can create a
duplicate project or attach the transfer package to the wrong source revision.

**How to apply:** Use an owner-scoped server attempt record, search-first UI guidance, and a
single destination confirmation endpoint; zero matches may unlock an explicit creation retry,
while multiple matches remain blocked.