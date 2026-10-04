# Package update: delivery-aware independent verification

## Changes

- Retain early creation of the real dependent verifier, with fixed authorized
  obligations and deferred implementation-specific methods.
- Add `references/delivery-reconciliation.md` as a required planning/execution
  reference and connect it to the Router, planner, and binding protocol.
- Separate obligation, pre-install Project, and delivered implementation
  baselines; expected Project mutation is not automatically contract drift.
- Require a tracked installer handoff for new authorized primary plans and
  independently inspect its claims. Handle older primaries without silently
  adding obligations.
- Classify expected implementation changes, incorrect verification assumptions,
  material obligation changes, implementation defects, and unresolved differences.
- Define authorized deferred-method resolution, method-only corrections,
  material renewal, task lineage, payload readback, and evidence invalidation.
- Extend plan/report fields and ordered stages; add D-01 through D-16 host
  acceptance scenarios.

## Preserved boundaries

Canonical `.agents` sources, Install versus Apply, report-only modes, required
approvals, validation ceilings, real dependencies/readiness, immutable obligation
manifests, duplicate protections, lifecycle checks, companion confirmation,
independent evidence, and honest blocked/failed reporting remain in force.
The historical command catalog and its manifest are unchanged.

This update changes the skill instructions and acceptance specifications. It
does not supply or activate host task APIs, execute the acceptance scenarios,
prove a Project implementation, or publish a workspace Settings update.