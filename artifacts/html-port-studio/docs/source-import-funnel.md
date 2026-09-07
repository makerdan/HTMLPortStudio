# Source import outcomes

Source imports emit one coarse, privacy-safe custom event for the GitHub,
hosted URL, and playground import flows. Replit's website analytics tracker
receives these events only when analytics is enabled for the published
website; tracking is a no-op in development or when the tracker is
unavailable.

## Outcome event

| Description | Event name |
| --- | --- |
| A GitHub, hosted URL, or playground import is canceled or completes successfully | `source_import_outcome` |

The event has only these fixed dimensions:

```text
source_type: "github" | "hosted" | "playground"
outcome: "cancelled" | "completed"
```

`completed` is recorded when the import response has passed any applicable
client-side source checks and is ready for the Studio. `cancelled` is recorded
when a user explicitly cancels an in-progress import. Failed imports are
intentionally not recorded as successful outcomes, so retries can be compared
with the original attempt without exposing request details.

## Privacy and reliability boundary

No event includes source code, source URLs, filenames, repository names,
providers, credentials, error messages, prompts, or other free-form user
content. The analytics wrapper catches tracker errors, so an unavailable or
failing analytics tracker cannot interrupt import cancellation, recovery, or
retry behavior.