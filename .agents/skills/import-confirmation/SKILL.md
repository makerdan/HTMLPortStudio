---
name: Import Confirmation
description: >-
  Independently verify an importer-completed source bundle in an existing
  destination Replit project, separating exact source evidence from runtime
  behavior before reporting the result.
---

# Import Confirmation

Use this skill when an importer has already completed a bundle in an existing
destination Replit project and the user asks to confirm that the import is
correct. This is a verification skill, not an import skill. It must be
invoked independently from the skill, agent, or MCP handoff that performed the
import.

Do not use this skill to perform the original import, create a project, publish
anything, repair application behavior, or edit imported files. Never execute a
dependency installer, package-manager install, build, migration, or arbitrary
repository script. MCP may provide evidence or an authorized handoff, but
never claim that MCP directly imported the source.

## Confirmation gate

Before reading the destination, collect these inputs as separate, explicit
values:

1. **Importer identity** — the exact importer commit or immutable version that
   was approved for this import. A branch, tag, “latest,” or an importer
   summary without an immutable identity is insufficient.
2. **Approved manifest** — the manifest captured before or at import
   completion, its independently supplied SHA-256 hash, and the approved
   manifest format. The manifest must enumerate every expected relative file,
   its byte length, and its SHA-256 hash; it must name the exact entrypoint and
   importer identity.
3. **Destination** — the existing project and the resolved destination
   directory. Do not infer it from a copied file or from a prior agent claim.
   Verification reports, temporary files, logs, and browser traces must be
   outside the imported directory.
4. **Runtime approval** — the exact required page text, required interaction
   and expected result, required versus optional browser requests, and the
   reviewed static-server command. Keep runtime approval distinct from source
   approval. Do not start a server until the user explicitly approves this
   runtime check.
5. **Prior import result** — the completed import result associated with the
   approved importer commit, source, destination, manifest, and entrypoint.
   Treat it as context to identify what must be checked, never as proof that a
   check passed.
6. **Repeat-import evidence** — an independently captured result for repeating
   the same import with the same approved importer commit and source. It must
   include the resulting manifest hash, complete file list, every file hash,
   byte lengths, and entrypoint. A sentence in the original importer’s
   summary is not evidence.

If any required input is absent, ambiguous, self-reported only, or cannot be
read without guessing, stop before runtime and report **Blocked**. Do not
turn missing evidence into an assumption.

## Phase A: independent source verification

Keep a source-evidence record outside the destination. This record is
diagnostic evidence only; do not write it into the imported bundle.

### A1. Verify the approved manifest

- Read the approved manifest bytes and compute SHA-256 locally. Compare the
  result to the separately approved manifest hash before trusting any fields.
- Parse only after the manifest hash matches. Reject malformed JSON, duplicate
  paths, absolute paths, `..` traversal, empty paths, symlinks, special files,
  unsafe paths, and an entrypoint not present in the manifest.
- Require the exact approved immutable importer commit, manifest format, file
  list, byte lengths, per-file hashes, and entrypoint. Do not replace a field
  with the importer summary.
- Treat a manifest hash mismatch as **Failed** source evidence. Treat an
  unreadable or missing approved manifest as **Blocked** because the check
  cannot be completed.

### A2. Recompute the destination independently

Walk the destination using `lstat`, rejecting symlinks and special files.
Compute the sorted complete relative file set, each file’s byte length, and
each file’s SHA-256 from the destination bytes. Then:

- reject every missing expected file;
- reject every extra destination file, including unlisted hidden files;
- reject every byte-length mismatch;
- reject every per-file hash mismatch;
- reject an entrypoint that is missing, extra, or different from the approved
  entrypoint; and
- record the independently recomputed manifest and its SHA-256.

Do not accept a directory fingerprint as a substitute for the complete file
set and every file hash. Do not accept a copied manifest unless its bytes were
also independently hashed and compared to the approved manifest hash.

### A3. Compare repeat-import evidence

Compare the independent destination result with the independently captured
repeat-import result. Require equality of:

- approved importer commit;
- manifest hash;
- sorted complete file set;
- every file hash and byte length; and
- entrypoint.

An unchanged repeat-import result means the two independently captured results
are byte-for-byte equivalent under the approved manifest. It does not mean
“the importer said it was unchanged.” If repeat-import evidence is missing,
unreadable, or only a prior claim, source verification is **Blocked**, not
Verified. If it exists and differs, source verification is **Failed**.

