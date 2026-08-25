import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import http, { type IncomingMessage } from "node:http";
import { createRequire } from "node:module";
import test from "node:test";
import { once } from "node:events";

const requireFromDb = createRequire(
  new URL("../../../../lib/db/package.json", import.meta.url),
);
const { Pool } = requireFromDb("pg");

type Json = Record<string, unknown>;

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
}> {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: (await response.json()) as Json,
  };
}

test("forwards source unchanged and resumes only the failed setup skill", async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const ownerId = `port-test-owner-${randomUUID()}`;
  const otherOwnerId = `port-test-other-${randomUUID()}`;
  const ownerSession = randomUUID().replaceAll("-", "");
  const otherSession = randomUUID().replaceAll("-", "");
  const sessionExpiry = new Date(Date.now() + 60_000);
  await pool.query(
    `INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)`,
    [
      ownerId,
      `${ownerId}@example.test`,
      otherOwnerId,
      `${otherOwnerId}@example.test`,
    ],
  );
  await pool.query(
    `INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2::jsonb, $3), ($4, $5::jsonb, $3)`,
    [
      ownerSession,
      JSON.stringify({
        user: {
          id: ownerId,
          email: `${ownerId}@example.test`,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        },
        access_token: "test-access-token",
      }),
      sessionExpiry,
      otherSession,
      JSON.stringify({
        user: {
          id: otherOwnerId,
          email: `${otherOwnerId}@example.test`,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        },
        access_token: "test-access-token",
      }),
    ],
  );

  const bridgeSecret = "bridge-secret-that-must-not-be-copied";
  const source = `<!doctype html>
<html><head><title>Byte exact Poe app</title></head>
<body><script>fetch("/ai")</script></body></html>`;
  const setupNames: string[] = [];
  let createdProject: Json | null = null;
  let firstFailure = true;
  const connection = http.createServer(async (request, response) => {
    const body = JSON.parse(await readBody(request)) as Json;
    if (request.method === "POST" && request.url === "/projects") {
      createdProject = body;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ projectId: "project-123", projectUrl: "https://replit.com/@test/project-123" }));
      return;
    }

    if (request.method === "POST" && request.url === "/projects/project-123/setup") {
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
      REPLIT_PROJECT_CREATION_URL: `http://127.0.0.1:${connectionPort}`,
      REPLIT_PROJECT_CREATION_TOKEN: bridgeSecret,
    },
    stdio: "ignore",
  });

  try {
    const baseUrl = `http://127.0.0.1:${apiPort}/api`;
    const browserOrigin = `http://127.0.0.1:${apiPort}`;
    const ownerHeaders = { Cookie: `sid=${ownerSession}` };
    const otherOwnerHeaders = { Cookie: `sid=${otherSession}` };
    await waitFor(async () => {
      try {
        return (await fetch(`${baseUrl}/healthz`)).ok;
      } catch {
        return false;
      }
    }, "API server did not start");

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
    assert.equal(JSON.stringify(createdProject).includes(bridgeSecret), false);

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
    await pool.query(`DELETE FROM sessions WHERE sid = ANY($1::varchar[])`, [
      [ownerSession, otherSession],
    ]);
    await pool.query(`DELETE FROM users WHERE id = ANY($1::varchar[])`, [
      [ownerId, otherOwnerId],
    ]);
    await pool.end();
  }
});