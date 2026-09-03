# Failure baseline catalog

`failure-baseline.json` is the durable provenance catalog for known
test-suite failures. A record may authorize a plan to ignore a failure only
when its status is `active`, its review deadline has not passed, and the
observed suite, test, and failure signature match exactly.

Use `needs-review` for newly observed evidence until a separate maintenance
change supplies an owner, dated verification, and review deadline. Records
with `intermittent`, `environment-limited`, or `resolved` status are retained
for history and never authorize an ignore.

Run `pnpm run maintain:validation-baseline` for an opt-in review report.
Maintenance warnings do not fail unrelated task validation.