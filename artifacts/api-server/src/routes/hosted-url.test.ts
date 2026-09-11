import assert from "node:assert/strict";
import { createServer, type Server } from "node:https";
import type { AddressInfo } from "node:net";
import test from "node:test";
import {
  fetchHostedUrl,
  fetchPinnedUrl,
  HostedUrlError,
  HOSTED_URL_MAX_BYTES,
} from "./hosted-url.ts";

const LOCAL_HTTPS_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxRM+5bBTQ2C7r
7WdHUifFef5cUIdbD0dy8Pgju4SL8/0qMFDRuRk6I8FsiPxTHcmvy1rGhJxEpE9f
xoyo3LhA+KfYFfC+p2AvyBtR3ahUuiY0RNjEJ3+OIjPbofSR2e8DihDs2GhmZtjz
t1Yhii3ccjbFVKOpU/XVy/z0l2202Ael5bM9gfe7J7cnsySXycH6BxTSjZFy2Il/
Wtzb8obIPBDdI4se9Fm1W/XW+JOr6pC+hLFj1kwmO+YrbjNsKuYgXl4z+RwzUXsp
G5Z/5OnSzNVrfo1K5TQIOViR+zsRhKOiJAVLvuv5dqsNhGkNzuMIe5Ob9RndG1QB
iaX5LwabAgMBAAECggEAE6yA52HU75bGol2PRE2cZ2DSN5miZBtOgTW4PHL/026J
Tujc12HVKGw2d96+LlVUgIOvt++Yzk90FbuZ+dXBR0ixjBxnQymdVcA+M/hHSdv9
CHkJm7+MexBVtA8F7zgCPGDS3w5ni9HnSykyUHee/mPYq07o+Q597rP8h4LU5KiT
6V/ltR1sh1JDmcPbMm9iIlOMLmSvGzygLSzgj7JXqpNrG5NOnSJ83LhF8AWuN5qb
4m3aPQyN3VCudTtEdyIquGuCp1DwMGytzifg1jlDLZwcbjaiIRUhfYMJjHEFTruV
L/AyL1bQIcEy4SGG+6H0kDtM75eoT7V3ZmARhTooOQKBgQDZI0qIQVcbp8+i0CqP
Kh5VWbh578KutyyjscwieSqlof1OCdxYz/6ZfPfsm7YLXz+8/rszhy/zBaDVfaEG
wg0Ubifb/y/IR/2PIfhjE9MORyP5onh5clGc9649L+toeQJH+zFCkJHDRaFxtWBJ
NqY0l4wf9zPZFycr7/aZ+WfWYwKBgQDQ/tIJNrq4Ji5tbDH8EWratnTqd3vevbjn
3nMpO9/sYT+rcAcUcksel3x97pAmO5FqdU2u0sjX8a//UAfbeGEnm27NbTzuA2gd
1h7ItBhs1xe1Ll5+/lC7c9lCFQPG2U8z/DcgBIIEqLwEzWIVWKps7zBrCrcVrh24
L3CF5BcIaQKBgB7Hm+cYrApljU9dBstogwhCQZ43WHd/y7ogl/lDB8KW5dtMFooY
YdTMHDDUGcge5mAaE9tIDIn8gEIDHvJgS45b1xaeY92WJuFFRXp18vMRLo5Sc5Vz
mRIRIgfWZR5YGPSvLNpst9zgX/RIa6+1KXZHDTvyxMy/NXRK/b/x1MBVAoGAOJaW
ploESrJD5eriyd6pcRjwJUA+8Pur4lRwGB0XL3jRdYj60cV0o47e7XY337JHWGz0
oL6AFUBiqB2yUvGQVNoYMVU/py6S9WkxoqRo7Kd8ytkISxhvIaJnlCX+hMv4Txoe
jvPJhJtvdVlrEl6UnrRRBtq64groDyQBMq+ksOkCgYEAru1KquPbRzr3DylBFBf+
VbwT581abeWDGVLmFhP/TA1HmLLv52/0JmzJVMTw8PxtBGY0zOXzIr8RLZSWD8qW
NqtzIEawkCmy/QwrXaKe8cOaAeWJmVuDuL+xCx0+0H2TlXPDYBkxchY18msbDlFQ
evZMDSWkFlV5cGpkt3NO9Z4=
-----END PRIVATE KEY-----`;

const LOCAL_HTTPS_CERT = `-----BEGIN CERTIFICATE-----
MIIDczCCAlugAwIBAgIUAuYv5lyZ+vyMOj6ifiKiQrBII5AwDQYJKoZIhvcNAQEL
BQAwHDEaMBgGA1UEAwwRdmlydHVhbC1ob3N0LnRlc3QwHhcNMjYwOTA3MTMxNTA1
WhcNMzYwOTA0MTMxNTA1WjAcMRowGAYDVQQDDBF2aXJ0dWFsLWhvc3QudGVzdDCC
ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALFEz7lsFNDYLuvtZ0dSJ8V5
/lxQh1sPR3Lw+CO7hIvz/SowUNG5GTojwWyI/FMdya/LWsaEnESkT1/GjKjcuED4
p9gV8L6nYC/IG1HdqFS6JjRE2MQnf44iM9uh9JHZ7wOKEOzYaGZm2PO3ViGKLdxy
NsVUo6lT9dXL/PSXbbTYB6Xlsz2B97sntyezJJfJwfoHFNKNkXLYiX9a3Nvyhsg8
EN0jix70WbVb9db4k6vqkL6EsWPWTCY75ituM2wq5iBeXjP5HDNReykbln/k6dLM
1Wt+jUrlNAg5WJH7OxGEo6IkBUu+6/l2qw2EaQ3O4wh7k5v1Gd0bVAGJpfkvBpsC
AwEAAaOBrDCBqTAdBgNVHQ4EFgQU1xngDZWExEO7YbetXsv94eYfXscwHwYDVR0j
BBgwFoAU1xngDZWExEO7YbetXsv94eYfXscwDwYDVR0TAQH/BAUwAwEB/zBWBgNV
HREETzBNghhzb3VyY2UudmlydHVhbC1ob3N0LnRlc3SCGHRhcmdldC52aXJ0dWFs
LWhvc3QudGVzdIIXYWxwaGEudmlydHVhbC1ob3N0LnRlc3QwDQYJKoZIhvcNAQEL
BQADggEBAKDcXqspsSWThIYG/870DmQvz6y/+Z3OENhCo0Rl2xIU7gkr2tnY5+wa
parYRIbZnFo4tnxLWMRYqGDxBhkvKkkZkKktPQTMHEW/cDBtI9tmLxxHsLIHZK1j
pi0Kw1jektE3rR1rsE8YDX3eHIIAf7+LjRtCZdUJNbExXEYZyF5YAah6LPxNV+hw
LMhno93PBtrQRe6Wov2sWlJ77Zorvb3MEnnJAKImxHpILH88UtFpLLnBboEtWsJt
sDnJ5ELgHChvUXy6rrHLGNsna6oB45mguylxpYBCv4BVEVuYt1G8BDLskfl5gQVX
pKHluR1i/XwVV/bZnnlIYif4sS6uLq0=
-----END CERTIFICATE-----`;

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return (server.address() as AddressInfo).port;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const publicLookup = async () => [
  { address: "93.184.216.34", family: 4 },
];

function response(
  body: string,
  headers: Record<string, string> = { "content-type": "text/html" },
  status = 200,
): Response {
  return new Response(body, { status, headers });
}

async function rejectsWith(
  operation: Promise<unknown>,
  code: string,
): Promise<HostedUrlError> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof HostedUrlError);
    assert.equal(error.code, code);
    return true;
  });
  try {
    await operation;
  } catch (error) {
    return error as HostedUrlError;
  }
  throw new Error("Expected operation to reject");
}

test("fetches public HTML without executing it and returns portability warnings", async () => {
  let requestedUrl = "";
  let pinnedAddress = "";
  const result = await fetchHostedUrl("https://example.com/app#section", {
    lookup: publicLookup,
    fetch: async (url, _init, address) => {
      requestedUrl = String(url);
      pinnedAddress = address ?? "";
      return response(
        "<!doctype html><title>Hosted app</title><script src=\"https://cdn.example.test/app.js\"></script><script>fetch('/api')</script>",
      );
    },
  });

  assert.equal(requestedUrl, "https://example.com/app");
  assert.equal(pinnedAddress, "93.184.216.34");
  assert.equal(result.originalUrl, "https://example.com/app");
  assert.equal(result.finalUrl, "https://example.com/app");
  assert.match(result.html, /Hosted app/);
  assert.ok(result.warnings.some((warning) => warning.includes("External scripts")));
  assert.ok(result.warnings.some((warning) => warning.includes("Browser runtime")));
});

test("pins HTTPS requests while preserving virtual-host SNI and Host routing", async () => {
  const observed = {
    host: "",
    remoteAddress: "",
    servername: "",
  };
  const server = createServer(
    { key: LOCAL_HTTPS_KEY, cert: LOCAL_HTTPS_CERT },
    (request, response) => {
      observed.host = request.headers.host ?? "";
      observed.remoteAddress = request.socket.remoteAddress ?? "";
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<!doctype html><title>Virtual host</title>");
    },
  );
  server.on("secureConnection", (socket) => {
    observed.servername = typeof socket.servername === "string" ? socket.servername : "";
  });
  const port = await listen(server);

  try {
    const response = await fetchPinnedUrl(
      `https://source.virtual-host.test:${port}/app`,
      { method: "GET" },
      "127.0.0.1",
      { ca: LOCAL_HTTPS_CERT },
    );

    assert.equal(response.status, 200);
    assert.match(await response.text(), /Virtual host/);
    assert.equal(observed.remoteAddress, "127.0.0.1");
    assert.equal(observed.servername, "source.virtual-host.test");
    assert.equal(observed.host, `source.virtual-host.test:${port}`);
  } finally {
    await close(server);
  }
});

