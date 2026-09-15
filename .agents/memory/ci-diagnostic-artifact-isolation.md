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