#!/usr/bin/env node
/**
 * Linux/local-filesystem cooperative validation lease v2.
 * node validation-lock.mjs [--resource lowercase-name] [--priority 1-9] -- CMD...
 * Named locks (including "global") are independent, not hierarchical.
 * Env: VALIDATION_LOCK_FILE, VALIDATION_LOCK_WAITERS_DIR, *_POLL_MS,
 * *_TIMEOUT_MS (queue only), *_HEARTBEAT_MS, *_STALE_HEARTBEAT_MS,
 * *_MAX_HOLD_MS (execution), *_STOP_GRACE_MS, *_STOP_KILL_MS.
 * Reentry uses verified token/incarnation/path context, plus a nested sibling
 * slot. Legacy PID variables are never authorization. No command arguments
 * are logged. Unknown lifecycle/corrupt leases/abandoned transition mutexes
 * block and retain evidence for host-authorized recovery.
 * Commands must not daemonize or escape supervision. This is neither Failure
 * Gate's task single-flight/evidence system nor protection from malicious code.
 */
import {
  readFileSync, readdirSync, mkdirSync, rmdirSync, unlinkSync, openSync,
  closeSync, writeFileSync, fsyncSync, renameSync, lstatSync, realpathSync,
} from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";

const fail = (message, code = 4) => {
  console.error(JSON.stringify({ tool: "validation-lock", state: "BLOCKED", reason: message }));
  process.exit(code);
};
if (process.platform !== "linux") fail("Linux process-incarnation discovery required", 2);
if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" ||
    process.env.REPLIT_ENVIRONMENT === "production") fail("production indicator takes precedence", 2);
function ms(name, fallback) {
  const n = Number(process.env[`VALIDATION_LOCK_${name}`] ?? fallback);
  if (!Number.isSafeInteger(n) || n <= 0) fail(`invalid ${name}`, 2);
  return n;
}
const pollMs = ms("POLL_MS", 100);
const queueMs = ms("TIMEOUT_MS", 3 * 60 * 60 * 1000);
const heartbeatMs = ms("HEARTBEAT_MS", 1000);
const staleMs = ms("STALE_HEARTBEAT_MS", 10000);
const maxHoldMs = ms("MAX_HOLD_MS", 2 * 60 * 60 * 1000);
const graceMs = ms("STOP_GRACE_MS", 3000);
const killMs = ms("STOP_KILL_MS", 5000);
const priorityGraceMs = ms("PRIORITY_GRACE_MS", 2000);
if (staleMs <= heartbeatMs) fail("stale heartbeat must exceed heartbeat interval", 2);
const args = process.argv.slice(2), sep = args.indexOf("--");
if (sep < 0 || sep === args.length - 1) fail("command after -- required", 2);
let resource = "global", priority = 5;
for (let i = 0; i < sep; i++) {
  if (args[i] === "--resource" && i + 1 < sep) resource = args[++i];
  else if (args[i] === "--priority" && i + 1 < sep && /^[1-9]$/.test(args[i + 1])) priority = Number(args[++i]);
  else fail("invalid option", 2);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(resource)) fail("resource must be lowercase alphanumeric/hyphen", 2);
const command = args.slice(sep + 1);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requested = resolve(process.env.VALIDATION_LOCK_FILE ??
  join(projectRoot, ".local", `validation-lock-${resource}.lock`));
