import assert from "node:assert/strict";
import test from "node:test";
import { fetchHostedUrl, HostedUrlError, HOSTED_URL_MAX_BYTES } from "./hosted-url.ts";

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

test("blocks link-local, metadata, and reserved destinations before fetch", async () => {
  for (const input of [
    "https://169.254.169.254/latest/meta-data",
    "https://192.0.2.1/documentation",
    "https://metadata.google.internal/computeMetadata/v1",
    "https://[fe80::1]/local",
  ]) {
    let fetchCalls = 0;
    await rejectsWith(
      fetchHostedUrl(input, {
        fetch: async () => {
          fetchCalls += 1;
          return response("<!doctype html>");
        },
      }),
      "HOSTED_URL_BLOCKED_HOST",
    );
    assert.equal(fetchCalls, 0, input);
  }
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
