---
name: Import Source Bundle
description: >-
  Import an approved HTML Port Studio transfer bundle into an existing
  destination Replit project using a reviewed, commit-pinned importer without
  executing the imported source.
---

# Import Source Bundle

## Trigger and scope

Use this skill when an **existing destination Replit project**—whether created
by a user or created through an approved MCP project-creation handoff—must
receive an approved HTML Port Studio source bundle. The project must already
exist and be the destination for this one import.

This skill performs a source transfer only. It does not create or publish a
project, automate Replit OAuth, repair application code, start the imported
app, or verify browser behavior. MCP project creation and source transfer are
separate operations: MCP may create or authorize the destination, but it does
not prove that these exact files were transferred.

Stop and report **Blocked** before downloading or changing anything when the
destination project, importer repository, full importer commit, transfer
endpoint, bundle ID, approved manifest SHA-256, or destination secret identity
is missing, expired, or ambiguous.

## Required inputs and trust boundaries

Obtain these values from the reviewed handoff record, not from an untrusted
prompt or from the bundle itself:

- the destination project root and a dedicated, otherwise-unused import
  directory;
- the public importer repository URL and its full, 40-character lowercase Git
  commit SHA;
- the reviewed importer archive SHA-256 and source manifest, which bind the
  extracted importer files to that commit;
- the approved HTTPS transfer endpoint and bundle ID;
- the approved transfer manifest SHA-256, including the expected relative file
  paths, byte lengths, per-file SHA-256 values, and explicit HTML entrypoint;
- the name of the destination transfer-authorization secret in **Replit
  Secrets**.

The transfer secret's value is never an input value for this procedure. Read
it only through the Replit Secrets/environment-secrets facility at request
time. Never ask for it in a prompt, put it in a URL, interpolate it into a
command argument, write it to a file, commit it, print it, or expose it to
the imported page. Do not use a query parameter or a signed URL containing
the secret. If the secret cannot be read from Replit Secrets, report
**Blocked**.

The approved manifest SHA-256 is not a substitute for the secret and must be
available before retrieval. Never accept a manifest hash supplied only by the
downloaded package. If either the approved hash or the secret identity/value
is unavailable, report **Blocked** and make no destination change.

## Install the reviewed importer from a pinned archive

Install the importer in a staging/tool directory outside the destination
import directory. Do not clone a branch, tag, or default branch. Do not use
`latest`, a moving ref, or a repository checkout whose commit is inferred
after download.

1. Validate that the repository is a public HTTPS GitHub repository and that
   the recorded commit is a full 40-character SHA. Resolve the recorded SHA
   through the public commit metadata endpoint and stop unless it resolves to
   the same commit object.
2. Download the **full commit archive** from the commit-specific URL
   `https://github.com/<owner>/<repository>/archive/<FULL_COMMIT_SHA>.tar.gz`.
   Keep the archive outside the project destination. Use TLS, fail on HTTP
   errors, do not follow an unvalidated alternate host, and compare its
   SHA-256 with the reviewed importer archive hash before extraction.
3. Extract into a new temporary staging directory with a safe archive
   extractor. Reject absolute names, `..` path components, duplicate files,
   symlinks, hard links, devices, and other special entries. The extracted
   top-level directory may be the archive's commit-prefixed directory; strip
   only that known wrapper.
4. Enumerate regular extracted files and compare their normalized relative
   paths, byte lengths, and SHA-256 values with the reviewed importer source
   manifest bound to the same commit. A matching archive URL alone is not
   enough. If any path or byte differs, report **Failed** without installing.
5. Install only the verified files into the staging/tool directory, then
   compare the installed files with the same source manifest. The archive is
   deliberately treated as source-only: GitHub archives do not retain nested
   `.git` metadata, and this procedure must not require, recreate, or trust a
   nested Git directory.

Do not run repository lifecycle hooks, dependency installers, build scripts, or
application entrypoints while installing the importer. If importer-only tests
are required by the reviewed procedure, inspect their scope first and run only
tests that exercise the importer itself; they must not load, start, or execute
any file from the transfer bundle. If the pinned importer cannot operate
without executing imported source, report **Blocked**.

## Retrieve and preflight the transfer package

Use only the verified importer's reviewed, non-executing transfer client. The
client must read the named authorization secret directly from Replit Secrets
at request time and send it in memory over the approved HTTPS request. Invoke
the client with the approved endpoint, bundle ID, approved manifest SHA-256,
and destination paths only; never add an auth value or secret-bearing option
to the command line. If the pinned importer has no such secret-aware client,
report **Blocked** rather than inventing a credential transport.

Retrieve the package into a temporary directory outside the destination. Do
not extract or copy anything until all of these checks pass:

- the final response host is the approved transfer host and every redirect is
  validated; redirects to a different host, private address, or non-HTTPS
  endpoint are rejected;