test("rejects an HTTPS certificate whose identity does not match the requested hostname", async () => {
  const server = createServer(
    { key: LOCAL_HTTPS_KEY, cert: LOCAL_HTTPS_CERT },
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<!doctype html><title>Should not import</title>");
    },
  );
  const port = await listen(server);

  try {
    const error = await rejectsWith(
      fetchHostedUrl("https://wrong.virtual-host.test/app", {
        lookup: publicLookup,
        fetch: (url, init, pinnedAddress) => {
          const localUrl = new URL(url);
          localUrl.port = String(port);
          return fetchPinnedUrl(localUrl.toString(), init, "127.0.0.1", { ca: LOCAL_HTTPS_CERT });
        },
      }),
      "HOSTED_URL_FETCH_FAILED",
    );

    assert.doesNotMatch(error.message, /Should not import/);
  } finally {
    await close(server);
  }
});

test("aborting a stalled pinned HTTPS response closes its client connection", async () => {
  let resolveConnectionClosed: (() => void) | undefined;
  const connectionClosed = new Promise<void>((resolve) => {
    resolveConnectionClosed = resolve;
  });
  const server = createServer(
    { key: LOCAL_HTTPS_KEY, cert: LOCAL_HTTPS_CERT },
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.write("<!doctype html><title>Stalled</title>");
    },
  );
  server.on("connection", (socket) => {
    socket.once("close", () => resolveConnectionClosed?.());
  });
  const port = await listen(server);

  try {
    await rejectsWith(
      fetchHostedUrl("https://source.virtual-host.test/stalled", {
        lookup: publicLookup,
        timeoutMs: 25,
        fetch: (url, init, pinnedAddress) => {
          const localUrl = new URL(url);
          localUrl.port = String(port);
          return fetchPinnedUrl(localUrl.toString(), init, "127.0.0.1", { ca: LOCAL_HTTPS_CERT });
        },
      }),
      "HOSTED_URL_TIMEOUT",
    );

    await Promise.race([
      connectionClosed,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Pinned HTTPS connection remained open after abort")), 1_000),
      ),
    ]);
  } finally {
    await close(server);
  }
});

