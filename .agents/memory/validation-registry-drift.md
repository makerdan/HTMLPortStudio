---
name: Validation registry drift
description: A repository validation infrastructure failure that blocks locked tiers before application tests run.
---

The locked validation runner can fail before executing application checks when `docs/validation/validation-tiers.json` contains a malformed tier entry. Treat this as validation-infrastructure drift unless the task explicitly owns the registry.

**Why:** The Failure Gate validates the entire tier registry before resolving the requested tier, so one unrelated malformed entry blocks every task using the locked runner.

**How to apply:** Record the registry failure separately from application test results, run the scoped task checks without escalating tiers, and do not repair the registry as part of an unrelated feature task.