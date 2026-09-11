import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const cleanupScript = fileURLToPath(
  new URL("../../../scripts/free-ports.mjs", import.meta.url),
);

test.describe.configure({ mode: "serial" });

async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  expect(address && typeof address !== "string").toBe(true);
  const port = (address as { port: number }).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

function startListener(port: number) {
  return spawn(
    process.execPath,
    ["-e", `require("node:net").createServer().listen(${port}, "127.0.0.1")`],
    {
      cwd: workspaceRoot,
      stdio: "ignore",
    },
  );
}

async function waitForListener(
  child: ReturnType<typeof startListener>,
  port: number,
) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`listener exited with code ${child.exitCode}`);
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({ host: "127.0.0.1", port });
        socket.once("connect", () => socket.end(() => resolve()));
        socket.once("error", reject);
      });
      return;
    } catch {
      // The child may still be binding its listener.
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("timed out waiting for listener");
}

async function waitForExit(child: ReturnType<typeof startListener>) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => child.once("exit", () => resolve()));
}

function runCleanup(port: number, includeOwnTree = false) {
  return spawn(
    process.execPath,
    [
      cleanupScript,
      ...(includeOwnTree ? ["--include-own-tree"] : []),
      String(port),
    ],
    {
      cwd: workspaceRoot,
      stdio: "ignore",
    },
  );
}

async function runCleanupAndWait(port: number, includeOwnTree = false) {
  const cleanup = runCleanup(port, includeOwnTree);
  await waitForExit(cleanup);
  expect(cleanup.exitCode).toBe(0);
}

test("reclaims a stale listener before a replacement starts", async () => {
  const port = await unusedPort();
  const stale = startListener(port);
  try {
    await waitForListener(stale, port);
    await runCleanupAndWait(port, true);
    await waitForExit(stale);

    const replacement = startListener(port);
    try {
      await waitForListener(replacement, port);
    } finally {
      replacement.kill("SIGTERM");
      await waitForExit(replacement);
    }
  } finally {
    if (stale.exitCode === null) stale.kill("SIGTERM");
    await waitForExit(stale);
  }
});

test("does not terminate a listener owned by the current process tree", async () => {
  const port = await unusedPort();
  const currentRun = startListener(port);
  try {
    await waitForListener(currentRun, port);
    await runCleanupAndWait(port);
    expect(currentRun.exitCode).toBeNull();
  } finally {
    currentRun.kill("SIGTERM");
    await waitForExit(currentRun);
  }
});

test("reuses a port after an interrupted server exits", async () => {
  const port = await unusedPort();
  const interrupted = startListener(port);
  try {
    await waitForListener(interrupted, port);
    interrupted.kill("SIGKILL");
    await waitForExit(interrupted);

    const restarted = startListener(port);
    try {
      await waitForListener(restarted, port);
    } finally {
      if (restarted.exitCode === null && restarted.signalCode === null) {
        restarted.kill("SIGTERM");
      }
      await waitForExit(restarted);
    }
  } finally {
    if (interrupted.exitCode === null && interrupted.signalCode === null) {
      interrupted.kill("SIGTERM");
    }
    await waitForExit(interrupted);
  }
});