test("cancels concurrent stalled pinned HTTPS responses and closes every client connection", async () => {
  const importCount = 4;
  const timeoutMs = 50;
  let requestCount = 0;
  let resolveRequestsReceived: (() => void) | undefined;
  const requestsReceived = new Promise<void>((resolve) => {
    resolveRequestsReceived = resolve;
  });
  const closedConnections: Promise<void>[] = [];
  const server = createServer(
    { key: LOCAL_HTTPS_KEY, cert: LOCAL_HTTPS_CERT },
    (_request, response) => {
      requestCount += 1;
      if (requestCount === importCount) resolveRequestsReceived?.();
      response.writeHead(200, { "content-type": "text/html" });
      response.write("<!doctype html><title>Stalled</title>");
    },
  );
  server.on("connection", (socket) => {
    closedConnections.push(
      new Promise<void>((resolve) => {
        socket.once("close", () => resolve());
      }),
    );
  });
  const port = await listen(server);

  try {
    const operations = Array.from({ length: importCount }, (_, index) => {
      const startedAt = Date.now();
      return rejectsWith(
        fetchHostedUrl(`https://source.virtual-host.test/stalled-${index}`, {
          lookup: publicLookup,
          timeoutMs,
          fetch: (url, init, _pinnedAddress) => {
            const localUrl = new URL(url);
            localUrl.port = String(port);
            return fetchPinnedUrl(localUrl.toString(), init, "127.0.0.1", {
              ca: LOCAL_HTTPS_CERT,
            });
          },
        }),
        "HOSTED_URL_TIMEOUT",
      ).then((error) => ({ error, elapsedMs: Date.now() - startedAt }));
    });

    await Promise.race([
      requestsReceived,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("HTTPS fixture did not receive every stalled request"),
            ),
          1_000,
        ),
      ),
    ]);
    const outcomes = await Promise.all(operations);

    assert.equal(outcomes.length, importCount);
    for (const { error, elapsedMs } of outcomes) {
      assert.equal(error.code, "HOSTED_URL_TIMEOUT");
      assert.ok(
        elapsedMs < timeoutMs + 500,
        `stalled import exceeded its configured timeout: ${elapsedMs}ms`,
      );
    }
    assert.equal(closedConnections.length, importCount);
    await Promise.race([
      Promise.all(closedConnections),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Not every stalled HTTPS connection closed")),
          1_000,
        ),
      ),
    ]);
  } finally {
    await close(server);
  }
});

