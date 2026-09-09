import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const script = fileURLToPath(new URL("./free-ports.mjs", import.meta.url));

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("rejects missing, invalid, and unknown port input", () => {
  assert.equal(run([]).status, 2);
  assert.equal(run(["0"]).status, 2);
  assert.equal(run(["--unknown", "8080"]).status, 2);
});

test("does nothing successfully for a free ephemeral port", async () => {
  const port = await unusedPort();
  const result = run([String(port)]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^$/m);
});

test("refuses production and recursive execution loudly", () => {
  const production = run(["8080"], { NODE_ENV: "production", REPLIT_DEV_DOMAIN: "" });
  assert.equal(production.status, 2);
  assert.match(production.stderr, /refusing to run in production/i);
  const recursive = run(["8080"], { FREE_PORTS_RUNNING: "1" });
  assert.equal(recursive.status, 0);
  assert.match(recursive.stdout, /already running/i);
});

test("protects the caller tree from taking its own listener", async () => {
  const holder = spawn(
    process.execPath,
    ["-e", "require('net').createServer().listen(0, '127.0.0.1', function () { console.log(this.address().port); })"],
    { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
  );
  const port = await new Promise((resolve, reject) => {
    holder.stdout.once("data", (chunk) => resolve(Number(String(chunk).trim())));
    holder.once("error", reject);
  });
  const result = run([String(port)]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /process tree/i);
  holder.kill("SIGTERM");
  await new Promise((resolve) => holder.once("exit", resolve));
});

test("takes over a stale child listener when explicitly requested", async () => {
  const holder = spawn(
    process.execPath,
    ["-e", "require('net').createServer().listen(0, '127.0.0.1', function () { console.log(this.address().port); })"],
    { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
  );
  const port = await new Promise((resolve, reject) => {
    holder.stdout.once("data", (chunk) => resolve(Number(String(chunk).trim())));
    holder.once("error", reject);
  });
  const result = run(["--include-own-tree", String(port)]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /terminating tree/i);
  await new Promise((resolve) => holder.once("exit", resolve));
});

test("reports the tracked port contract and startup cleanup wiring", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  const registry = JSON.parse(readFileSync(new URL("../docs/validation/validation-tiers.json", import.meta.url)));
  for (const name of ["test-fast", "test-standard", "test-standard-plus", "test-heavy"]) {
    assert.equal(typeof packageJson.scripts[name], "string");
    assert.equal(registry.tiers.find((tier) => tier.name === name)?.command, `pnpm run ${name}`);
  }
  const replit = readFileSync(new URL("../.replit", import.meta.url), "utf8");
  for (const name of ["test-fast", "test-standard", "test-standard-plus", "test-heavy"]) {
    assert.match(replit, new RegExp(`name = "${name}"[\\s\\S]*?args = "pnpm run ${name}"`));
  }
  const api = JSON.parse(readFileSync(new URL("../artifacts/api-server/package.json", import.meta.url)));
  const studio = JSON.parse(readFileSync(new URL("../artifacts/html-port-studio/package.json", import.meta.url)));
  const canvas = JSON.parse(readFileSync(new URL("../artifacts/mockup-sandbox/package.json", import.meta.url)));
  assert.match(api.scripts.dev, /free-ports\.mjs/);
  assert.match(studio.scripts.dev, /free-ports\.mjs/);
  assert.match(canvas.scripts.dev, /free-ports\.mjs/);
  const playwright = readFileSync(new URL("../artifacts/html-port-studio/playwright.config.ts", import.meta.url), "utf8");
  assert.match(playwright, /PLAYWRIGHT_PORT/);
  assert.match(playwright, /free-ports\.mjs/);
  assert.match(playwright, /baseURL: `http:\/\/127\.0\.0\.1:\$\{port\}`/);
});