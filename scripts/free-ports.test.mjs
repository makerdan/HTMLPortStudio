import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const cleanupScript = join(process.cwd(), "scripts", "free-ports.mjs");

function runCleanup(args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cleanupScript, ...args.map(String)], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function listen(port = 0) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitUntil(predicate, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail("Timed out waiting for process state");
}

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), "free-ports-test-"));
  const fixture = join(directory, "listener.mjs");
  await writeFile(
    fixture,
    `
      import net from "node:net";
      import { spawn } from "node:child_process";
      import { readFileSync, writeFileSync } from "node:fs";
      const file = new URL(import.meta.url).pathname;
      const port = Number(process.argv[2] || 0);
      const mode = process.argv[3] || "graceful";
      const readyFile = process.argv[4];
      const server = net.createServer();
      const closeGracefully = () => server.close(() => process.exit(0));
      if (mode.endsWith("ignore-term")) process.once("SIGTERM", () => {});
      else process.once("SIGTERM", closeGracefully);
      server.listen(port, "127.0.0.1", () => {
        const actualPort = server.address().port;
        if (mode === "orphan" || mode === "orphan-ignore-term") {
          const childMode =
            mode === "orphan-ignore-term" ? "orphan-child-ignore-term" : "orphan-child";
          server.close(() => {
            const child = spawn(process.execPath, [file, "0", childMode, readyFile], {
              detached: true, stdio: ["ignore", "ignore", "ignore"]
            });
            child.unref();
            const interval = setInterval(() => {
              try {
                const ready = Number(readFileSync(readyFile, "utf8"));
                clearInterval(interval);
                console.log("READY " + ready);
                process.exit(0);
              } catch {
                // The detached child has not bound its socket yet.
              }
            }, 10);
          });
        } else if (mode === "orphan-wrapper") {
          server.close(() => {
            const child = spawn("sh", ["-c", process.execPath + " " + file + " 0 graceful"], {
              detached: true, stdio: ["ignore", "pipe", "ignore"]
            });
            child.stdout.on("data", (chunk) => {
              process.stdout.write(chunk);
              child.stdout.destroy();
              child.unref();
              process.exit(0);
            });
          });
        } else if (mode.startsWith("orphan-child")) {
          writeFileSync(readyFile, String(actualPort));
        } else {
          console.log("READY " + actualPort);
        }
      });
    `,
  );
  return {
    fixture,
    directory,
    async dispose() {
      await rm(directory, { recursive: true, force: true });
    },
  };
}

async function startFixture(fixture, mode, port = 0, shell = false) {
  const command = shell ? "sh" : process.execPath;
  const readyFile = `${fixture}.${process.pid}.${mode}.ready`;
  const args = shell
    ? ["-c", `${process.execPath} ${fixture} ${port} ${mode}`]
    : [fixture, String(port), mode, readyFile];
  const child = spawn(command, args, {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: mode.startsWith("orphan"),
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  const ready = new Promise((resolve, reject) => {
    const onData = (chunk) => {
      output += chunk;
      const match = output.match(/READY (\d+)/);
      if (match) {
        child.stdout.off("data", onData);
        resolve(Number(match[1]));
      }
    };
    child.stdout.on("data", onData);
    child.once("error", reject);
    child.once("close", () => {
      if (!output.match(/READY (\d+)/)) {
        reject(new Error(`fixture exited before READY: ${output}`));
      }
    });
  });
  const actualPort = await ready;
  await rm(readyFile, { force: true }).catch(() => {});
  if (mode.startsWith("orphan")) child.unref();
  return { child, port: actualPort };
}

test("rejects invalid input and refuses guarded environments", async () => {
  const missing = await runCleanup();
  assert.equal(missing.code, 2);
  assert.match(missing.stderr, /Usage:/);

  const invalid = await runCleanup(["0", "65536", "not-a-port"]);
  assert.equal(invalid.code, 2);

  const production = await runCleanup(["12345"], { REPLIT_DEV_DOMAIN: "", NODE_ENV: "production" });
  assert.equal(production.code, 2);
  assert.match(production.stderr, /refusing to run in production/);

  const disabled = await runCleanup([], { FREE_PORTS_DISABLE: "1" });
  assert.equal(disabled.code, 0);
  assert.match(disabled.stdout, /skipping sweep/);

  const recursive = await runCleanup([], { FREE_PORTS_RUNNING: "1" });
  assert.equal(recursive.code, 0);
  assert.match(recursive.stdout, /already running/);
});

test("is a no-op for an unused ephemeral port", async () => {
  const probe = await listen();
  const { port } = probe;
  await new Promise((resolve) => probe.server.close(resolve));
  const result = await runCleanup([port]);
  assert.equal(result.code, 0);
  assert.doesNotMatch(result.stdout, /terminating tree/);
});

test("protects a listener in the caller tree", async () => {
  const fixture = await createFixture();
  const holder = await startFixture(fixture.fixture, "graceful");
  try {
    const result = await runCleanup([holder.port]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /own process tree/);
    assert.equal(await isListening(holder.port), true);
  } finally {
    holder.child.kill("SIGTERM");
    await once(holder.child, "close").catch(() => {});
    await fixture.dispose();
  }
});

test("reclaims a stale holder and leaves an unrelated listener alone", async () => {
  const fixture = await createFixture();
  const stale = await startFixture(fixture.fixture, "orphan");
  const unrelated = await startFixture(fixture.fixture, "orphan");
  try {
    await waitUntil(() => isListening(stale.port));
    const result = await runCleanup([stale.port]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /terminating tree/);
    assert.equal(await isListening(stale.port), false);
    assert.equal(await isListening(unrelated.port), true);
  } finally {
    await runCleanup([unrelated.port]);
    await fixture.dispose();
  }
});

test("removes wrapper trees, terminating gracefully first", async () => {
  const fixture = await createFixture();
  const holder = await startFixture(fixture.fixture, "orphan-wrapper");
  try {
    const result = await runCleanup([holder.port]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /terminating tree/);
    assert.doesNotMatch(result.stdout, /escalating/);
    assert.equal(await isListening(holder.port), false);
  } finally {
    await fixture.dispose();
  }
});

test("escalates a non-cooperative stale holder to SIGKILL", async () => {
  const fixture = await createFixture();
  const stubborn = await startFixture(fixture.fixture, "orphan-ignore-term");
  try {
    const result = await runCleanup([stubborn.port]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /escalating to SIGKILL/);
    assert.equal(await isListening(stubborn.port), false);
  } finally {
    await fixture.dispose();
  }
});

test("fails loudly instead of killing a protected ancestor", async () => {
  const holder = await listen();
  try {
    const result = await runCleanup([holder.port]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /refusing to kill own ancestor/);
    assert.equal(await isListening(holder.port), true);
  } finally {
    await new Promise((resolve) => holder.server.close(resolve));
  }
});