test("blocks loopback and private destinations before fetch", async () => {
  let fetchCalls = 0;
  await rejectsWith(
    fetchHostedUrl("https://127.0.0.1/admin", {
      fetch: async () => {
        fetchCalls += 1;
        return response("<!doctype html>");
      },
    }),
    "HOSTED_URL_BLOCKED_HOST",
  );
  assert.equal(fetchCalls, 0);

  await rejectsWith(
    fetchHostedUrl("https://private.example.test", {
      lookup: async () => [{ address: "10.0.0.4", family: 4 }],
      fetch: async () => {
        fetchCalls += 1;
        return response("<!doctype html>");
      },
    }),
    "HOSTED_URL_BLOCKED_HOST",
  );
  assert.equal(fetchCalls, 0);

  await rejectsWith(
    fetchHostedUrl("https://[ff02::1]/reserved", {
      fetch: async () => {
        fetchCalls += 1;
        return response("<!doctype html>");
      },
    }),
    "HOSTED_URL_BLOCKED_HOST",
  );
  assert.equal(fetchCalls, 0);
});

test("blocks uncommon private and reserved address representations before fetch", async () => {
  const blockedAddresses: Array<{ address: string; family: number }> = [
    { address: "::ffff:10.0.0.1", family: 6 },
    { address: "::ffff:192.168.1.1", family: 6 },
    { address: "::ffff:100.64.0.1", family: 6 },
    { address: "::ffff:192.0.2.1", family: 6 },
    { address: "::ffff:198.51.100.42", family: 6 },
    { address: "::ffff:203.0.113.9", family: 6 },
    { address: "::c000:201", family: 6 },
    { address: "192.31.196.1", family: 4 },
    { address: "192.52.193.1", family: 4 },
    { address: "192.88.99.1", family: 4 },
    { address: "2001:db8::1", family: 6 },
    { address: "2001:2::1", family: 6 },
    { address: "fec0::1", family: 6 },
    { address: "2001:10::1", family: 6 },
    { address: "2001:0::1", family: 6 },
  ];
  let fetchCalls = 0;

  for (const address of blockedAddresses) {
    await rejectsWith(
      fetchHostedUrl("https://reserved.example.test/resource", {
        lookup: async () => [address],
        fetch: async () => {
          fetchCalls += 1;
          return response("<!doctype html>");
        },
      }),
      "HOSTED_URL_BLOCKED_HOST",
    );
  }

  assert.equal(fetchCalls, 0);
});

