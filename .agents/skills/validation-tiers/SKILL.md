---
name: Validation tiers
description: Registered validation commands used as task plan ceilings.
---

# Validation tiers

The machine-readable registry is `docs/validation/validation-tiers.json`.
Every `## Validation` section must name one of its tier names in
`**Command:**`. The runner loads the command from that registry; callers must
not replace it with a hand-written command.

The initial project tier is `test-standard`, which runs the existing workspace
typechecks and focused API/Studio checks. Add a tier by updating the registry,
its tests, and the project guidance together.