---
name: CI diagnostic artifact isolation
description: Security boundary for privacy-safe diagnostic artifacts produced after repository validation jobs.
---

Generate any uploadable CI diagnostic artifact on a separate runner that does
not check out or execute repository source. Jobs that run repository code may
publish sanitized summaries, but they must not select files for upload.

**Why:** Atomic writes and size checks on the validation runner still leave a
time-of-check/time-of-use gap: a surviving descendant process can replace the
verified file before the upload action reads it.

**How to apply:** Pass only bounded platform status metadata into the clean
diagnostics job, generate a new allowlisted envelope there, require successful
preparation before upload, and keep upload failure independent of authoritative
validation.

When multiple workflows contain separate clean diagnostic generators, test their
sanitizers, fallbacks, bounds, redactions, and upload-name handoffs as one
shared contract, then assert each workflow's upstream allowlist separately.

**Why:** The no-checkout boundary prevents sharing repository source at runtime,
so duplicated inline generators otherwise drift silently even when each job
still looks locally safe.

**How to apply:** Keep the clean runner source-free and upload-only; use a
source-independent static contract for shared metadata safety and make every
intentional per-workflow allowlist or skip policy explicit.