test("rechecks DNS and blocks rebinding before network access", async () => {
  let lookupCalls = 0;
  let fetchCalls = 0;
  await rejectsWith(
    fetchHostedUrl("https://changing.example.test", {
      lookup: async () => {
        lookupCalls += 1;
        return lookupCalls === 1
          ? [{ address: "93.184.216.34", family: 4 }]
          : [{ address: "169.254.169.254", family: 4 }];
      },
      fetch: async () => {
        fetchCalls += 1;
        return response("<!doctype html>");
      },
    }),
    "HOSTED_URL_DNS_REBINDING",
  );
  assert.equal(lookupCalls, 2);
  assert.equal(fetchCalls, 0);
});

test("pins the validated address across a validation/fetch DNS mismatch", async () => {
  let fetchCalls = 0;
  let lookupCalls = 0;
  const lookupChangingHost = async () => {
    lookupCalls += 1;
    return lookupCalls <= 2
      ? [{ address: "93.184.216.34", family: 4 }]
      : [{ address: "127.0.0.1", family: 4 }];
  };
  const result = await fetchHostedUrl("https://changing.example.test/app", {
    lookup: lookupChangingHost,
    fetch: async (url, _init, pinnedAddress) => {
      fetchCalls += 1;
      assert.equal(url, "https://changing.example.test/app");
      assert.equal(pinnedAddress, "93.184.216.34");
      const connectionAddress = (await lookupChangingHost())[0].address;
      assert.equal(connectionAddress, "127.0.0.1");
      return response("<!doctype html><title>Pinned</title>");
    },
  });

  assert.equal(lookupCalls, 3);
  assert.equal(fetchCalls, 1);
  assert.match(result.html, /Pinned/);
});

test("revalidates and repins each redirect destination", async () => {
  const pinnedAddresses: string[] = [];
  const lookup = async (hostname: string) => [
    {
      address: hostname === "source.example.test" ? "93.184.216.34" : "93.184.216.35",
      family: 4,
    },
  ];
  const result = await fetchHostedUrl("https://source.example.test/start", {
    lookup,
    fetch: async (url, _init, pinnedAddress) => {
      pinnedAddresses.push(`${url}:${pinnedAddress}`);
      return String(url).endsWith("/start")
        ? response("", { location: "https://target.example.test/final" }, 302)
        : response("<!doctype html><title>Redirected</title>");
    },
  });

  assert.deepEqual(pinnedAddresses, [
    "https://source.example.test/start:93.184.216.34",
    "https://target.example.test/final:93.184.216.35",
  ]);
  assert.equal(result.finalUrl, "https://target.example.test/final");
  assert.match(result.html, /Redirected/);
});

