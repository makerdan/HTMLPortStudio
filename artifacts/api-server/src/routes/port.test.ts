import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import http, { type IncomingMessage } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { once } from "node:events";
import { SOURCE_TEXT_MAX_BYTES as ANALYSIS_SOURCE_LIMIT } from "./source-limits.ts";

const requireFromDb = createRequire(
  new URL("../../../../lib/db/package.json", import.meta.url),
);
const { Pool } = requireFromDb("pg");

type Json = Record<string, unknown>;

function testClientIp(): string {
  const value = randomUUID().replaceAll("-", "");
  return `198.18.${Number.parseInt(value.slice(0, 2), 16)}.${Number.parseInt(value.slice(2, 4), 16)}`;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function listen(server: http.Server): Promise<number> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return address.port;
}

async function unusedPort(): Promise<number> {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function waitFor(
  callback: () => Promise<boolean>,
  message: string,
): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await callback()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

async function jsonRequest(url: string, init?: RequestInit): Promise<{
  status: number;
  body: Json;
  headers: Headers;
}> {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: (await response.json()) as Json,
    headers: response.headers,
  };
}

// Regression matrix for provider-specific formats and the assignment styles
// seen in imported HTML. Add a case when a provider introduces a new token
// shape; both endpoint checks below must remain blocked before any connector
// or external Poe request is attempted.
const credentialRegressionMatrix = [
  { name: "OpenAI", value: "sk-proj-imported-secret-value", source: "const apiKey = VALUE;" },
  { name: "Anthropic", value: "sk-ant-api03-imported-secret-value", source: "api_key: 'VALUE'" },
  { name: "Poe", value: "poe-imported-secret-value", source: "POE_API_KEY=VALUE" },
  { name: "Perplexity", value: "pplx-imported-secret-value", source: "token = `VALUE`" },
  { name: "Google AI", value: "AIzaSyImportedSecretValue123", source: '"apiToken": "VALUE"' },
  { name: "Replicate", value: "r8_imported-secret-value", source: "secret: VALUE" },
  { name: "Hugging Face", value: "hf_imported-secret-value", source: "access_token = VALUE" },
  { name: "GitHub classic", value: "ghp_imported_secret_value_123456", source: "GITHUB_TOKEN='VALUE'" },
  { name: "GitHub fine-grained", value: "github_pat_imported_secret_value_123456", source: "token: VALUE" },
  { name: "Slack", value: "xoxb-1234567890-1234567890-1234567890", source: "authorization = 'Bearer VALUE'" },
  { name: "AWS access key", value: "AKIAIOSFODNN7EXAMPLE", source: "aws_access_key_id=VALUE" },
  {
    name: "AWS secret key",
    value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    source: "aws_secret_access_key='VALUE'",
  },
  { name: "Groq", value: "gsk_imported-secret-value", source: "api_key = VALUE" },
  { name: "SendGrid", value: "SG.imported-secret-value-123456", source: "client_secret: VALUE" },
  {
    name: "JWT",
    value: "eyJhbGciOiJIUzI1NiJ9.imported-secret-payload.signature-value",
    source: "authorization: VALUE",
  },
] as const;

