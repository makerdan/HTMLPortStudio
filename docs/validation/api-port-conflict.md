# API port conflict safety

## Runtime evidence

The earlier `EADDRINUSE` listener could not be identified and was not signaled.
At the start of this repair, the managed API workflow reported `not_started`,
no open ports, and no retained output. The executor's TCP table contained no
8080 listener; a localhost probe refused the connection, and the routed
`/api/healthz` request returned 502. These observations do not establish the
identity of the historical listener.

After removing the API's automatic process-killing sweep, the existing managed
workflow `artifacts/api-server: API Server` built and started successfully.
Its authoritative workflow status reported `running`, `waitForPort: 8080`,
and `openPorts: [8080]`. Its output identified the API process as listening on
8080. A request through the development proxy to `/api/healthz` returned
HTTP 200, `application/json`, and `{"status":"ok"}`. This establishes the
current port owner as the managed API service, not the historical owner.
The subsequent socket-inode audit independently mapped the 8080 TCP listener
to PID 267, running `node --enable-source-maps ./dist/index.mjs` with working
directory `artifacts/api-server`, matching the managed workflow's startup log.

## Resolution and boundaries

- The API uses its existing configured port and `/api` routing.
- API startup does not invoke `scripts/free-ports.mjs`, signal processes, or
  choose a fallback port.
- Binding is authoritative: if another service wins a startup race, the API
  exits nonzero with `EADDRINUSE` and instructions to inspect managed workflow
  status and Networking. An invisible owner must not be reclaimed.
- Other artifacts' legacy cleanup callers are outside this API-specific repair.
- No production configuration or artifact routing was changed.

## Regression check

`artifacts/api-server/src/lib/listen.test.ts` is included in the existing API
unit command. It checks the dev command and routing, explicit port validation,
real bind failure, useful diagnostics, continued responses from the original
listener, and successful reuse only after that fixture voluntarily closes.
Fixtures use ephemeral ports, not 8080, and never signal another process.

The focused check passed all four tests under a 15-second outer bound with
5-second per-test limits and no subprocess test workers. API TypeScript
checking passed under a 60-second bound. The existing managed workflow build
also passed. A browser capture of the routed health endpoint showed the expected
JSON; no signed-in UI was changed or verified.
