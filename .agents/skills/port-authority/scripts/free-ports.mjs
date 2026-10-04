#!/usr/bin/env node
/**
 * Linux-only, cooperative TCP cleanup. No PID is authorized by its port/name.
 * Usage: node free-ports.mjs [--dry-run] [--ownership-manifest FILE]
 *        [--authorized-cleanup] [--include-own-tree] PORT...
 * Ownership manifest v1: {version:1, bootId, expiresAt, ports:[...],
 *   processes:[{pid,startTime}], authorizationReference, allowOwnTree?:true}
 * A verified host must produce and authorize this manifest. A CLI flag, JSON
 * field, or local file cannot authenticate approval against a caller editing it.
 * States: FREE=0, failed=1, invalid/production=2, busy/skipped=3, unknown=4.
 * Adapt host wiring/manifest generation with approval; do not weaken guards.
 */
import { readFileSync, readdirSync, readlinkSync, lstatSync } from "node:fs";

const output = (state, code, details = {}) => {
  console.log(JSON.stringify({ tool: "free-ports", state, ...details }));
  process.exit(code);
};
if (process.platform !== "linux") output("UNKNOWN", 4, { reason: "Linux /proc required" });
if (
  process.env.NODE_ENV === "production" ||
  process.env.REPLIT_DEPLOYMENT === "1" ||
  process.env.REPLIT_ENVIRONMENT === "production"
) output("PROHIBITED", 2, { reason: "production indicator takes precedence" });
if (process.env.FREE_PORTS_DISABLE === "1" || process.env.FREE_PORTS_RUNNING === "1") {
  output("SKIPPED", 3, { reason: "disabled/recursive; no free-port claim" });
}
const args = process.argv.slice(2);
let manifestPath, dryRun = false, action = false, includeOwn = false;
const ports = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--ownership-manifest" && args[i + 1] && !args[i + 1].startsWith("--")) manifestPath = args[++i];
  else if (a === "--dry-run") dryRun = true;
  else if (a === "--authorized-cleanup") action = true;
  else if (a === "--include-own-tree") includeOwn = true;
  else if (/^\d+$/.test(a) && Number(a) >= 1 && Number(a) <= 65535) ports.push(Number(a));
  else output("INVALID", 2, { reason: "invalid option or port" });
}
if (!ports.length || (dryRun && action)) output("INVALID", 2, { reason: "ports required; choose dry-run or action" });
if (action && !manifestPath) output("INVALID", 2, { reason: "action mode requires an ownership manifest" });
const wanted = [...new Set(ports)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function incarnation(pid) {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = raw.slice(raw.lastIndexOf(")") + 2).trim().split(/\s+/);
    const status = readFileSync(`/proc/${pid}/status`, "utf8");
    return { pid, state: fields[0], ppid: Number(fields[1]), startTime: fields[19],
      uid: Number(status.match(/^Uid:\s+(\d+)/m)?.[1]) };
  } catch (e) {
    if (e.code === "ENOENT" || e.code === "ESRCH") return null;
    throw e;
  }
}
function socketMap() {
  const tables = [readFileSync("/proc/net/tcp", "utf8")];
  try { tables.push(readFileSync("/proc/net/tcp6", "utf8")); }
  catch (e) {
    // Some Linux hosts disable IPv6 at module initialization. An absent table
    // is safe to omit ONLY with positive independent kernel capability proof.
    if (e.code !== "ENOENT" ||
        readFileSync("/sys/module/ipv6/parameters/disable", "utf8").trim() !== "1" ||
        /^\s*TCPv6\s/m.test(readFileSync("/proc/net/protocols", "utf8"))) throw e;
  }
  const byPort = new Map(wanted.map(p => [p, new Set()]));
  for (const table of tables) for (const line of table.split("\n").slice(1)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10 || cols[3] !== "0A") continue;
    const port = parseInt(cols[1].split(":").at(-1), 16);
    if (byPort.has(port)) byPort.get(port).add(cols[9]);
  }
  return byPort;
}
function inventory() {
  socketMap(); // verify discovery capability before any PID inspection
  const sockets = new Map();
  const processes = new Map();
  for (const name of readdirSync("/proc").filter(n => /^\d+$/.test(n))) {
    const pid = Number(name), info = incarnation(pid);
    if (!info) continue;
    processes.set(pid, info);
    try {
      for (const fd of readdirSync(`/proc/${pid}/fd`)) {
        try {
          const inode = readlinkSync(`/proc/${pid}/fd/${fd}`).match(/^socket:\[(\d+)\]$/)?.[1];
          if (inode) {
            if (!sockets.has(inode)) sockets.set(inode, new Set());
            sockets.get(inode).add(pid);
          }
        } catch (e) {
          if (e.code !== "ENOENT" && e.code !== "ESRCH") throw e;
        }
      }
    } catch (e) {
      // Unreadable foreign fds cannot authorize cleanup. Unmapped listener
      // inodes below produce UNKNOWN rather than a false free-port result.
      if (!["ENOENT", "ESRCH", "EACCES", "EPERM"].includes(e.code)) throw e;
    }
  }
  // Socket closure between the table snapshot and fd walk is normal during
  // shutdown. Re-read tables: vanished inodes are not unknown live listeners.
  const byPort = socketMap();
  const holders = new Set();
  for (const inodes of byPort.values()) for (const inode of inodes) {
    if (!sockets.get(inode)?.size) throw new Error("listener ownership unavailable");
    for (const pid of sockets.get(inode)) holders.add(pid);
  }
  return { byPort, processes, holders };
}
let initial;
try { initial = inventory(); } catch (e) { output("UNKNOWN", 4, { reason: e.message }); }
if (!initial.holders.size && !action) output("FREE", 0, { ports: wanted });
const holders = [...initial.holders].map(pid => initial.processes.get(pid));
if (!manifestPath) output("PROTECTED_BUSY", 3, { reason: "ownership manifest required", ports: wanted, holders });
let manifest, bootId;
try {
  if (lstatSync(manifestPath).isSymbolicLink()) throw new Error("manifest symlink rejected");
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
  if (manifest.version !== 1 || manifest.bootId !== bootId ||
      !Number.isFinite(manifest.expiresAt) || manifest.expiresAt <= Date.now() ||
      typeof manifest.authorizationReference !== "string" || !manifest.authorizationReference.trim() ||
      !Array.isArray(manifest.ports) || !wanted.every(p => manifest.ports.includes(p)) ||
      !Array.isArray(manifest.processes)) throw new Error("invalid/expired manifest scope");
} catch (e) { output("UNKNOWN", 4, { reason: e.message }); }
const targets = new Map();
for (const target of manifest.processes) {
  if (!Number.isInteger(target.pid) || target.pid <= 1 ||
      typeof target.startTime !== "string" || !/^\d+$/.test(target.startTime) ||
      targets.has(target.pid)) output("INVALID", 2, { reason: "invalid/duplicate process identity" });
  targets.set(target.pid, target);
}
const ancestors = new Set([1]);
let p = process.pid;
while (p > 1 && !ancestors.has(p)) {
  ancestors.add(p);
  const info = incarnation(p);
  if (!info) break;
  p = info.ppid;
}
function inOwnTree(pid, all) {
  const seen = new Set();
  while (pid > 1 && !seen.has(pid)) {
    seen.add(pid);
    const parent = all.get(pid)?.ppid;
    if (!parent || parent <= 1) return false;
    if (ancestors.has(parent)) return true;
    pid = parent;
  }
  return false;
}
function preflight(current) {
  if (manifest.expiresAt <= Date.now()) throw new Error("manifest expired");
  for (const pid of current.holders) if (!targets.has(pid)) throw new Error("unapproved listener");
  for (const target of targets.values()) {
    const info = current.processes.get(target.pid);
    if (!info) continue; // exact incarnation already gone
    if (info.startTime !== target.startTime || info.uid !== process.getuid() ||
        ancestors.has(target.pid)) throw new Error("changed identity, foreign uid, or caller ancestor");
    if (inOwnTree(target.pid, current.processes) && !(includeOwn && manifest.allowOwnTree === true)) {
      throw new Error("protected own tree");
    }
  }
  // No inferred wrappers and no unapproved descendant may be swept along.
  for (const info of current.processes.values()) {
    if (targets.has(info.ppid) && !targets.has(info.pid) && !["Z", "X"].includes(info.state)) {
      throw new Error("unapproved descendant");
    }
  }
}
try { preflight(initial); } catch (e) { output("PROTECTED_BUSY", 3, { reason: e.message, holders }); }
if (dryRun || !action) output("PROTECTED_BUSY", 3, { reason: "dry-run inventory; no signals sent", holders, targets: [...targets.values()] });
process.env.FREE_PORTS_RUNNING = "1";
function signalTargets(signal) {
  const current = inventory();
  preflight(current); // all-or-nothing scope check before each escalation
  for (const target of targets.values()) {
    const info = incarnation(target.pid);
    if (!info || ["Z", "X"].includes(info.state)) continue;
    if (info.startTime !== target.startTime) throw new Error("PID incarnation changed before signal");
    console.error(JSON.stringify({ incident: "authorized-process-signal", pid: target.pid, startTime: target.startTime, signal }));
    try { process.kill(target.pid, signal); } catch (e) { if (e.code !== "ESRCH") throw e; }
  }
}
function stoppedAndFree() {
  const current = inventory();
  preflight(current);
  return current.holders.size === 0 && [...targets.values()].every(t => {
    const info = current.processes.get(t.pid);
    return !info || info.startTime !== t.startTime || ["Z", "X"].includes(info.state);
  });
}
async function wait(ms) {
  const until = Date.now() + ms;
  do { if (stoppedAndFree()) return true; await sleep(50); } while (Date.now() < until);
  return stoppedAndFree();
}
try {
  signalTargets("SIGTERM");
  if (!await wait(3000)) {
    signalTargets("SIGKILL");
    if (!await wait(5000)) output("CLEANUP_FAILED", 1, { reason: "targets or listener survived" });
  }
  output("FREE", 0, { ports: wanted, verifiedTargetsStopped: true });
} catch (e) { output("UNKNOWN", 4, { reason: e.message, requiresRecovery: true }); }