test("covers the analysis boundary matrix and origin routing", async () => {
  const apiPort = await unusedPort();
  const splitOrigin = "https://studio.example.test";
  const api = spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
    cwd: new URL("../../", import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(apiPort),
      HTML_PORT_STUDIO_ORIGINS: splitOrigin,
      NODE_ENV: "test",
    },
    stdio: "ignore",
  });

  const baseUrl = `http://127.0.0.1:${apiPort}/api`;
  const html = "<!doctype html><title>Boundary fixture</title><main>ok</main>";
  const metadata = { displayName: "Boundary fixture" };
  const bundle = (files: Array<{ path: string; content: string }>, entrypoint = files[0]?.path) => ({
    version: 1 as const,
    sourceType: "zip_project" as const,
    files,
    entrypoint: entrypoint ?? "index.html",
    metadata,
  });
  const analyze = (body: unknown, headers: Record<string, string> = {}) =>
    jsonRequest(`${baseUrl}/port/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  try {
    await waitFor(async () => {
      try {
        return (await fetch(`${baseUrl}/healthz`)).ok;
      } catch {
        return false;
      }
    }, "API server did not start");

    const normal = await analyze({ html });
    assert.equal(normal.status, 200);
    assert.equal(normal.body.sourceType, "pasted_html");

    const malformedButAccepted = await analyze({
      html,
      unexpected: "ignored by the accepted request shape",
    });
    assert.equal(malformedButAccepted.status, 200);

    const exactLimit = await analyze({ html: "x".repeat(ANALYSIS_SOURCE_LIMIT) });
    assert.equal(exactLimit.status, 200);
    assert.equal(exactLimit.body.totalBytes, ANALYSIS_SOURCE_LIMIT);

    const overLimit = await analyze({ html: "x".repeat(ANALYSIS_SOURCE_LIMIT + 1) });
    assert.equal(overLimit.status, 413);
    assert.equal(overLimit.body.code, "BUNDLE_TOO_LARGE");

    const ambiguous = await analyze({
      html,
      bundle: bundle([{ path: "index.html", content: html }]),
    });
    assert.equal(ambiguous.status, 400);
    assert.equal(ambiguous.body.code, "BUNDLE_AMBIGUOUS");

    const empty = await analyze({ html: " \n\t" });
    assert.equal(empty.status, 400);
    assert.equal(empty.body.code, "BUNDLE_EMPTY");

    const unsafePath = await analyze(
      { bundle: bundle([{ path: "../private.html", content: html }]) },
    );
    assert.equal(unsafePath.status, 400);
    assert.equal(unsafePath.body.code, "BUNDLE_UNSAFE_PATH");

    const duplicatePath = await analyze({
      bundle: bundle([
        { path: "index.html", content: html },
        { path: "index.html", content: "<!doctype html>" },
      ]),
    });
    assert.equal(duplicatePath.status, 400);
    assert.equal(duplicatePath.body.code, "BUNDLE_DUPLICATE_PATH");

    const missingEntrypoint = await analyze({
      bundle: bundle([{ path: "index.html", content: html }], "missing.html"),
    });
    assert.equal(missingEntrypoint.status, 400);
    assert.equal(missingEntrypoint.body.code, "BUNDLE_ENTRYPOINT_MISSING");

    const windowsSeparators = await analyze({
      bundle: bundle(
        [
          { path: "pages\\index.html", content: html },
          { path: "pages\\styles.css", content: "body { color: black; }" },
        ],
        "pages\\index.html",
      ),
    });
    assert.equal(windowsSeparators.status, 200);
    assert.equal(windowsSeparators.body.entrypoint, "pages/index.html");
    assert.deepEqual(windowsSeparators.body.files, ["pages/index.html", "pages/styles.css"]);

    const malformedJson = await fetch(`${baseUrl}/port/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"html":"unterminated"',
    });
    const malformedJsonBody = (await malformedJson.json()) as Json;
    assert.equal(malformedJson.status, 400);
    assert.deepEqual(malformedJsonBody, {
      error: "Provide a valid JSON request body.",
      code: "INVALID_JSON",
    });

    const malformedJsonEndpoints = [
      "/port/hosted-url",
      "/port/playground/import",
      "/port/poe/chat",
      "/port/github/import",
      "/port/replit-projects",
      "/port/replit-projects/test-job/retry",
    ];
    for (const endpoint of malformedJsonEndpoints) {
      const malformedEndpointResponse = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"source":"do not echo this request content"',
      });
      assert.equal(malformedEndpointResponse.status, 400, endpoint);
      const malformedEndpointBody = (await malformedEndpointResponse.json()) as Json;
      assert.deepEqual(malformedEndpointBody, {
        error: "Provide a valid JSON request body.",
        code: "INVALID_JSON",
      }, endpoint);
      assert.doesNotMatch(JSON.stringify(malformedEndpointBody), /do not echo this request content/);
    }

    const parserOverflow = await analyze({ html: "x".repeat(8 * 1024 * 1024) });
    assert.equal(parserOverflow.status, 413);
    assert.equal(parserOverflow.body.code, "BUNDLE_TOO_LARGE");

    const sameOrigin = await fetch(`${baseUrl}/port/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
    assert.equal(sameOrigin.status, 200);
    assert.equal(sameOrigin.headers.get("access-control-allow-origin"), null);
    await sameOrigin.json();

    const splitOriginResponse = await fetch(`${baseUrl}/port/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: splitOrigin,
      },
      body: JSON.stringify({ html }),
    });
    assert.equal(splitOriginResponse.status, 200);
    assert.equal(
      splitOriginResponse.headers.get("access-control-allow-origin"),
      splitOrigin,
    );
    await splitOriginResponse.json();
  } finally {
    if (!api.killed) {
      api.kill("SIGTERM");
      await once(api, "exit").catch(() => undefined);
    }
  }
});