test("blocks redirect rebinding before fetching the redirected address", async () => {
  let lookupCalls = 0;
  let fetchCalls = 0;
  await rejectsWith(
    fetchHostedUrl("https://example.com/start", {
      lookup: async () => {
        lookupCalls += 1;
        if (lookupCalls <= 2) return [{ address: "93.184.216.34", family: 4 }];
        return lookupCalls === 3
          ? [{ address: "93.184.216.35", family: 4 }]
          : [{ address: "127.0.0.1", family: 4 }];
      },
      fetch: async (_url, _init, pinnedAddress) => {
        fetchCalls += 1;
        assert.equal(pinnedAddress, "93.184.216.34");
        return response("", { location: "https://redirect.example.test/private" }, 302);
      },
    }),
    "HOSTED_URL_DNS_REBINDING",
  );
  assert.equal(lookupCalls, 4);
  assert.equal(fetchCalls, 1);
});

test("validates every redirect destination", async () => {
  let fetchCalls = 0;
  await rejectsWith(
    fetchHostedUrl("https://example.com/start", {
      lookup: publicLookup,
      fetch: async (url) => {
        fetchCalls += 1;
        return String(url).endsWith("/start")
          ? response("", { location: "http://127.0.0.1/private" }, 302)
          : response("<!doctype html>");
      },
    }),
    "HOSTED_URL_HTTP_DISABLED",
  );
  assert.equal(fetchCalls, 1);
});

test("rejects credentials, non-HTML responses, and oversized bodies", async () => {
  let fetchCalls = 0;
  const credentialError = await rejectsWith(
    fetchHostedUrl("https://example.com/app?api_key=do-not-echo-this-value", {
      lookup: publicLookup,
      fetch: async () => {
        fetchCalls += 1;
        return response("<!doctype html>");
      },
    }),
    "HOSTED_URL_CREDENTIALS",
  );
  assert.equal(fetchCalls, 0);
  assert.doesNotMatch(credentialError.message, /do-not-echo-this-value/);

  await rejectsWith(
    fetchHostedUrl("https://example.com/app", {
      lookup: publicLookup,
      fetch: async () => response("not html", { "content-type": "application/json" }),
    }),
    "HOSTED_URL_NOT_HTML",
  );

  await rejectsWith(
    fetchHostedUrl("https://example.com/app", {
      lookup: publicLookup,
      fetch: async () =>
        response("<!doctype html>", {
          "content-type": "text/html",
          "content-length": String(HOSTED_URL_MAX_BYTES + 1),
        }),
    }),
    "HOSTED_URL_TOO_LARGE",
  );
});

test("preserves hosted HTML through the shared source limit and rejects larger bodies", async () => {
  const prefix = "<!doctype html><title>Near limit</title>";
  const nearLimitHtml = prefix + "x".repeat(HOSTED_URL_MAX_BYTES - new TextEncoder().encode(prefix).length);
  const result = await fetchHostedUrl("https://example.com/near-limit", {
    lookup: publicLookup,
    fetch: async () => response(nearLimitHtml),
  });
  assert.equal(new TextEncoder().encode(result.html).byteLength, HOSTED_URL_MAX_BYTES);

  await rejectsWith(
    fetchHostedUrl("https://example.com/over-limit", {
      lookup: publicLookup,
      fetch: async () => response(`${nearLimitHtml}x`),
    }),
    "HOSTED_URL_TOO_LARGE",
  );
});

test("converts a slow fetch into an actionable timeout", async () => {
  await rejectsWith(
    fetchHostedUrl("https://example.com/slow", {
      lookup: publicLookup,
      timeoutMs: 5,
      fetch: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    }),
    "HOSTED_URL_TIMEOUT",
  );
});