---
name: GitHub validation evidence
description: Remote GitHub Actions and branch-policy checks require the workflow to exist on the remote default branch and a plan that supports protection APIs.
---

The local workflow file is not evidence of remote activation. Verify the remote
workflow endpoint and run list before claiming a successful GitHub validation.

**Why:** A private repository on a plan without branch-protection support can
report `protected: false` and return a plan-limit `403`; the workflow may also
be absent remotely even when it exists locally.

**How to apply:** Treat local workflow design, remote activation, successful
runs, and required-check policy as separate evidence. Do not mutate branch
settings unless the user separately authorizes it and GitHub exposes the
required capability.