---
name: Node test detached fixtures
description: Reliable detached-process fixtures for isolated native Node test workers.
---

Native Node test workers can inherit internal IPC context, making detached
fixtures that rely on an IPC channel hang without reporting readiness.

**Why:** A port-lifecycle test previously stalled while a detached child waited
for an IPC message that was unreliable under the test runner's process
isolation.

**How to apply:** Use a temporary readiness file or an ordinary stdout
protocol for detached fixtures; reserve IPC for explicitly spawned children
whose channel is owned and verified by the fixture.