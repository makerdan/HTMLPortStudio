---
name: list-skills
description: >-
  Produce a read-only Markdown comparison of runtime-visible private/custom
  skills that are project-installed, workspace-integrated, or available but
  not applied, including separate project implementation evidence. Use when
  the user asks which private or custom skills are installed, applied,
  integrated, unapplied, or implemented in the current project.
---

# List Skills

Analyze the current project's private/custom skill application and separately
analyze evidence that the project implements each skill's behavior. Return one
auditable Markdown text report. This skill is read-only: it inventories and
inspects; it does not install, execute, repair, copy, refresh, synchronize, or
modify skills, project files, runtime state, generated outputs, or caches.

## When to invoke

Invoke for requests about private or custom skills that are:

- installed in the project;
- applied or not applied;
- workspace-integrated;
- available to the runtime but unapplied; or
- implemented by the project independently of skill application.

Do not use this skill to inventory platform-provided local skills as private or
custom application evidence. Do not turn it into a runtime inventory command,
dashboard, API, or project UI.

## Definitions and independent dimensions

The runtime-visible private/custom candidate set is the immediate directory
entries under `.local/custom_skills/`. A candidate's exact, case-sensitive
immediate directory name is its skill ID. Do not substitute `.local/skills/`,
`.local/secondary_skills/`, another catalog, a mirror, or a generated listing.

Application is determined only by exact ID comparison:

| Candidate match | Application classification |
|---|---|
| Direct project entry | `Project-Installed` |
| Projection entry | `Workspace-integrated` |
| Both direct and projection entries | Applied, with a duplicate application finding |
| No project entry | `Available, Not Applied` |

Implementation evidence is a separate dimension. Inspect project-owned source,
scripts, configuration, documentation, tests, and workflow wiring for behavior
corresponding to the candidate's stated purpose. Similar behavior without an
exact applied-skill match is implementation evidence, not application. Never
let implementation evidence promote, demote, or otherwise change application
classification.

Use these implementation-status values exactly:

- `Applied and implemented`
- `Applied, implementation not evidenced`
- `Not applied, implementation evidenced`
- `Not applied and implementation not evidenced`
- `Implementation status unknown`

Use `Partial implementation` when only part of the skill contract is evidenced.
Use `Complete` only when the relevant behavior is supported by sufficient
project-owned evidence. Use `Not evidenced` when the inspected scope found no
corresponding evidence. Use `Unknown` when required scope could not be inspected
read-only. Do not infer implementation from the skill definition itself, a
filename alone, or a documentation claim alone.

## Bounded discovery

Perform only these read-only inspections:

1. Confirm the project root without printing or reporting an absolute/canonical
   workspace path.
2. Enumerate immediate directories under `.local/custom_skills/`.
3. For each candidate, inspect only enough of its `SKILL.md` frontmatter to
   identify its purpose. The candidate is valid only when `SKILL.md` is a
   regular, readable, non-symlinked file with usable required identity data.
4. Enumerate immediate directories under `.agents/skills/`, excluding the
   literal `.workspace-projections` entry.
5. Enumerate immediate directories under
   `.agents/skills/.workspace-projections/` separately.
6. For project entries, require a regular, readable, non-symlinked `SKILL.md`
   and use the immediate directory name as the project skill ID.
7. Compare IDs byte-for-byte and case-sensitively. Do not normalize case,
   punctuation, separators, aliases, display names, or hyphens.
8. Inspect project-owned implementation scope read-only. Stop at a bounded
   scope when necessary and record the unreadable or uninspected scope.

Do not follow symlinks, recurse into unrelated locations, inspect nested
repositories, execute a discovered skill or imported source, run validation to
manufacture evidence, or run commands that regenerate projections, manifests,
mirrors, metadata, lockfiles, or caches. Never reveal secrets, credentials,
private instructions, skill bodies, or canonical workspace paths. In the report,
use relative evidence labels such as `project source`, `scripts`, `tests`,
`configuration`, `documentation`, or `workflow wiring`, and include only safe
relative paths when needed for auditability.

The `.local/skills/` and `.local/secondary_skills/` trees are explicitly
excluded from the private/custom comparison. Their presence cannot establish
that a private/custom skill is applied.

## Missing, unreadable, and invalid scope

Never guess or silently drop an entry. Record each condition under `Findings`,
`Limits`, or the affected skill's nested fields:

- If `.local/custom_skills/` is missing or unreadable, the private/custom
  candidate set is `Unknown`; do not replace it with another catalog. No
  available candidate may be invented.
- If `.agents/skills/` is missing, report zero confirmed applied project
  entries, while preserving any runtime candidates as `Available, Not Applied`
  only when the candidate root itself was successfully inspected.
- If the projections root is missing or unreadable, projection matching is
  `Unknown`; do not report a projection as absent merely because it could not be
  inspected.
- A missing, unreadable, symlinked, non-regular, or malformed candidate
  `SKILL.md` is an `Invalid` finding. Preserve its exact directory ID when it
  can be safely read; otherwise use an opaque entry label and explain the
  unreadable scope.
