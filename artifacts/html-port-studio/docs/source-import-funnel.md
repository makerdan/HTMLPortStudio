# Source import outcomes

Source imports emit one coarse, privacy-safe custom event for every paste,
HTML upload, ZIP, GitHub, hosted URL, and playground import flow. Replit's website analytics tracker
receives these events only when analytics is enabled for the published
website; tracking is a no-op in development or when the tracker is
unavailable.

## Outcome event

| Description | Event name |
| --- | --- |
| Any source import is canceled, completes successfully, or fails | `source_import_outcome` |

The event has only these fixed dimensions:

```text
source_type: "paste" | "html" | "zip" | "github" | "hosted" | "playground"
outcome: "cancelled" | "completed" | "failed"
```

`completed` is recorded when the import response has passed any applicable
client-side source checks and is ready for the Studio. For pasted HTML this is
recorded after analysis succeeds; for HTML and ZIP sources it is recorded after
the local source is read or unpacked. `cancelled` is recorded when a user
explicitly cancels an in-progress import or clears a loaded local source.
`failed` is recorded for a rejected local file or remote import attempt.
Retries may produce another coarse outcome, but never include request details.

## Privacy and reliability boundary

No event includes source code, source URLs, filenames, repository names,
providers, credentials, error messages, prompts, or other free-form user
content. The event has exactly the two fixed dimensions shown above. The
analytics wrapper catches tracker errors, so an unavailable or failing
analytics tracker cannot interrupt import cancellation, recovery, or retry
behavior.