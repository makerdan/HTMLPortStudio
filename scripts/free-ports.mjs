#!/usr/bin/env node
/**
 * Free development TCP ports without external utilities.
 *
 * Port numbers are required explicitly. The script discovers listeners through
 * /proc socket inodes, protects its own caller tree, terminates stale wrapper
 * trees with SIGTERM before SIGKILL, and verifies that every requested port is
 * free before succeeding.
 *
 * Environment guards:
 *   FREE_PORTS_DISABLE=1  - skip the sweep
 *   FREE_PORTS_RUNNING=1  - prevent recursive execution
 *
 * `--include-own-tree` is reserved for serialized cleanup between validation
 * steps, when a stale child may still be attached to the current supervisor.
 */
import { readFileSync, readdirSync, readlinkSync } from "node:fs";

if (process.env.FREE_PORTS_DISABLE === "1") {
  console.log("free-ports: FREE_PORTS_DISABLE=1 — skipping sweep.");
  process.exit(0);
}
if (process.env.FREE_PORTS_RUNNING === "1") {
  console.log("free-ports: already running in an ancestor process — skipping sweep.");
  process.exit(0);
}
const isDevelopmentWorkspace = Boolean(process.env.REPLIT_DEV_DOMAIN);
if (
  !isDevelopmentWorkspace &&
  (
    process.env.NODE_ENV === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1" ||
    process.env.REPLIT_ENVIRONMENT === "production"
  )
) {
  console.error("free-ports: refusing to run in production.");
  process.exit(2);
}
process.env.FREE_PORTS_RUNNING = "1";

const args = process.argv.slice(2);
const includeOwnTree = args.includes("--include-own-tree");
const unknownFlags = args.filter((arg) => arg.startsWith("--") && arg !== "--include-own-tree");
const positional = args.filter((arg) => !arg.startsWith("--"));
if (
  unknownFlags.length > 0 ||
  positional.length === 0 ||
  positional.some((arg) => !/^\d+$/.test(arg)) ||
  positional.some((arg) => Number(arg) < 1 || Number(arg) > 65535)
) {
  if (unknownFlags.length > 0) {
    console.error(`free-ports: unknown option(s): ${unknownFlags.join(", ")}`);
  }
  console.error("Usage: free-ports.mjs [--include-own-tree] <port> [<port>...]");
  process.exit(2);
}
const ports = [...new Set(positional.map(Number))];

function statOf(pid) {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = raw.lastIndexOf(")");
    const fields = raw.slice(close + 2).split(" ");
    return {
      comm: raw.slice(raw.indexOf("(") + 1, close),
      ppid: Number(fields[1]),
    };
  } catch {
    return null;
  }
}

function execNameOf(pid) {
  try {
    const argv0 = readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0")[0];
    if (argv0) return argv0.split("/").pop();
  } catch {
    // The process may have exited between /proc reads.
  }
  return statOf(pid)?.comm ?? "";
}

function allPids() {
  try {
    return readdirSync("/proc").filter((entry) => /^\d+$/.test(entry)).map(Number);
  } catch {
    return [];
  }
}

function listeningInodes(port) {
  const portHex = port.toString(16).toUpperCase().padStart(4, "0");
  const inodes = new Set();
  for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n").slice(1)) {
      const columns = line.trim().split(/\s+/);
      if (columns.length < 10 || columns[3] !== "0A") continue;
      if (columns[1].endsWith(`:${portHex}`)) inodes.add(columns[9]);
    }
  }
  return inodes;
}

function listenersOf(port) {
  const inodes = listeningInodes(port);
  if (inodes.size === 0) return [];
  const holders = [];
  for (const pid of allPids()) {
    let fds;
    try {
      fds = readdirSync(`/proc/${pid}/fd`);
    } catch {
      continue;
    }
    for (const fd of fds) {
      try {
        const link = readlinkSync(`/proc/${pid}/fd/${fd}`);
        const match = link.match(/^socket:\[(\d+)\]$/);
        if (match && inodes.has(match[1])) {
          holders.push(pid);
          break;
        }
      } catch {
        // The fd can disappear while the process is being inspected.
      }
    }
  }
  return holders;
}