test("requires an exact live Poe model confirmation before chat forwarding", async () => {
  const source = await readFile(
    new URL("./port.ts", import.meta.url),
    "utf8",
  );
  const chatStart = source.indexOf('router.post("/port/poe/chat"');
  const chatEnd = source.indexOf('router.get("/port/replit-project-connection"', chatStart);
  const chatSource = source.slice(chatStart, chatEnd);
  const catalogueIndex = chatSource.indexOf("await loadPoeModelCatalogue()");
  const completionIndex = chatSource.indexOf('poeRequest("/chat/completions"');

  assert.notEqual(chatStart, -1);
  assert.notEqual(chatEnd, -1);
  assert.ok(catalogueIndex >= 0);
  assert.ok(completionIndex > catalogueIndex);
  assert.match(chatSource, /isPoeModelConfirmed\(catalogue\.models, parsed\.data\.model\)/);
  assert.match(source, /models\.some\(\(model\) => model === requestedModel\)/);
  assert.match(chatSource, /code: "POE_MODEL_UNAVAILABLE"/);
  assert.match(
    chatSource,
    /The requested Poe model is not currently available\. Refresh model availability and try again\./,
  );
  assert.match(source, /model: parsed\.data\.model/);
  assert.doesNotMatch(chatSource, /toLowerCase|toUpperCase|PascalCase/);
});