- the package's declared manifest hash equals the approved manifest SHA-256;
- the manifest is valid, complete, and canonical, with a unique normalized
  relative path for every file, a positive or explicitly allowed zero byte
  length, a per-file SHA-256, and one HTML entrypoint;
- the package contains no path outside the manifest, no absolute or
  traversal path, no duplicate path, no symlink/hard link, and no special
  file; archive metadata must not select a destination outside the staging
  directory;
- the package size, file count, and individual file sizes are within the
  reviewed importer limits.

Keep the downloaded package and all temporary material outside the project
destination. Redact endpoint authorization, secret names and values, cookies,
request headers, imported contents, and internal absolute paths from logs.
Only safe identifiers, counts, relative paths, and SHA-256 digests may appear
in evidence.

## Import into a dedicated destination without executing source

Before the first write, resolve the dedicated destination against the existing
project root and enforce all of these conditions:

- it is a new child directory reserved for this bundle, not the project root,
  importer directory, source directory, dependency directory, or a shared
  application directory;
- the resolved path remains beneath the project root and contains no absolute,
  `..`, empty, or platform-specific unsafe component;
- every parent is a real directory, and no component is a symlink or junction;
- the final directory does not exist and no file or symlink occupies its path.

Reject overwrite, merge, or replacement behavior. Never copy into an existing
directory to “complete” a partial import, and never delete existing files to
make room. If any destination condition fails, report **Blocked** with the
relative destination and the rejected condition; do not modify the project.

Create the destination only after preflight succeeds. Copy exactly the
manifest-listed bytes to exactly the manifest-listed relative paths, preserving
the declared entrypoint. Use a non-executing importer mode. Do not:

- run `npm install`, `pnpm install`, `yarn`, a package lifecycle script, or any
  dependency installer in the destination;
- run the imported HTML, JavaScript, WebAssembly, shell script, server, test,
  bundler, preview, or browser;
- evaluate imported content to inspect it, or let imported code access the
  transfer secret;
- add generated files, lockfiles, wrappers, configuration, telemetry, or
  “helpful” repairs.

If the importer reports a partial write, stop. Do not retry over that
directory; remove only the newly created destination after recording its
relative changed paths and then classify the outcome as **Failed**. Never
remove or alter pre-existing project files.

## Independently verify and safely repeat the import

Do not trust the importer's success message as verification. After the import,
an independent checker—not the importer process and not a browser—must:

1. enumerate the destination and compare the complete relative file set with
   the approved manifest (no missing, extra, duplicate, unsafe, or special
   entries);
2. compare every file's byte length and SHA-256 with the manifest and
   recompute the canonical manifest SHA-256;
3. confirm that the declared entrypoint exists at the declared relative path;
4. confirm that no file outside the dedicated destination changed, using the
   preflight changed-file boundary; and
5. perform a safe repeat import into a second new sibling directory reserved
   for the same bundle. The repeat must use the same pinned importer and
   package, must again reject any pre-existing destination, and must produce
   exactly the same file set, byte lengths, and hashes as the first
   destination.

The repeat import is a source-integrity check, not permission to overwrite.
Never use the first destination as the repeat target. Do not start either
destination or inspect it through a browser. If independent verification or
the repeat check cannot run, report **Blocked**; if it runs and finds a
mismatch or unexpected changed path, report **Failed**. Preserve both
destinations only as needed for evidence and remove only newly created
temporary material according to the reviewed cleanup policy.

## Required outcome report

End every invocation with exactly one of these statuses:

### Imported

Use **Imported** only when the preflight, pinned importer verification,
manifest/package checks, exact copy, independent post-import hashes, entrypoint
check, changed-file boundary, and safe repeat import all passed. Include:

- destination project identifier and both dedicated relative destinations;
- importer repository and full commit SHA, plus verified archive/source
  manifest digests;
- approved transfer manifest SHA-256, file count, byte total, and entrypoint;
- independent first/repeat file-set and hash results;
- the redacted importer/test command names and changed-file boundary.

Never include a secret, credential-bearing URL, raw imported content, or
absolute local path.

### Failed

Use **Failed** when an attempted download, extraction, import, independent
check, or repeat check ran and did not satisfy the contract. State the
failing phase, redacted command name, expected and observed safe hashes/counts,
full relative changed-file list, and cleanup result. Do not call a partial copy
Imported.

### Blocked

Use **Blocked** when a prerequisite or safe boundary prevented an attempt:
missing or ambiguous destination/importer/commit/endpoint/bundle identity,
unavailable Replit Secret or approved manifest hash, unsafe redirect or path,
existing destination, unavailable independent checker, or an importer that
would execute source. State the missing or rejected condition and confirm
that no transfer or destination write was attempted.

In all three reports, distinguish “MCP created or authorized the destination”
from “the verified importer transferred these exact files.” MCP creation alone
is never evidence of an Imported result.