const protectedPids = new Set();
for (let pid = process.pid; pid > 1 && !protectedPids.has(pid); ) {
  protectedPids.add(pid);
  const stat = statOf(pid);
  if (!stat) break;
  pid = stat.ppid;
}
protectedPids.add(1);

const wrapperNames = new Set([
  "bash", "dash", "esbuild", "node", "npm", "npx", "pnpm", "sh", "tsx", "vite",
]);
function isWrapper(pid) {
  const stat = statOf(pid);
  return Boolean(stat && (wrapperNames.has(stat.comm) || wrapperNames.has(execNameOf(pid))));
}

function belongsToCallerTree(pid) {
  let current = pid;
  for (let depth = 0; depth < 64; depth += 1) {
    const stat = statOf(current);
    if (!stat || stat.ppid <= 1) return false;
    if (protectedPids.has(stat.ppid)) return true;
    current = stat.ppid;
  }
  return false;
}

function treeRootOf(pid) {
  let current = pid;
  for (let depth = 0; depth < 32; depth += 1) {
    const stat = statOf(current);
    if (!stat || stat.ppid <= 1 || protectedPids.has(stat.ppid) || !isWrapper(stat.ppid)) {
      return current;
    }
    current = stat.ppid;
  }
  return current;
}

function subtreeOf(root) {
  const children = new Map();
  for (const pid of allPids()) {
    const stat = statOf(pid);
    if (!stat) continue;
    const list = children.get(stat.ppid) ?? [];
    list.push(pid);
    children.set(stat.ppid, list);
  }
  const result = [];
  const pending = [root];
  while (pending.length > 0) {
    const pid = pending.pop();
    result.push(pid);
    pending.push(...(children.get(pid) ?? []));
  }
  return result;
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function signalAll(pids, signal) {
  for (const pid of pids) {
    if (protectedPids.has(pid)) continue;
    try {
      process.kill(pid, signal);
    } catch {
      // The process can exit between discovery and signaling.
    }
  }
}

async function waitForPortFree(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (listeningInodes(port).size === 0) return true;
    await sleep(150);
  }
  return listeningInodes(port).size === 0;
}

async function freePort(port) {
  const holders = listenersOf(port);
  if (holders.length === 0) {
    if (listeningInodes(port).size > 0) {
      console.error(`free-ports: port ${port} is LISTENing but no owning process is visible.`);
      return false;
    }
    return true;
  }

  const victims = new Set();
  for (const holder of holders) {
    if (protectedPids.has(holder)) {
      console.error(`free-ports: refusing to kill caller ancestor pid ${holder} holding port ${port}.`);
      return false;
    }
    if (!includeOwnTree && belongsToCallerTree(holder)) {
      console.log(`free-ports: port ${port} belongs to this run's process tree — leaving it alone.`);
      continue;
    }
    for (const pid of subtreeOf(treeRootOf(holder))) {
      if (!protectedPids.has(pid)) victims.add(pid);
    }
  }
  if (victims.size === 0) return true;

  console.log(
    `free-ports: port ${port} held by pid(s) ${holders.join(", ")} — terminating tree (${victims.size} process(es)).`,
  );
  signalAll(victims, "SIGTERM");
  if (await waitForPortFree(port, 3_000)) return true;

  console.log(`free-ports: port ${port} still bound after SIGTERM grace — escalating to SIGKILL.`);
  signalAll(victims, "SIGKILL");
  if (await waitForPortFree(port, 5_000)) return true;
  console.error(`free-ports: FAILED to free port ${port}.`);
  return false;
}

let success = true;
for (const port of ports) {
  // Do not kill overlapping wrapper trees concurrently.
  success = (await freePort(port)) && success;
}
process.exit(success ? 0 : 1);