Do not proceed to runtime unless all source checks are complete and pass.
Source checks passing does not imply that the page runs.

## Phase B: separate runtime verification

Runtime verification is optional only when explicitly declined. A decline
means the final outcome cannot be **Verified**; report **Blocked** with the
source evidence that did pass and `runtime approval: absent`. Never silently
skip runtime and report success.

### B1. Start only the verified static server

After explicit runtime approval and a passing Phase A, start only the verified
static server described by the reviewed command:

1. Confirm that the reviewed command serves the resolved destination as static
   files, binds to loopback, uses an available port, and does not invoke an
   installer, build, migration, dependency resolution, shell interpolation,
   or arbitrary project script.
2. Start only that command. Do not reuse an existing process or a process
   started by another agent. Record the owned PID, process group, command,
   port, and readiness evidence outside the destination.
3. Use a temporary available port selected for this run. Verify that the
   server responds for the approved entrypoint before opening a browser.
4. If the reviewed static command is unavailable, unsafe, or cannot be
   started without changing the bundle, stop and report **Blocked**. Do not
   substitute a dev server or install a server package.

The verifier owns the process it starts. Always stop it in a `finally` path,
including browser failure, timeout, assertion failure, and interruption.
Terminate the owned process group, wait for exit, and verify that its PID and
port are no longer serving. Never kill an unrelated process.

### B2. Check only the approved runtime behavior

Open the approved entrypoint in the browser and collect runtime evidence
separately from source evidence:

- assert the required page text exactly as specified by the approved runtime
  behavior;
- perform the required interaction and assert its expected visible or
  functional result;
- classify required browser requests separately from optional requests; and
- record status, response, console, and browser evidence without copying it
  into the imported directory.

A required request failure, missing required page text, or failed required
interaction is **Failed** runtime evidence. An optional or unlisted browser
request is recorded as `optional-unlisted`; it is not silently promoted to a
required check and does not replace the approved required-request result.
Optional-request observations must remain visibly separate in the report.
Unexpected network behavior must not cause the verifier to fetch arbitrary
resources, execute downloaded code, or modify the bundle.

If browser access, the approved interaction, or required request observation
is unavailable, the runtime result is **Blocked**. Do not call an unobserved
interaction successful.

### B3. Stop the server and reverify source

After the browser check, stop and verify the owned static server before
forming the final outcome. Then repeat the complete Phase A2 source walk:
complete file set, every file’s byte length and SHA-256, entrypoint, and
destination manifest hash. Compare this final result to the pre-runtime
source result.

Any source change, missing final hash, surviving owned process, serving owned
port, or unavailable final check is **Failed**. A final hash check is
required even when runtime passed. Runtime success never repairs or excuses
source drift.

## Strict outcome report

Write the report outside the imported directory. Keep the two evidence
sections separate and include the approved inputs and check status for every
required item.

```text
Import confirmation: Verified | Failed | Blocked
Source evidence:
  importer commit: <exact value and comparison>
  approved manifest SHA-256: <expected / recomputed / status>
  complete file set: <status and missing/extra paths>
  per-file hashes and byte lengths: <status and mismatches>
  entrypoint: <expected / observed / status>
  unchanged repeat-import result: <status and evidence reference>
Runtime evidence:
  explicit approval: <status>
  reviewed static server: <command reference / owned PID / cleanup status>
  required page text: <status>
  required interaction: <status and observed result>
  required requests: <status>
  optional-unlisted requests: <separate observations or none>
  final source hashes after runtime: <status>
Skipped required checks: <none, or each check and why>
```

Report **Verified** only when every required source and runtime check above is
complete, independently evidenced, passed, and no required check is skipped.
In particular, copied files, a passing page load, an importer summary, or an
MCP handoff claim alone can never produce **Verified**.

Report **Failed** when a required check ran and found a mismatch, failure,
source drift, or cleanup failure. Report **Blocked** when a required check
could not run because evidence, approval, browser access, or a safe reviewed
server was unavailable. A blocked check is never a pass.

Never publish, create a project, install dependencies, modify imported files,
repair behavior, or claim that MCP directly imported the source as part of
confirmation.