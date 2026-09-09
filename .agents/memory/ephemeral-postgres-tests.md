---
name: Ephemeral PostgreSQL tests
description: Non-shared PostgreSQL lifecycle requirements for deterministic integration tests.
---

Use a temporary PostgreSQL cluster for recovery tests that must transition from connection refusal to a healthy store. Start it with an explicit Unix socket directory because the minimal container may not provide `/run/postgresql`; `initdb` creates the superuser matching the current OS user, not necessarily `postgres`.

**Why:** The test environment can lack the system PostgreSQL socket directory, and assuming a `postgres` role makes an otherwise healthy isolated cluster appear unavailable.

**How to apply:** Pass `-k <temp-directory>` to `postgres`, connect using the current process user, and clean up the server and data directory in a `finally` block.