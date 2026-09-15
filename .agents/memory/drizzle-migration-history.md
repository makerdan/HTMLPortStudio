---
name: Drizzle migration history
description: Migration workflow for the database package when schema history is maintained with hand-written SQL.
---

The database package keeps its migration history in committed SQL and journal entries; generate only after confirming the existing history has snapshots compatible with the current schema.

**Why:** Drizzle generation in a history without compatible snapshots can emit a migration that recreates existing tables instead of only adding the intended table.

**How to apply:** Prefer a narrowly scoped migration for an additive schema change, update the migration journal consistently (an unjournaled SQL file is silently skipped), apply it in development, and verify the resulting table before running API tests.