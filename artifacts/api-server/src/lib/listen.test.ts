import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { listen, parsePort, startupErrorMessage } from "./listen.ts";

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("API startup preserves the routed port and never runs a process-killing sweep", { timeout: 5000 }, async () => {
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.dev, "export NODE_ENV=development && pnpm run build && pnpm run start");
  const artifact = await readFile(new URL("../../.replit-artifact/artifact.toml", import.meta.url), "utf8");
  assert.match(artifact, /localPort = 8080/);
  assert.match(artifact, /paths = \["\/api"\]/);
  assert.match(artifact, /PORT = "8080"/);
});

test("PORT must be an explicit valid TCP port", { timeout: 5000 }, () => {
  assert.equal(parsePort("8080"), 8080);
  assert.equal(parsePort("65535"), 65535);
  for (const raw of [undefined, "", "0", "-1", "65536", "8e3", "8080.5", " 8080"]) {
    assert.throws(() => parsePort(raw), /PORT/);
  }
});

test("occupied port fails with actionable guidance while leaving the listener alive", { timeout: 5000 }, async () => {
  const owner = createServer((_req, res) => res.end("original listener"));
  const contender = createServer();
  const initialListeningListeners = contender.listenerCount("listening");
  const initialErrorListeners = contender.listenerCount("error");
  await listen(owner, 0);
  const address = owner.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  try {
    await assert.rejects(listen(contender, port), (error: NodeJS.ErrnoException) => {
      assert.equal(error.code, "EADDRINUSE");
      const message = startupErrorMessage(error, port);
      assert.match(message, new RegExp(`port ${port} is already in use`));
      assert.match(message, /No process was stopped/);
      assert.match(message, /artifacts\/api-server: API Server/);
      assert.match(message, /owner is not visible, do not reclaim/);
      assert.match(message, /localPort aligned/);
      return true;
    });
    assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(), "original listener");
    assert.equal(contender.listening, false);
    assert.equal(contender.listenerCount("listening"), initialListeningListeners);
  } finally {
    await close(owner);
  }
  // Reuse succeeds only after the fixture owner voluntarily releases its port.
  await listen(contender, port);
  assert.equal(contender.listening, true);
  assert.equal(contender.listenerCount("error"), initialErrorListeners);
  await close(contender);
});

test("non-conflict errors are not mislabeled as port collisions", { timeout: 5000 }, () => {
  assert.equal(
    startupErrorMessage(Object.assign(new Error("denied"), { code: "EACCES" }), 8080),
    "API Server could not listen on 0.0.0.0:8080 (EACCES).",
  );
});