test("forwards confirmed Claude repairs unchanged and hides Poe failure details", async () => {
  const confirmedModel = "Claude-Sonnet-4.6";
  const clientIp = testClientIp();
  const redactedMessages = [
    {
      role: "system",
      content: "You are a careful repair assistant. Never request or reveal credentials.",
    },
    {
      role: "user",
      content:
        "Repair this redacted source without changing unrelated code:\n" +
        "const apiKey = '[REDACTED CREDENTIAL]';\n" +
        "const answer = 42;",
    },
  ];
  const poeRequests: Array<{
    method: string;
    path: string;
    authorization: string | undefined;
    body: Json | null;
  }> = [];
  let returnFailure = false;
  let returnMalformedCompletion = false;
  const poe = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const body =
      request.method === "POST" ? (JSON.parse(await readBody(request)) as Json) : null;
    poeRequests.push({
      method: request.method ?? "",
      path: url.pathname,
      authorization: request.headers.authorization,
      body,
    });

    if (request.method === "GET" && url.pathname === "/v1/models") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          data: [{ id: confirmedModel }, { id: "another-confirmed-model" }],
        }),
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      if (returnFailure) {
        response.writeHead(429, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            error: {
              message: "provider-internal diagnostic with sensitive details",
              request_id: "provider-secret-request-id",
            },
          }),
        );
        return;
      }

      if (returnMalformedCompletion) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            error: {
              message: "provider-internal malformed completion diagnostic",
              request_id: "provider-malformed-secret-request-id",
            },
            choices: [],
          }),
        );
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          model: confirmedModel,
          choices: [{ message: { content: "The redacted repair is safe to apply." } }],
          usage: { prompt_tokens: 31, completion_tokens: 9 },
        }),
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });
  const poePort = await listen(poe);
  const apiPort = await unusedPort();
  const api = spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
    cwd: new URL("../../", import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(apiPort),
      POE_API_KEY: "test-poe-key",
      POE_API_BASE_URL: `http://127.0.0.1:${poePort}/v1`,
      NODE_ENV: "test",
    },
    stdio: "ignore",
  });

  try {
    const baseUrl = `http://127.0.0.1:${apiPort}/api`;
    await waitFor(async () => {
      try {
        return (await fetch(`${baseUrl}/healthz`)).ok;
      } catch {
        return false;
      }
    }, "API server did not start");

    const catalogue = await jsonRequest(`${baseUrl}/port/poe/models`);
    assert.equal(catalogue.status, 200);
    assert.deepEqual(catalogue.body.models, [confirmedModel, "another-confirmed-model"]);

    const successfulChat = await jsonRequest(`${baseUrl}/port/poe/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": clientIp },
      body: JSON.stringify({
        model: confirmedModel,
        messages: redactedMessages,
        maxTokens: 321,
      }),
    });
    assert.equal(successfulChat.status, 200);
    assert.deepEqual(successfulChat.body, {
      content: "The redacted repair is safe to apply.",
      model: confirmedModel,
      usage: { promptTokens: 31, completionTokens: 9 },
    });

    const forwardedChat = poeRequests.find(
      (request) => request.method === "POST" && request.path === "/v1/chat/completions",
    );
    assert.ok(forwardedChat);
    assert.equal(forwardedChat.authorization, "Bearer test-poe-key");
    assert.deepEqual(forwardedChat.body, {
      model: confirmedModel,
      messages: redactedMessages,
      max_tokens: 321,
    });

    returnFailure = true;
    const failedChat = await jsonRequest(`${baseUrl}/port/poe/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": clientIp },
      body: JSON.stringify({
        model: confirmedModel,
        messages: redactedMessages,
      }),
    });
    assert.equal(failedChat.status, 503);
    assert.deepEqual(failedChat.body, {
      error:
        "Poe returned 429. Check POE_API_KEY, account access, and the exact model identifier.",
    });
    assert.doesNotMatch(
      JSON.stringify(failedChat.body),
      /provider-internal diagnostic|provider-secret-request-id/,
    );

    returnFailure = false;
    returnMalformedCompletion = true;
    const malformedChat = await jsonRequest(`${baseUrl}/port/poe/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": clientIp },
      body: JSON.stringify({
        model: confirmedModel,
        messages: redactedMessages,
      }),
    });
    assert.equal(malformedChat.status, 503);
    assert.deepEqual(malformedChat.body, {
      error: "Poe returned a completion without text content.",
    });
    assert.doesNotMatch(
      JSON.stringify(malformedChat.body),
      /provider-internal malformed completion diagnostic|provider-malformed-secret-request-id/,
    );
  } finally {
    if (!api.killed) {
      api.kill("SIGTERM");
      await once(api, "exit").catch(() => undefined);
    }
    await new Promise<void>((resolve) => poe.close(() => resolve()));
  }
});

test("bounds public Poe traffic before provider forwarding and caches models", async () => {
  const confirmedModel = "Claude-Sonnet-4.6";
  let modelRequests = 0;
  let completionRequests = 0;
  const poe = http.createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "GET" && path === "/v1/models") {
      modelRequests += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: confirmedModel }] }));
      return;
    }
    if (request.method === "POST" && path === "/v1/chat/completions") {
      completionRequests += 1;
      await readBody(request);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          model: confirmedModel,
          choices: [{ message: { content: "bounded response" } }],
        }),
      );
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const poePort = await listen(poe);
  const apiEnvironment = {
    ...process.env,
    POE_API_KEY: "test-poe-key",
    POE_API_BASE_URL: `http://127.0.0.1:${poePort}/v1`,
    NODE_ENV: "test",
  };
  const startApi = (port: number) =>
    spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
      cwd: new URL("../../", import.meta.url).pathname,
      env: { ...apiEnvironment, PORT: String(port) },
      stdio: "ignore",
    });
  const stopApi = async (api: ChildProcess | undefined) => {
    if (api && !api.killed) {
      api.kill("SIGTERM");
      await once(api, "exit").catch(() => undefined);
    }
  };
  const apiPort = await unusedPort();
  const api = startApi(apiPort);
  let secondApi: ChildProcess | undefined;
  let restartedApi: ChildProcess | undefined;
  const abuseIp = `198.51.100.${(Number.parseInt(randomUUID().slice(0, 2), 16) % 254) + 1}`;

  try {
    const baseUrl = `http://127.0.0.1:${apiPort}/api`;
    await waitFor(async () => {
      try {
        return (await fetch(`${baseUrl}/healthz`)).ok;
      } catch {
        return false;
      }
    }, "API server did not start");

    const firstCatalogue = await jsonRequest(`${baseUrl}/port/poe/models`);
    const secondCatalogue = await jsonRequest(`${baseUrl}/port/poe/models`);
    assert.equal(firstCatalogue.status, 200);
    assert.equal(secondCatalogue.status, 200);
    assert.deepEqual(firstCatalogue.body.models, [confirmedModel]);
    assert.deepEqual(secondCatalogue.body.models, [confirmedModel]);
    assert.equal(modelRequests, 1);

    const oversized = await jsonRequest(`${baseUrl}/port/poe/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "198.51.100.8",
      },
      body: JSON.stringify({
        model: confirmedModel,
        messages: [{ role: "user", content: "x".repeat(600_000) }],
      }),
    });
    assert.equal(oversized.status, 413);
    assert.equal(oversized.body.code, "POE_CHAT_REQUEST_TOO_LARGE");

    const overTokenCeiling = await jsonRequest(`${baseUrl}/port/poe/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "198.51.100.9",
      },
      body: JSON.stringify({
        model: confirmedModel,
        messages: [{ role: "user", content: "hello" }],
        maxTokens: 8192,
      }),
    });
    assert.equal(overTokenCeiling.status, 400);
    assert.equal(overTokenCeiling.body.code, "POE_TOKEN_LIMIT_EXCEEDED");
    assert.equal(completionRequests, 0);

    const abuseHeaders = {
      "Content-Type": "application/json",
      "X-Forwarded-For": abuseIp,
    };
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const allowed = await jsonRequest(`${baseUrl}/port/poe/chat`, {
        method: "POST",
        headers: abuseHeaders,
        body: JSON.stringify({
          model: confirmedModel,
          messages: [{ role: "user", content: `request-${attempt}` }],
        }),
      });
      assert.equal(allowed.status, 200, `request ${attempt + 1} should be allowed`);
    }
    const blocked = await jsonRequest(`${baseUrl}/port/poe/chat`, {
      method: "POST",
      headers: abuseHeaders,
      body: JSON.stringify({
        model: confirmedModel,
        messages: [{ role: "user", content: "request-7" }],
      }),
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, "POE_RATE_LIMITED");
    assert.match(blocked.headers.get("retry-after") ?? "", /^[1-9]\d*$/);
    assert.equal(completionRequests, 6);

    const secondApiPort = await unusedPort();
    secondApi = startApi(secondApiPort);
    const secondBaseUrl = `http://127.0.0.1:${secondApiPort}/api`;
    await waitFor(async () => {
      try {
        return (await fetch(`${secondBaseUrl}/healthz`)).ok;
      } catch {
        return false;
      }
    }, "Second API server did not start");

    const blockedOnSecondApi = await jsonRequest(`${secondBaseUrl}/port/poe/chat`, {
      method: "POST",
      headers: abuseHeaders,
      body: JSON.stringify({
        model: confirmedModel,
        messages: [{ role: "user", content: "second-instance-request" }],
      }),
    });
    assert.equal(blockedOnSecondApi.status, 429);
    assert.equal(blockedOnSecondApi.body.code, "POE_RATE_LIMITED");
    assert.equal(completionRequests, 6);

    await stopApi(api);
    await stopApi(secondApi);
    const restartedApiPort = await unusedPort();
    restartedApi = startApi(restartedApiPort);
    const restartedBaseUrl = `http://127.0.0.1:${restartedApiPort}/api`;
    await waitFor(async () => {
      try {
        return (await fetch(`${restartedBaseUrl}/healthz`)).ok;
      } catch {
        return false;
      }
    }, "Restarted API server did not start");

    const blockedAfterRestart = await jsonRequest(`${restartedBaseUrl}/port/poe/chat`, {
      method: "POST",
      headers: abuseHeaders,
      body: JSON.stringify({
        model: confirmedModel,
        messages: [{ role: "user", content: "restart-request" }],
      }),
    });
    assert.equal(blockedAfterRestart.status, 429);
    assert.equal(blockedAfterRestart.body.code, "POE_RATE_LIMITED");
    assert.equal(completionRequests, 6);
  } finally {
    await stopApi(api);
    await stopApi(secondApi);
    await stopApi(restartedApi);
    await new Promise<void>((resolve) => poe.close(() => resolve()));
  }
});