mkdirSync(dirname(requested), { recursive: true, mode: 0o700 });
const baseFile = join(realpathSync(dirname(requested)), requested.split("/").at(-1));
const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
function proc(pid) {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const f = raw.slice(raw.lastIndexOf(")") + 2).trim().split(/\s+/);
    return { pid, state: f[0], ppid: Number(f[1]), pgrp: Number(f[2]),
      session: Number(f[3]), startTime: f[19] };
  } catch (e) {
    if (e.code === "ENOENT" || e.code === "ESRCH") return null;
    throw e;
  }
}
const self = proc(process.pid);
const same = (a, b) => a && b && a.pid === b.pid && a.startTime === b.startTime;
const alive = identity => {
  const actual = proc(identity.pid);
  return same(actual, identity) && !["Z", "X"].includes(actual.state);
};
function allProcesses() {
  return readdirSync("/proc").filter(n => /^\d+$/.test(n)).map(n => proc(Number(n))).filter(Boolean);
}
function ancestor(identity) {
  let current = self, seen = new Set();
  while (current && current.pid > 1 && !seen.has(current.pid)) {
    if (same(current, identity)) return current.pid !== self.pid;
    seen.add(current.pid);
    current = proc(current.ppid);
  }
  return false;
}
function readLease(path) {
  try {
    if (lstatSync(path).isSymbolicLink()) throw new Error("lease symlink rejected");
    const r = JSON.parse(readFileSync(path, "utf8"));
    if (r.version !== 2 || r.bootId !== bootId ||
        !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(r.token) ||
        !Number.isInteger(r.owner?.pid) || r.owner.pid <= 1 ||
        typeof r.owner.startTime !== "string" || !/^\d+$/.test(r.owner.startTime) ||
        r.baseFile !== baseFile || r.resource !== resource ||
        !Array.isArray(r.observed) || !["reserved", "launching", "running", "finished"].includes(r.phase) ||
        !Number.isFinite(r.heartbeatAt) || r.heartbeatAt <= 0 ||
        !Number.isFinite(r.acquiredAt) || r.acquiredAt <= 0 ||
        (r.group !== null && (!Number.isInteger(r.group) || r.group <= 1)) ||
        (r.phase === "running" && r.group === null) ||
        r.observed.some(p => !Number.isInteger(p.pid) || p.pid <= 1 ||
          typeof p.startTime !== "string" || !/^\d+$/.test(p.startTime))) {
      throw new Error("invalid, foreign-boot, or incompatible lease");
    }
    return r;
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
// Path identity, not a normalized resource name, is the reentry key.
const contextKey = `VALIDATION_LOCK_CONTEXT_${createHash("sha256").update(baseFile).digest("hex")}`;
let context, lockFile = baseFile;
if (process.env[contextKey]) {
  try {
    context = JSON.parse(process.env[contextKey]);
    if (context.baseFile !== baseFile || context.resource !== resource ||
        !Array.isArray(context.chain) || !context.chain.length || context.chain.length > 64) throw new Error("invalid context binding");
    for (let i = 0; i < context.chain.length; i++) {
      const entry = context.chain[i];
      const expectedFile = i === 0 ? baseFile : `${baseFile}.nested-${context.chain[i - 1].token}`;
      if (entry.file !== expectedFile) throw new Error("invalid nested path");
      const lease = readLease(entry.file);
      if (!lease || lease.token !== entry.token || !same(lease.owner, entry.owner) ||
          !ancestor(entry.owner) || !alive(entry.owner)) throw new Error("unverified reentry lease/ancestor");
    }
    lockFile = `${baseFile}.nested-${context.chain.at(-1).token}`;
  } catch (e) { fail(e.message); }
} else {
  const key = `VALIDATION_LOCK_HELD_PID_${resource.toUpperCase().replaceAll("-", "_")}`;
  if (process.env[key] || (resource === "global" && process.env.VALIDATION_LOCK_HELD_PID)) {
    fail("legacy PID-only reentry rejected; verified v2 context required");
  }
}
const transitionDir = `${lockFile}.transition`;
const transitionToken = randomUUID();
function guarded(fn) {
  try { mkdirSync(transitionDir, { mode: 0o700 }); }
  catch (e) { if (e.code === "EEXIST") return { busy: true }; throw e; }
  try {
    writeFileSync(join(transitionDir, "owner.json"), JSON.stringify({ token: transitionToken, owner: self }), { mode: 0o600 });
    return { value: fn() };
  } finally {
    // Never steal an abandoned mutex: uncertain interrupted transitions require
    // an authorized host recovery with contenders stopped, not a timed unlink.
    try {
      const owner = JSON.parse(readFileSync(join(transitionDir, "owner.json"), "utf8"));
      if (owner.token === transitionToken) {
        unlinkSync(join(transitionDir, "owner.json"));
        rmdirSync(transitionDir);
      }
    } catch { /* preserve uncertain state */ }
  }
}
function durableWrite(path, record, exclusive = false) {
  const temp = exclusive ? path : `${path}.write-${record.token}`;
  const fd = openSync(temp, exclusive ? "wx" : "w", 0o600);
  try { writeFileSync(fd, JSON.stringify(record)); fsyncSync(fd); } finally { closeSync(fd); }
  if (!exclusive) renameSync(temp, path);
  const dirFd = openSync(dirname(path), "r");
  try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
}
function workloadAlive(record, processes = allProcesses()) {
  if (record.phase === "launching" && !record.group) throw new Error("interrupted launch: child identity unknown");
  if (record.group && !Number.isInteger(record.group)) throw new Error("invalid workload group");
  return processes.some(p => !["Z", "X"].includes(p.state) &&
    ((record.group && p.pgrp === record.group && p.session === record.group) ||
      record.observed.some(old => same(p, old))));
}
const waitersDir = resolve(process.env.VALIDATION_LOCK_WAITERS_DIR ??
  `${lockFile}.waiters`);
mkdirSync(waitersDir, { recursive: true, mode: 0o700 });
const waiterFile = join(waitersDir, `${process.pid}-${self.startTime}.json`);
const enqueuedAt = Date.now();
writeFileSync(waiterFile, JSON.stringify({ owner: self, priority, enqueuedAt, lockFile }), { mode: 0o600 });
const deregister = () => { try { unlinkSync(waiterFile); } catch { /* absent */ } };
function yieldPriority() {
  for (const file of readdirSync(waitersDir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const w = JSON.parse(readFileSync(join(waitersDir, file), "utf8"));
      if (w.lockFile === lockFile && w.priority < priority &&
          Date.now() - w.enqueuedAt > priorityGraceMs && alive(w.owner)) return true;
    } catch { /* priority is advisory; manifests never grant ownership */ }
  }
  return false;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lease, child, stopReason, cancelled = false, released = false;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => { cancelled = true; stopReason ??= signal; });
}
process.on("exit", deregister);
try {
  while (!cancelled && Date.now() - enqueuedAt < queueMs) {
    if (yieldPriority()) { await sleep(pollMs); continue; }
    const result = guarded(() => {
      const old = readLease(lockFile);
      if (old) {
        if (alive(old.owner)) return false; // age/heartbeat never authorizes takeover
        if (workloadAlive(old)) throw new Error("dead supervisor has surviving workload; recovery required");
        console.error(JSON.stringify({ incident: "verified-quiescent-stale-recovery", token: old.token }));
        unlinkSync(lockFile); // all cooperating transitions use this same mutex
      }
      lease = { version: 2, bootId, token: randomUUID(), owner: self, baseFile, resource,
        acquiredAt: Date.now(), heartbeatAt: Date.now(), phase: "reserved", group: null, observed: [] };
      durableWrite(lockFile, lease, true);
      return true;
    });
    if (result.value) break;
    await sleep(pollMs);
  }
  deregister();
  if (!lease || cancelled) {
    if (lease) guarded(() => { if (readLease(lockFile)?.token === lease.token) unlinkSync(lockFile); });
    fail(cancelled ? "cancelled while queued" : "queue timeout; no takeover of live/uncertain ownership", cancelled ? 1 : 3);
  }
  // Revalidate every inherited lease after queueing, before child dispatch.
  if (context) for (const entry of context.chain) {
    const current = readLease(entry.file);
    if (!current || current.token !== entry.token || !alive(entry.owner)) throw new Error("parent lease changed while queued");
  }
  const transition = async fn => {
    const until = Date.now() + Math.max(1000, graceMs);
    do {
      const r = guarded(fn);
      if (!r.busy) return r.value;
      await sleep(Math.min(pollMs, 25));
    } while (Date.now() < until);
    throw new Error("transition interrupted/busy; lifecycle cannot be recorded");
  };
  const mutate = () => transition(() => {
    if (readLease(lockFile)?.token !== lease.token) throw new Error("lease ownership changed");
    durableWrite(lockFile, lease);
  });
  const chain = [...(context?.chain ?? []), { file: lockFile, token: lease.token, owner: self }];
  const env = { ...process.env, [contextKey]: JSON.stringify({ baseFile, resource, chain }) };
  // Do not export PID-only reentry authority.
  const legacyKey = `VALIDATION_LOCK_HELD_PID_${resource.toUpperCase().replaceAll("-", "_")}`;
  delete env[legacyKey];
  if (resource === "global") delete env.VALIDATION_LOCK_HELD_PID;
  lease.phase = "launching"; await mutate(); // crash in launch gap must remain blocked
  console.log(JSON.stringify({ tool: "validation-lock", state: "ACQUIRED", resource,
    nested: Boolean(context), token: lease.token, queueWaitMs: Date.now() - enqueuedAt }));
  child = spawn(command[0], command.slice(1), { detached: true, stdio: "inherit", env });
  let exitCode = null, childSignal = null, spawnError = null, ended = false;
  child.on("error", e => { spawnError = e; ended = true; });
  child.on("exit", (code, signal) => { exitCode = code; childSignal = signal; ended = true; });
  if (Number.isInteger(child.pid)) {
    lease.group = child.pid;
    const identity = proc(child.pid);
    if (identity) lease.observed.push(identity);
    lease.phase = "running"; await mutate();
  } else {
    // spawn() failed before creating a child; no unknown launch is inferred.
    await sleep(0);
    if (!spawnError) throw new Error("launch outcome unknown");
    lease.phase = "finished"; await mutate();
  }
  let lastHeartbeat = Date.now(), stoppingAt = null, killedAt = null;
  function discover() {
    const processes = allProcesses();
    const known = new Set(lease.observed.filter(alive).map(p => p.pid));
    let added = true;
    while (added) {
      added = false;
      for (const p of processes) if (!["Z", "X"].includes(p.state) &&
          ((lease.group && p.pgrp === lease.group && p.session === lease.group) || known.has(p.ppid))) {
        if (!lease.observed.some(old => same(old, p))) { lease.observed.push(p); added = true; }
        known.add(p.pid);
      }
    }
    return processes;
  }
  function signalOwned(signal, processes) {
    for (const old of lease.observed) {
      const now = processes.find(p => same(p, old));
      if (!now || ["Z", "X"].includes(now.state)) continue;
      const fresh = proc(now.pid);
      if (!same(fresh, old)) throw new Error("process incarnation changed before signal");
      console.error(JSON.stringify({ incident: "owned-workload-signal", pid: old.pid, startTime: old.startTime, signal }));
      try { process.kill(old.pid, signal); } catch (e) { if (e.code !== "ESRCH") throw e; }
    }
  }
  while (true) {
    const processes = discover(), active = workloadAlive(lease, processes);
    if (Date.now() - lastHeartbeat >= heartbeatMs || active) {
      lease.heartbeatAt = Date.now(); await mutate(); lastHeartbeat = Date.now();
    }
    if (ended && !active) break;
    if (Date.now() - lease.acquiredAt >= maxHoldMs) stopReason ??= "execution-budget";
    if (ended && active) stopReason ??= "surviving-descendant";
    if (stopReason && stoppingAt === null) {
      stoppingAt = Date.now();
      signalOwned("SIGTERM", processes);
    }
    if (stoppingAt !== null && killedAt === null && Date.now() - stoppingAt >= graceMs) {
      killedAt = Date.now();
      signalOwned("SIGKILL", processes);
    }
    if (killedAt !== null && Date.now() - killedAt >= killMs && active) {
      throw new Error("owned workload not confirmed stopped; lease retained");
    }
    await sleep(Math.min(pollMs, 50));
  }
  lease.phase = "finished"; lease.heartbeatAt = Date.now(); await mutate();
  await transition(() => {
    if (readLease(lockFile)?.token !== lease.token || workloadAlive(lease)) throw new Error("unsafe release");
    unlinkSync(lockFile);
    released = true;
  });
  if (!released) throw new Error("release transition unavailable; lease retained");
  const status = stopReason || spawnError || childSignal ? 1 : exitCode ?? 1;
  console.log(JSON.stringify({ tool: "validation-lock", state: status === 0 ? "FINISHED" : "FAILED",
    rawExitCode: exitCode, signal: childSignal, reason: stopReason ?? (spawnError ? "spawn-failed" : null),
    workloadStopped: true, token: lease.token }));
  process.exit(status);
} catch (e) {
  // A malformed or interrupted lease remains for verified recovery. Do not
  // turn an evidence/lifecycle gap into an unlocked successful validation.
  deregister();
  fail(e.message);
}