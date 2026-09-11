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

For child processes terminated by a signal, `ChildProcess.exitCode` can remain
`null` even after the `exit` event has fired; check `signalCode` before waiting
for an exit event.

**Why:** A cleanup test could miss the already-fired exit event after its
listener was terminated with `SIGTERM`, leaving the test worker waiting until
the timeout.

**How to apply:** Treat either a non-null exit code or signal code as terminal
when writing idempotent fixture cleanup.