# Failure baseline catalog

`failure-baseline.json` is the durable provenance catalog for known
test-suite failures. A record may authorize a plan to ignore a failure only
when its status is `active`, its review deadline has not passed, and the
observed suite, test, and failure signature match exactly.

The catalog must declare the supported schema `"version": 1`. Failure Gate
rejects missing or unsupported catalog versions as schema problems before any
record can authorize an ignored failure.

Each record must have a unique non-empty `id`, one of the lifecycle statuses
`active`, `needs-review`, `intermittent`, `environment-limited`, or `resolved`,
and valid `firstObserved`, `lastVerified`, and `reviewDeadline` dates. Records
must also retain the observed `suite`, `test`, and `signature`, plus `owner`
metadata so the failure can be reviewed rather than silently carried forward.

Use `needs-review` for newly observed evidence until a separate maintenance
change supplies an owner, dated verification, and review deadline. Records
with `intermittent`, `environment-limited`, or `resolved` status are retained
for history and never authorize an ignore.

`**Ignored baseline:**` is valid only for an existing, unique, active,
unexpired record. A stale or non-active record must instead be named as
`**Owned baseline repair:**` when the current task is fixing that recorded
failure; repair ownership does not authorize ignoring it. A record ID may
appear only once in a plan.

Run `pnpm run maintain:validation-baseline` for an opt-in review report. The
report labels malformed or duplicate records as `Schema problem` and expired
active records as `Expired active record`, including the record ID or index
reported by the catalog validator. Maintenance warnings do not fail unrelated
task validation.
