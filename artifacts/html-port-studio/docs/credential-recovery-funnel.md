# Credential recovery funnel

The credential recovery journey is instrumented with coarse, privacy-safe
custom events. Replit's website analytics tracker receives these events only
when analytics is enabled for the published website; tracking is a no-op in
development or when the tracker is unavailable.

## Funnel events

| Description | Event name |
| --- | --- |
| A user opens the credential recovery panel | `credential_recovery_opened` |
| A user accepts the redacted-source sharing consent | `credential_recovery_consent` |
| A redacted repair proposal request is sent | `credential_recovery_proposal_requested` |
| A reviewed patch is applied, rejected, or undone | `credential_recovery_action` |
| The post-apply source re-scan completes | `credential_recovery_rescan` |

The action event has only one dimension:

```text
action: "apply" | "reject" | "undo"
```

The re-scan event has only one dimension:

```text
result: "passed" | "failed"
```

The expected path is:

```text
opened → consent → proposal_requested → action(apply) → rescan(result)
```

Reject and undo are observable branches rather than required funnel steps.
`proposal_requested` means the request passed local consent, redaction, and
model-availability checks and was attempted. `rescan` records whether the
analysis request after applying a patch completed successfully; a local size
failure or analysis error is recorded as `failed`.

## Privacy boundary

No event includes source code, source URLs, filenames, findings, line numbers,
credentials, prompts, model responses, or free-form user content. The
`action` and `result` values are fixed enumerations, so the events can be used
for aggregate drop-off analysis without reconstructing the recovery payload.