test("forwards source unchanged and resumes only the failed setup skill", async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const ownerId = `port-test-owner-${randomUUID()}`;
  const otherOwnerId = `port-test-other-${randomUUID()}`;
  await pool.query(
    `INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)`,
    [
      ownerId,
      `${ownerId}@example.test`,
      otherOwnerId,
      `${otherOwnerId}@example.test`,
    ],
  );
  const source = `<!doctype html>
<html><head><title>Byte exact Poe app</title></head>
<body><script>fetch("/ai")</script></body></html>`;
  const setupNames: string[] = [];
  const connectorNames: string[] = [];
  let createdProject: Json | null = null;
  let connectionAttached = false;
  let firstFailure = true;
  const connection = http.createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "GET" && path === "/api/v2/connection") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          items: connectionAttached
            ? [
                {
                  id: "connection-123",
                  connector_name: "replit-project-creation",
                  status: "active",
                },
              ]
            : [],
        }),
      );
      return;
    }

    connectorNames.push(String(request.headers["connector-name"] ?? ""));
    const body = JSON.parse(await readBody(request)) as Json;
    if (request.method === "POST" && path === "/api/v2/proxy/projects") {
      createdProject = body;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ projectId: "project-123", projectUrl: "https://replit.com/@test/project-123" }));
      return;
    }

    if (request.method === "POST" && path === "/api/v2/proxy/projects/project-123/setup") {
      const setup = body as { name: string };
      setupNames.push(setup.name);
      const shouldFail = setup.name === "Failure Gate" && firstFailure;
      if (shouldFail) firstFailure = false;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        status: shouldFail ? "failed" : "completed",
      }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });
  const connectionPort = await listen(connection);
  const apiPort = await unusedPort();
  const api = spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
    cwd: new URL("../../", import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(apiPort),
      REPLIT_CONNECTORS_HOSTNAME: `http://127.0.0.1:${connectionPort}`,
      REPLIT_CLI: "/bin/false",
      REPL_IDENTITY: "test-repl-identity",
      NODE_ENV: "test",
    },
    stdio: "ignore",
  });

  try {
    const baseUrl = `http://127.0.0.1:${apiPort}/api`;
    const browserOrigin = `http://127.0.0.1:${apiPort}`;
    const ownerHeaders = { "x-test-clerk-user-id": ownerId };
    const otherOwnerHeaders = { "x-test-clerk-user-id": otherOwnerId };
    const credentialTestIp = testClientIp();
    await waitFor(async () => {
      try {
        return (await fetch(`${baseUrl}/healthz`)).ok;
      } catch {
        return false;
      }
    }, "API server did not start");

    const blockedChat = await jsonRequest(`${baseUrl}/port/poe/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": credentialTestIp,
      },
      body: JSON.stringify({
        model: "Claude-Sonnet-4.6",
        messages: [
          { role: "user", content: "Please inspect api_key: 'sk-imported-secret-value'." },
        ],
      }),
    });
    assert.equal(blockedChat.status, 400);
    assert.equal(blockedChat.body.code, "CHAT_CONTAINS_CREDENTIAL");

    for (const [credentialIndex, credential] of credentialRegressionMatrix.entries()) {
      const valueInSource = credential.source.replace("VALUE", credential.value);
      const matrixChat = await jsonRequest(`${baseUrl}/port/poe/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": testClientIp(),
        },
        body: JSON.stringify({
          model: "Claude-Sonnet-4.6",
          messages: [{ role: "user", content: `Review this imported source: ${valueInSource}` }],
        }),
      });
      assert.equal(matrixChat.status, 400, `${credential.name} chat credential was not blocked`);
      assert.equal(matrixChat.body.code, "CHAT_CONTAINS_CREDENTIAL", credential.name);
    }

    const connectionStatus = await jsonRequest(`${baseUrl}/port/replit-project-connection`, {
      headers: ownerHeaders,
    });
    assert.equal(connectionStatus.status, 200);
    assert.deepEqual(connectionStatus.body, { status: "setup_required" });

    const ownerSetup = await jsonRequest(`${baseUrl}/port/replit-project-connection/setup`, {
      headers: ownerHeaders,
    });
    assert.equal(ownerSetup.status, 200);
    assert.equal(ownerSetup.body.status, "setup_required");
    assert.match(String(ownerSetup.body.setupUrl), /\/console\/connector-config\?connector=replit-project-creation$/);

    const otherOwnerSetup = await jsonRequest(`${baseUrl}/port/replit-project-connection/setup`, {
      headers: otherOwnerHeaders,
    });
    assert.equal(otherOwnerSetup.status, 200);
    assert.equal(otherOwnerSetup.body.status, "setup_required");

    connectionAttached = true;
    const refreshedConnectionStatus = await jsonRequest(`${baseUrl}/port/replit-project-connection`, {
      headers: ownerHeaders,
    });
    assert.deepEqual(refreshedConnectionStatus.body, { status: "connected" });

    const blockedHandoff = await jsonRequest(`${baseUrl}/port/replit-projects`, {
      method: "POST",
      headers: {
        ...ownerHeaders,
        Origin: browserOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: "<!doctype html><script>const api_key = 'sk-imported-secret-value'</script>",
      }),
    });
    assert.equal(blockedHandoff.status, 400);
    assert.equal(blockedHandoff.body.code, "SOURCE_CONTAINS_CREDENTIAL");

    for (const credential of credentialRegressionMatrix) {
      const valueInSource = credential.source.replace("VALUE", credential.value);
      const matrixHandoff = await jsonRequest(`${baseUrl}/port/replit-projects`, {
        method: "POST",
        headers: {
          ...ownerHeaders,
          Origin: browserOrigin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: `<!doctype html><script>${valueInSource}</script>`,
        }),
      });
      assert.equal(
        matrixHandoff.status,
        400,
        `${credential.name} project handoff credential was not blocked`,
      );
      assert.equal(matrixHandoff.body.code, "SOURCE_CONTAINS_CREDENTIAL", credential.name);
    }

    const created = await jsonRequest(`${baseUrl}/port/replit-projects`, {
      method: "POST",
      headers: {
        ...ownerHeaders,
        Origin: browserOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html: source }),
    });
    assert.equal(created.status, 202);
    const jobId = created.body.jobId;
    assert.equal(typeof jobId, "string");

    let failedStatus: Json | null = null;
    await waitFor(async () => {
      const result = await jsonRequest(`${baseUrl}/port/replit-projects/${jobId}`, {
        headers: ownerHeaders,
      });
      if (result.body.status === "failed") {
        failedStatus = result.body;
        return true;
      }
      return false;
    }, "Failure Gate did not fail");

    assert.ok(failedStatus);
    const failedSteps = failedStatus["steps"];
    assert.ok(Array.isArray(failedSteps));
    assert.deepEqual(
      (failedSteps as unknown[]).map((step) => (step as { status: string }).status),
      ["completed", "completed", "failed", "pending", "pending"],
    );
    assert.deepEqual(setupNames, ["Poe Setup", "Port Authority", "Failure Gate"]);
    assert.deepEqual(createdProject?.["files"], [{ path: "index.html", content: source }]);
    assert.ok(connectorNames.length > 0);
    assert.ok(connectorNames.every((name) => name === "replit-project-creation"));

    const otherOwnerStatus = await jsonRequest(
      `${baseUrl}/port/replit-projects/${jobId}`,
      { headers: otherOwnerHeaders },
    );
    assert.equal(otherOwnerStatus.status, 404);
    const otherOwnerRetry = await jsonRequest(
      `${baseUrl}/port/replit-projects/${jobId}/retry`,
      {
        method: "POST",
        headers: { ...otherOwnerHeaders, Origin: browserOrigin },
      },
    );
    assert.equal(otherOwnerRetry.status, 404);

    const retried = await jsonRequest(
      `${baseUrl}/port/replit-projects/${jobId}/retry`,
      {
        method: "POST",
        headers: { ...ownerHeaders, Origin: browserOrigin },
      },
    );
    assert.equal(retried.status, 202);

    await waitFor(async () => {
      const result = await jsonRequest(`${baseUrl}/port/replit-projects/${jobId}`, {
        headers: ownerHeaders,
      });
      return result.body.status === "completed";
    }, "Retry did not finish the setup");

    assert.deepEqual(setupNames, [
      "Poe Setup",
      "Port Authority",
      "Failure Gate",
      "Failure Gate",
      "Harden Bug Fixes",
      "Skill Install Confirmation",
    ]);
  } finally {
    if (!api.killed) {
      api.kill("SIGTERM");
      await once(api, "exit").catch(() => undefined);
    }
    await new Promise<void>((resolve) => connection.close(() => resolve()));
    await pool.query(`DELETE FROM users WHERE id = ANY($1::varchar[])`, [
      [ownerId, otherOwnerId],
    ]);
    await pool.end();
  }
});

test("scans bundle paths as well as contents for credential-like values", async () => {
  const source = await readFile(new URL("./port.ts", import.meta.url), "utf8");
  const detectorStart = source.indexOf("function containsPrivilegedCredential");
  const detectorEnd = source.indexOf("function toHandoffJob", detectorStart);
  const detectorSource = source.slice(detectorStart, detectorEnd);

  assert.match(detectorSource, /flatMap\(\(file\) => \[file\.path, file\.content\]\)/);
  assert.match(detectorSource, /configuredSecrets\.some\(\(secret\) => html\.includes\(secret\)\)/);
});
