import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const script = fileURLToPath(new URL("./free-ports.mjs", import.meta.url));
const PORT_CONTRACT = {
  api: { port: 8080, artifact: "artifacts/api-server/.replit-artifact/artifact.toml" },
  studio: {
    port: 23332,
    artifact: "artifacts/html-port-studio/.replit-artifact/artifact.toml",
  },
  canvas: {
    port: 8081,
    artifact: "artifacts/mockup-sandbox/.replit-artifact/artifact.toml",
  },
  playwright: { port: 5173 },
};

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

async function waitForHealth(url, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`API process exited before health check with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        await response.arrayBuffer();
      } else if (
        response.headers.get("content-type")?.includes("application/json") &&
        (await response.json()).status === "ok"
      ) {
        return;
      } else {
        await response.arrayBuffer();
      }
    } catch {
      // The service may still be compiling or binding its listener.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function terminate(child) {
  if (child.exitCode === null) child.kill("SIGTERM");
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

test("restarts the API after reclaiming its stale listener", async () => {
  execFileSync("pnpm", ["--filter", "@workspace/api-server", "run", "build"], {
    cwd: root,
    stdio: "ignore",
  });
  const port = await unusedPort();
  const stale = spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
    cwd: `${root}/artifacts/api-server`,
    env: { ...process.env, NODE_ENV: "development", PORT: String(port) },
    stdio: "ignore",
  });
  try {
    await waitForHealth(`http://127.0.0.1:${port}/api/healthz`, stale);
    const cleanup = run(["--include-own-tree", String(port)]);
    assert.equal(cleanup.status, 0, cleanup.stderr);
    await new Promise((resolve) => stale.once("exit", resolve));

    const restarted = spawn(
      process.execPath,
      ["--enable-source-maps", "dist/index.mjs"],
      {
        cwd: `${root}/artifacts/api-server`,
        env: { ...process.env, NODE_ENV: "development", PORT: String(port) },
        stdio: "ignore",
      },
    );
    try {
      await waitForHealth(`http://127.0.0.1:${port}/api/healthz`, restarted);
    } finally {
      terminate(restarted);
      await new Promise((resolve) => restarted.once("exit", resolve));
    }
  } finally {
    terminate(stale);
  }
});

test("reports the tracked port contract and startup cleanup wiring", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  for (const name of ["test-fast", "test-standard", "test-standard-plus", "test-heavy", "production-build"]) {
    assert.equal(typeof packageJson.scripts[name], "string");
  }
  const replit = readFileSync(new URL("../.replit", import.meta.url), "utf8");
  assert.match(replit, /^\[workflows\]\s*runButton = "Project"$/m);
  const workflowBlocks = replit
    .split(/(?=^\[\[workflows\.workflow\]\]$)/m)
    .filter((block) => /^\[\[workflows\.workflow\]\]\s*$/m.test(block));
  const workflowBlock = (name) => {
    const block = workflowBlocks.find((candidate) => new RegExp(`^name = "${name}"$`, "m").test(candidate));
    assert.ok(block, `Expected the ${name} workflow to remain defined`);
    return block;
  };
  const projectBlock = workflowBlock("Project");
  const projectTasks = [...projectBlock.matchAll(/^\s*task = "([^"]+)"\s*\n\s*args = "([^"]+)"\s*$/gm)]
    .map(([, task, args]) => [task, args])
    .sort(([leftTask, leftArgs], [rightTask, rightArgs]) =>
      `${leftTask}:${leftArgs}`.localeCompare(`${rightTask}:${rightArgs}`),
    );
  assert.deepEqual(projectTasks, [
    ["workflow.run", "artifacts/api-server: API Server"],
    ["workflow.run", "artifacts/html-port-studio: web"],
  ]);
  assert.doesNotMatch(projectBlock, /test-standard|api-validation|Canvas|mockup-sandbox/);
  for (const [name, command] of [
    ["test-standard", "pnpm run test-standard"],
    ["api-validation", "pnpm run validate:api"],
  ]) {
    const block = workflowBlock(name);
    assert.match(block, new RegExp(`task = "shell\\.exec"\\s*\\n\\s*args = "${command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  for (const name of ["test-fast", "test-standard", "test-standard-plus", "test-heavy", "production-build"]) {
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
  assert.match(playwright, /const serverUrl = `http:\/\/127\.0\.0\.1:\$\{port\}`/);
  assert.match(playwright, /baseURL: serverUrl/);
  assert.match(playwright, /url: `\$\{serverUrl\}\/api\/healthz`/);

  for (const { port, artifact } of Object.values(PORT_CONTRACT)) {
    if (!artifact) continue;
    const toml = readFileSync(new URL(`../${artifact}`, import.meta.url), "utf8");
    assert.match(toml, new RegExp(`localPort = ${port}\\b`));
    assert.match(toml, new RegExp(`PORT = "${port}"`));
  }
  assert.match(
    readFileSync(new URL("../artifacts/api-server/src/index.ts", import.meta.url), "utf8"),
    /Number\.isInteger\(port\).*port > 65535/s,
  );
  for (const configPath of [
    "../artifacts/html-port-studio/vite.config.ts",
    "../artifacts/mockup-sandbox/vite.config.ts",
  ]) {
    assert.match(
      readFileSync(new URL(configPath, import.meta.url), "utf8"),
      /Number\.isInteger\(port\).*port > 65535/s,
    );
  }
  assert.match(
    readFileSync(new URL("../artifacts/api-server/src/routes/health.ts", import.meta.url), "utf8"),
    /router\.get\("\/healthz"/,
  );
  assert.match(
    readFileSync(new URL("../artifacts/api-server/.replit-artifact/artifact.toml", import.meta.url), "utf8"),
    /path = "\/api\/healthz"/,
  );
});