- A missing, unreadable, symlinked, non-regular, or malformed project
  `SKILL.md` is a separate invalid project-entry finding. It is not a valid
  match and must not be silently merged with a runtime candidate.
- A project skill entry with no runtime candidate is a `Project-only identity`
  finding, not an applied private/custom skill.
- A runtime candidate with no valid direct or projection match belongs in
  `Available, Not Applied`, including when project behavior appears similar.
- If both a valid direct entry and a valid projection have the same exact ID,
  place the candidate in `Project-Installed` and call out the duplicate
  application under `Findings`; do not create a second comparison-column row.
- Duplicate immediate IDs or identity conflicts are separate findings. Never
  collapse them by display name or by guessing which entry is authoritative.
- If implementation scope is inaccessible, report `Implementation status
  unknown`, `Coverage: Unknown`, the bounded scope that could not be read, and
  the reason. Do not call it complete or not evidenced.

## Implementation cross-check

For each valid runtime candidate that appears in either comparison column:

1. Read its frontmatter purpose internally; do not reproduce its body in the
   report.
2. Search the bounded project-owned scope for corresponding behavior and its
   executable wiring. Consider source, scripts, configuration, documentation,
   tests, and workflows, but treat names and prose as leads rather than proof.
3. Record concrete, safe relative evidence categories or paths, without
   exposing secrets or canonical workspace paths.
4. Map the result to one exact implementation-status value and one coverage
   value: `Complete`, `Partial implementation`, `Not evidenced`, or `Unknown`.
5. List missing or unverified contract areas in `Gaps`. A project-only
   implementation remains `Not applied, implementation evidenced`; it does not
   become an applied skill.

Do not modify implementation, create tests, invoke workflows, or run a skill
just to produce evidence. If no matching behavior is found after an accessible
inspection, say `None found` rather than claiming that the behavior cannot
exist.

## Required report

Return Markdown text with exactly two comparison columns titled
`Project-Installed` and `Available, Not Applied`. These are the only
comparison columns. Do not add a third comparison column for invalid,
workspace-integrated, or project-only entries. Put workspace-integrated
matches in the `Project-Installed` column, while their nested `Skill Status`
must remain exactly `Workspace-integrated`.

Use this structure. The table's cells may contain nested Markdown lists; every
runtime-visible private/custom candidate represented in either column must have
all five nested fields.

```markdown
# Private/Custom Skills Report

**Project:** <safe project label>
**Scope:** Current read-only filesystem inspection

| Project-Installed | Available, Not Applied |
|---|---|
| **<display label>** (`<exact-skill-id>`) — <Project-Installed or Workspace-integrated><br><br>- **Skill Status:** <Project-Installed \| Workspace-integrated \| Invalid \| Unknown><br>- **Implementation Status:** <exact implementation-status value><br>- **Coverage:** <Complete \| Partial implementation \| Not evidenced \| Unknown><br>- **Evidence:** <safe project evidence or `None found`><br>- **Gaps:** <missing/unverified areas or `None identified`> | **<display label>** (`<exact-skill-id>`) — Available, Not Applied<br><br>- **Skill Status:** Available, Not Applied<br>- **Implementation Status:** <exact implementation-status value><br>- **Coverage:** <Complete \| Partial implementation \| Not evidenced \| Unknown><br>- **Evidence:** <safe project evidence or `None found`><br>- **Gaps:** <missing/unverified areas or `None identified`> |

## Findings
- <invalid entries, duplicate application, project-only identities, or `None`>

## Limits
- <unreadable or missing roots and bounded unknowns, or `None`>
- Current presence does not prove installation history, prior invocation,
  successful use, freshness, or provenance.

**Changes made:** None.
```

Keep the two comparison columns even when one is empty. Use `None of the
runtime-visible private/custom skills are applied to this project.` in the
`Project-Installed` cell when it has no entries. Use
`None of the runtime-visible private/custom skills are available but unapplied.`
in the other cell when it has no entries. Counts and a short applied result
may precede the table, but must not introduce additional comparison columns.

Use readable display labels for presentation, but always preserve the exact
directory ID in backticks. Prefer a non-empty frontmatter `title` without a
hyphen, then a non-empty `name` without a hyphen, then title-case the exact ID
with hyphens replaced by spaces. The ID, not the display label, controls
matching.

Every represented runtime candidate must have these nested fields, even when
invalid or unknown:

- `Skill Status`: explicit application result, including
  `Project-Installed`, `Workspace-integrated`, `Available, Not Applied`,
  `Invalid`, or `Unknown`.
- `Implementation Status`: one exact value from the implementation vocabulary.
- `Coverage`: `Complete`, `Partial implementation`, `Not evidenced`, or
  `Unknown`.
- `Evidence`: concrete safe project evidence or `None found`; never a guess.
- `Gaps`: missing, invalid, unreadable, or unverified areas, or
  `None identified`.

Explain duplicate direct-plus-projection matches in `Findings`, retain
project-only identities there, and retain malformed or inaccessible entries
there or in `Limits` without dropping them. Current presence is only current
presence: it does not prove installation history, prior invocation, successful
use, source freshness, or provenance.