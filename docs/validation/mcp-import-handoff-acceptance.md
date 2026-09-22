# MCP import handoff acceptance report

Date: 2026-09-21

This report validates the guided workaround in HTML Port Studio. It separates
the behavior proven by local fixtures from behavior that depends on an
external Replit MCP client. The Studio does not embed an MCP client, does not
create Replit projects, and does not send the exact source bundle through MCP.
MCP creates the empty destination; the pinned destination importer retrieves
the reviewed bundle through the short-lived transfer package.

## Evidence boundary

| Phase | Result | Evidence |
| --- | --- | --- |
| MCP project creation | **Blocked** live / **Passed** guidance | The browser fixture requires search-first reconciliation, stable project identity, and an explicit one-project confirmation. The current workspace has no available live project-creation MCP capability, so no external project was created. |
| Importer transfer | **Passed locally** / **Blocked** live | API fixtures create an owner-bound package, retrieve the manifest before the bundle, verify the exact bundle, and reject a second bundle retrieval. The live destination Agent was not invoked because MCP creation is blocked. |
| Source verification | **Passed locally** / **Blocked** live | File SHA-256, bundle SHA-256, manifest hash, and exact normalized files are compared locally. The live importer’s manifest comparison remains unobserved. |
| Runtime verification | **Passed locally with a deterministic preview fixture** / **Blocked** live | The fixture writes the retrieved files, serves and exercises the entrypoint, then re-reads the files and verifies the bundle hash. No live destination preview was opened. |
| Cleanup | **Passed locally** | Tests revoke, complete, expire, and delete their harmless fixtures. No test publishes or deletes a live Replit project. |

The live block is specifically at **external MCP project creation**. It is
not evidence that the importer or destination skills failed, and mocked API or
browser responses must not be reported as live provider availability.

## Validation result

Task-owned focused checks passed:

- API handoff acceptance coverage, including package creation, exact retrieval,
  replay protection, expiry, tamper detection, revocation, and log redaction;
- Studio unit coverage;
- TypeScript typecheck;
- the dedicated Chromium MCP browser journey.

The required locked `test-standard` run reached the browser suite and reported
38 passing tests and 13 failures under its fully parallel run. The failures
were not accepted as task evidence. The rerun reached 46 passing tests and 5
failures. The four unique remaining recovery scenarios were reproduced in
isolated runs against both the task parent revision and the current revision;
the model-load scenario passed against both revisions in isolation. This is
valid baseline provenance for the remaining failures, which are outside the
MCP acceptance diff. The full standard command remains non-green; no
unrelated recovery code was changed because fixing it is outside this task’s
scope.

## Deterministic automated coverage

Run the registered ceiling with:

```sh
export TASK_PLAN_FILE=.local/tasks/task-267.md
node scripts/run-locked-tier.mjs "$TASK_PLAN_FILE"
```

The acceptance fixtures use a harmless public-style bundle containing only
`index.html` and a small `assets/app.js` file. They cover:

- secure package creation with an opaque, one-time transfer token;
- repeat package creation for one stable attempt returning the existing package
  without a second token;
- owner-only status and destination confirmation;
- search-first multiple-match blocking and zero-match recovery in the browser;
- exact project ID and HTTPS URL capture without source in the MCP prompt;
- manifest retrieval before exact bundle retrieval;
- repeat manifest verification and one-time bundle replay rejection;
- per-file and complete-bundle SHA-256 verification, including preservation
  after the runtime-verification fixture;
- expired, revoked, and tampered package rejection;
- conflicting destination IDs rejected after one ID is confirmed;
- invalid source revisions, wrong owners, missing tokens, and wrong tokens;
- captured API process output containing neither fixture source nor transfer
  authorization.

The browser test also changes the creation, import, exact-source, and runtime
evidence controls independently. A blocked or incomplete phase cannot be
interpreted as a completed import.

## Bounded live checklist

Use only the harmless fixture below. Do not use private source, production
credentials, browser session cookies, or a real customer project.

```html
<!doctype html>
<title>MCP handoff acceptance fixture</title>
<main id="acceptance-fixture">ok</main>
```

1. In HTML Port Studio, analyze the fixture and confirm that no credential
   finding is present.
2. Sign in through the normal Studio flow and create the secure transfer
   package. Save the one-time destination secret only in the destination
   project’s Replit Secrets; never paste it into MCP, a URL, chat, or a
   command.
3. Copy the search prompt and search/list projects through the external Replit
   MCP client. Confirm exactly one returned project ID. If there are multiple
   matches, stop and choose one explicitly; do not retry creation.
4. If there are zero matches, run the separate creation prompt once and record
   the returned project ID and HTTPS URL. Do not ask MCP to accept or import
   the source bundle.
5. In the confirmed destination project, install the pinned **Import Source
   Bundle** and **Import Confirmation** skills.
6. Add the transfer ID and one-time token as destination secrets. Retrieve the
   manifest first and compare file paths, byte counts, per-file hashes, and the
   bundle hash.
7. Retrieve the bundle exactly once, confirm the normalized files, and record
   the source-verification result. The destination Agent must ask for the
   required confirmation before applying the bundle.
8. Open the destination Preview, exercise the fixture, and record runtime
   verification. Recheck the source and bundle hashes afterward.
9. Mark the four Studio evidence phases independently. Revoke or complete the
   transfer package when verification is finished.

**Current live result:** Blocked at step 3 because the external Replit MCP
project-creation capability is not available in this workspace. Steps 4–9
were not attempted live. This is an honest provider boundary, not a pass
inferred from mocks.

## Failure and recovery evidence

| Scenario | Observable local evidence | Safe next action |
| --- | --- | --- |
| Expired package | Status reports `expired`; manifest and bundle return unavailable | Create a replacement package for the same reviewed attempt. |
| Revoked package | Status reports `revoked`; token retrieval is unavailable | Review the source again and create a new package only if still approved. |
| Tampered package | Recomputed source bundle no longer matches the stored manifest; retrieval is unavailable | Stop transfer and create a fresh package after reviewing the source. |
| Duplicate package action | Same owner, attempt, revision, name, and bundle return the existing transfer without another token | Reuse the existing transfer; do not create a second destination. |
| Multiple project matches | UI enters a blocked reconciliation state and does not show the creation prompt | Search again or select exactly one intended project; do not retry MCP creation. |
| Conflicting project ID | API returns `HANDOFF_DESTINATION_ALREADY_CONFIRMED` | Keep the original confirmed destination and investigate the MCP result. |
| Wrong owner or token | Status and retrieval are unavailable without disclosing whether another package exists | Re-authenticate as the owner or use the original private destination secret. |
| Source revision replacement | API rejects the attempt with `HANDOFF_ATTEMPT_SOURCE_MISMATCH`; browser recovery metadata is revision-scoped | Start a new reviewed handoff for the replacement source. |

These outcomes preserve the source in the current Studio session but never
persist raw source or transfer authorization in browser recovery metadata.