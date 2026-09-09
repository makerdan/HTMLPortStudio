#!/usr/bin/env node
/**
 * Reliably free TCP ports before starting a server.
 *
 * This command is intentionally dependency-free. It discovers listeners by
 * socket inode rather than process name, protects its caller tree, removes
 * stale wrapper trees, and verifies that each port is released.
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
  (process.env.NODE_ENV === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1" ||
    process.env.REPLIT_ENVIRONMENT === "production")
) {
  console.error("free-ports: refusing to run in production.");
  process.exit(2);
}
process.env.FREE_PORTS_RUNNING = "1";

const rawArgv = process.argv.slice(2);
// pnpm appends the conventional separator when forwarding package arguments.
const argv = rawArgv[0] === "--" ? rawArgv.slice(1) : rawArgv;
const includeOwnTree = argv.includes("--include-own-tree");
const unknownFlags = argv.filter(
  (arg) => arg.startsWith("--") && arg !== "--include-own-tree",
);
const positional = argv.filter((arg) => !arg.startsWith("--"));
if (unknownFlags.length > 0) {
  console.error(`free-ports: unknown option(s): ${unknownFlags.join(", ")}`);
  process.exit(2);
}
if (
  positional.length === 0 ||
  positional.some((arg) => !/^\d+$/.test(arg)) ||
  positional.some((arg) => Number(arg) < 1 || Number(arg) > 65535)
) {
  console.error("Usage: free-ports.mjs [--include-own-tree] <port> [<port>...]");
  process.exit(2);
}
const ports = [...new Set(positional.map(Number))];

/** Return the process command name and parent, or null if it exited. */
function statOf(pid) {
  let raw;
  try {
    raw = readFileSync(`/proc/${pid}/stat`, "utf8");
  } catch {
    return null;
  }
  const close = raw.lastIndexOf(")");
  const comm = raw.slice(raw.indexOf("(") + 1, close);
  const rest = raw.slice(close + 2).split(" ");
  return { comm, ppid: Number(rest[1]) };
}

/** Use argv[0] when Nix reports Node's comm as MainThread. */
function execNameOf(pid) {
  try {
    const cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf8");
    const argv0 = cmdline.split("\0")[0];
    if (argv0) return argv0.split("/").pop();
  } catch {
    // The process may have exited between the stat and cmdline reads.
  }
  return statOf(pid)?.comm ?? "";
}

function allPids() {
  return readdirSync("/proc").filter((name) => /^\d+$/.test(name)).map(Number);
}

/** Return socket inodes for TCP4 and TCP6 listeners on a port. */
function listeningInodes(port) {
  const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
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
      if (columns.length < 10) continue;
      const [, localAddress, , state] = columns;
      if (state === "0A" && localAddress.endsWith(`:${hexPort}`)) {
        inodes.add(columns[9]);
      }
    }
  }
  return inodes;
}

/** Find every process holding a socket inode that is listening on the port. */
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
      let link;
      try {
        link = readlinkSync(`/proc/${pid}/fd/${fd}`);
      } catch {
        continue;
      }
      const socket = link.match(/^socket:\[(\d+)\]$/);
      if (socket && inodes.has(socket[1])) {
        holders.push(pid);
        break;
      }
    }
  }
  return holders;
}

/** Ancestors of this cleanup process, including the cleanup process itself. */
function selfAncestors() {
  const ancestors = new Set();
  let pid = process.pid;
  while (pid > 1 && !ancestors.has(pid)) {
    ancestors.add(pid);
    const stat = statOf(pid);
    if (!stat) break;
    pid = stat.ppid;
  }
  ancestors.add(1);
  return ancestors;
}

const PROTECTED = selfAncestors();

/** Whether a holder is a descendant of the current run's process tree. */
function isOwnedByProtected(pid) {
  let current = pid;
  for (let depth = 0; depth < 64; depth += 1) {
    const stat = statOf(current);
    if (!stat) return false;
    const parent = stat.ppid;
    if (parent <= 1) return false;
    if (PROTECTED.has(parent)) return true;
    current = parent;
  }
  return false;
}

const WRAPPER_COMMS = new Set([
  "node",
  "sh",
  "bash",
  "dash",
  "pnpm",
  "npm",
  "npx",
  "tsx",
  "vite",
  "esbuild",
]);

function isWrapper(pid) {
  const stat = statOf(pid);
  return Boolean(
    stat && (WRAPPER_COMMS.has(stat.comm) || WRAPPER_COMMS.has(execNameOf(pid))),
  );
}

/** Climb only known script-runner wrappers, stopping at protected ancestors. */
function treeRootOf(pid) {
  let current = pid;
  for (let depth = 0; depth < 32; depth += 1) {
    const stat = statOf(current);
    if (!stat) return current;
    const parent = stat.ppid;
    if (parent <= 1 || PROTECTED.has(parent)) return current;
    if (!isWrapper(parent)) return current;
    current = parent;
  }
  return current;
}

/** Snapshot descendants so the whole wrapper tree can be signaled. */
function subtreeOf(root) {
  const children = new Map();
  for (const pid of allPids()) {
    const stat = statOf(pid);
    if (!stat) continue;
    if (!children.has(stat.ppid)) children.set(stat.ppid, []);
    children.get(stat.ppid).push(pid);
  }
  const descendants = [];
  const queue = [root];
  while (queue.length > 0) {
    const pid = queue.pop();
    descendants.push(pid);
    for (const child of children.get(pid) ?? []) queue.push(child);
  }
  return descendants;
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function signalAll(pids, signal) {
  for (const pid of pids) {
    if (PROTECTED.has(pid)) continue;
    try {
      process.kill(pid, signal);
    } catch {
      // A process can exit between discovery and signaling.
    }
  }
}

async function waitPortFree(port, timeoutMs) {
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
    if (PROTECTED.has(holder)) {
      console.error(`free-ports: refusing to kill own ancestor pid ${holder} holding port ${port}.`);
      return false;
    }
    if (!includeOwnTree && isOwnedByProtected(holder)) {
      console.log(
        `free-ports: port ${port} held by pid ${holder}, which belongs to this run's own process tree — leaving it alone.`,
      );
      continue;
    }
    for (const pid of subtreeOf(treeRootOf(holder))) {
      if (!PROTECTED.has(pid)) victims.add(pid);
    }
  }

  if (victims.size === 0) return true;

  console.log(
    `free-ports: port ${port} held by pid(s) ${holders.join(", ")} — terminating tree (${victims.size} process(es)).`,
  );
  signalAll(victims, "SIGTERM");
  if (await waitPortFree(port, 3_000)) return true;

  console.log(`free-ports: port ${port} still bound after SIGTERM grace — escalating to SIGKILL.`);
  signalAll(victims, "SIGKILL");
  if (await waitPortFree(port, 5_000)) return true;

  console.error(`free-ports: FAILED to free port ${port}.`);
  return false;
}

let ok = true;
for (const port of ports) {
  // Serial cleanup avoids races when ports share a supervising wrapper.
  ok = (await freePort(port)) && ok;
}
process.exit(ok ? 0 : 1);