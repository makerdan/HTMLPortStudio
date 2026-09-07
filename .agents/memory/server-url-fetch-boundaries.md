---
name: Server URL fetch boundaries
description: Security rule for server-side requests that involve user-selected URLs or provider origins.
---

User-selected server-side URL fetches must resolve and validate every destination before connecting, pin the validated address for the request, and handle redirects manually. Fixed provider-origin requests are a separate safe boundary only when user input cannot influence the hostname and redirects are rejected.

**Why:** DNS validation alone is vulnerable to resolution changes between checking and connecting, and automatic redirects can introduce a private or rebinding destination.

**How to apply:** Reuse the shared pinned request helper for hosted and provider imports. When adding a new outbound request, inventory whether its hostname is user-controlled, bound to a fixed provider origin, or supplied by server configuration, and add focused tests for its redirect and private-address behavior.