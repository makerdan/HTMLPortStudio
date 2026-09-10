---
name: Hosted URL fixture ports
description: The test boundary for local HTTPS fixtures used by canonical hosted URL imports.
---

Hosted URL tests must keep the input URL on a standard HTTPS port and map the ephemeral local fixture port inside the injected fetch dependency.

**Why:** The production canonicalizer rejects nonstandard hosted-import ports before DNS or transport, while deterministic local HTTPS servers need ephemeral ports.

**How to apply:** Use a public test lookup result for the hosted validation phase, then rewrite only the injected fixture transport URL and connect to the local fixture address. Keep direct pinned-transport tests separate when testing host routing itself.