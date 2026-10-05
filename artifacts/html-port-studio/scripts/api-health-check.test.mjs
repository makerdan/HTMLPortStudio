import assert from "node:assert/strict";
import test from "node:test";
import {
  API_HEALTH_TIMEOUT_MS,
  assertApiHealthResponse,
  checkApiHealth,
  resolveApiHealthUrl,
} from "./api-health-check.mjs";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

test("resolves the actual API health route from its artifact port", () => {
  assert.equal(
    resolveApiHealthUrl({ manifestText: "[[services]]\nlocalPort = 8123\n" }),
    "http://127.0.0.1:8123/api/healthz",
  );
});

test("uses the configured API port only when it is a valid TCP port", () => {
  assert.equal(
    resolveApiHealthUrl({ port: "8081" }),
    "http://127.0.0.1:8081/api/healthz",
  );
  for (const port of ["0", "65536", "abc", ""]) {
    assert.throws(() => resolveApiHealthUrl({ port }), /Invalid API health port/);
  }
});

test("accepts the API's healthy JSON response", async () => {
  assert.deepEqual(await assertApiHealthResponse(jsonResponse({ status: "ok" })), {
    status: "ok",
  });
});

test("rejects an HTML fallback even when it returns HTTP 200", async () => {
  const response = new Response("<!doctype html><title>Studio</title>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });
  await assert.rejects(assertApiHealthResponse(response), /expected application\/json/);
});

test("rejects malformed JSON returned with an application/json content type", async () => {
  const response = new Response("{broken", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(assertApiHealthResponse(response), /not valid JSON/);
});

test("rejects missing, array, or unhealthy JSON payloads", async () => {
  for (const body of [{}, { status: "degraded" }, [], null]) {
    await assert.rejects(
      assertApiHealthResponse(jsonResponse(body)),
      /expected a JSON object with status "ok"/,
    );
  }
});

test("rejects non-success HTTP responses even when their JSON is healthy", async () => {
  await assert.rejects(
    assertApiHealthResponse(jsonResponse({ status: "ok" }, 503)),
    /HTTP 503/,
  );
});

test("checks the configured URL with a bounded, non-redirecting GET", async () => {
  let observed;
  const body = await checkApiHealth("http://127.0.0.1:8080/api/healthz", {
    fetchImpl: async (url, options) => {
      observed = { url, options };
      return jsonResponse({ status: "ok" });
    },
  });

  assert.deepEqual(body, { status: "ok" });
  assert.equal(observed.url, "http://127.0.0.1:8080/api/healthz");
  assert.equal(observed.options.method, "GET");
  assert.equal(observed.options.redirect, "manual");
  assert.equal(observed.options.signal.aborted, false);
  assert.equal(API_HEALTH_TIMEOUT_MS, 2_000);
});