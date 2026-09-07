# Server-side URL fetch audit

This inventory covers production outbound requests in `artifacts/api-server/src/routes`.
The browser test helpers are not production fetchers.

| Fetcher | Can the request host come from the user? | Boundary |
| --- | --- | --- |
| Hosted HTML importer | Yes | The submitted HTTP(S) URL and every redirect destination are resolved twice, blocked when any answer is private, link-local, metadata, multicast, documentation, benchmark, or otherwise reserved, and fetched through the shared pinned-address request helper. Redirects are manual and capped. |
| CodePen and JSFiddle exports | The path and provider are user-selected; the host is restricted to the provider allowlist | Each generated export URL and every same-provider redirect uses the shared DNS validation and pinned-address request helper. Redirects are manual, limited, HTTPS-only, and cross-provider redirects are rejected before another request. |
| GitHub repository import | No | User input is parsed into owner/repository path segments and used only to construct URLs under the fixed `https://api.github.com` origin. Redirects are manual and rejected; GitHub responses are bounded and credentials are not sent. |
| Poe assistant forwarding | No | The base URL is server configuration (`POE_API_BASE_URL`), not request input. It is an application/provider configuration boundary and is not a general URL fetch surface. |
| Replit project connector requests | No | Requests go through the managed connector SDK for the fixed project-creation connector. The configurable connector hostname is used only to build a browser setup link, not for server-side fetching. |

The hosted and playground importers are the only request paths that fetch a
user-selected public web destination. Both use the same address validation and
pinned connection implementation; neither delegates redirect following to the
platform fetcher.