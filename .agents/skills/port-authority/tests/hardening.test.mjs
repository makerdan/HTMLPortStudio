import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cleanup = join(root, "scripts/free-ports.mjs");
const lock = join(root, "scripts/validation-lock.mjs");
const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
function identity(pid) {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const f = raw.slice(raw.lastIndexOf(")") + 2).trim().split(/\s+/);
    return { pid, state: f[0], startTime: f[19] };
  } catch (e) { if (e.code === "ENOENT" || e.code === "ESRCH") return null; throw e; }
}
function isAlive(p) {
  const actual = identity(p.pid);
  return actual?.startTime === p.startTime && !["Z", "X"].includes(actual.state);
}
async function until(fn, timeout = 5000) {
  const end = Date.now() + timeout;
  do { const value = fn(); if (value) return value; await sleep(15); } while (Date.now() < end);
  throw new Error("fixture wait timed out");
}
function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), "port-authority-regression-"));
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith("VALIDATION_LOCK_") || k.startsWith("FREE_PORTS_")) delete env[k];
  delete env.REPLIT_DEV_DOMAIN; delete env.REPLIT_DEPLOYMENT; delete env.REPLIT_ENVIRONMENT;
  Object.assign(env, {
    NODE_ENV: "test", VALIDATION_LOCK_FILE: join(dir, "lease"),
    VALIDATION_LOCK_WAITERS_DIR: join(dir, "waiters"),
    VALIDATION_LOCK_POLL_MS: "20", VALIDATION_LOCK_TIMEOUT_MS: "5000",
    VALIDATION_LOCK_HEARTBEAT_MS: "40", VALIDATION_LOCK_STALE_HEARTBEAT_MS: "200",
    VALIDATION_LOCK_MAX_HOLD_MS: "10000",
    VALIDATION_LOCK_STOP_GRACE_MS: "150", VALIDATION_LOCK_STOP_KILL_MS: "1000",
  });
  const jobs = new Set(), extras = [];
  function launch(script, args = [], overrides = {}, options = {}) {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...env, ...overrides }, stdio: ["ignore", "pipe", "pipe"], ...options,
    });
    let text = "";
    child.stdout.on("data", b => { text += b; });
    child.stderr.on("data", b => { text += b; });
    const task = { child, get text() { return text; }, done: null, closed: false };
    task.done = new Promise((res, rej) => {
      child.once("error", rej);
      child.once("close", code => { task.closed = true; res({ code, text }); });
    });
    jobs.add(task);
    return task;
  }
  const run = (script, args, overrides) => launch(script, args, overrides).done;
  const wrapped = (code, overrides, opts = []) => launch(lock,
    [...opts, "--", process.execPath, "-e", code], overrides);
  t.after(async () => {
    // Only fixture identities created/recorded by this isolated test are signaled.
    for (const task of jobs) if (!task.closed) task.child.kill("SIGTERM");
    await sleep(250);
    for (const task of jobs) if (!task.closed) task.child.kill("SIGKILL");
    for (const p of extras) if (isAlive(p)) process.kill(p.pid, "SIGKILL");
    await Promise.allSettled([...jobs].map(j => j.done));
    rmSync(dir, { recursive: true, force: true });
  });
  return { dir, env, launch, run, wrapped, extras };
}
async function listener(s, body = "") {
  const fixture = s.launch("-e", [
    `const n=require('node:net');const server=n.createServer();
     server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));
     ${body}`,
  ], {}, { detached: true });
  const match = await until(() => fixture.text.match(/\{"port":(\d+)\}/));
  return { task: fixture, port: Number(match[1]), identity: identity(fixture.child.pid) };
}
function manifest(s, fixtures, edits = {}) {
  const path = join(s.dir, `manifest-${randomUUID()}.json`);
  writeFileSync(path, JSON.stringify({
    version: 1, bootId, expiresAt: Date.now() + 30000,
    ports: fixtures.map(f => f.port), processes: fixtures.map(f => ({
      pid: f.identity.pid, startTime: f.identity.startTime,
    })), authorizationReference: "isolated-test-fixture-authorization",
    allowOwnTree: true, ...edits,
  }));
  return path;
}
const actionArgs = (m, port) => ["--ownership-manifest", m, "--include-own-tree", "--authorized-cleanup", String(port)];
function seedLease(s, owner, edits = {}) {
  const record = {
    version: 2, bootId, token: randomUUID(), owner, baseFile: s.env.VALIDATION_LOCK_FILE,
    resource: "global", acquiredAt: Date.now(), heartbeatAt: Date.now(),
    phase: "reserved", group: null, observed: [], ...edits,
  };
  writeFileSync(s.env.VALIDATION_LOCK_FILE, JSON.stringify(record));
  return record;
}
async function deadOwner(s) {
  const task = s.launch("-e", ["setTimeout(()=>process.exit(0),50)"]);
  const p = identity(task.child.pid);
  assert(p);
  assert.equal((await task.done).code, 0);
  assert(!isAlive(p));
  return p;
}
function overlapCode(log, label, duration) {
  return `const f=require('node:fs');const log=${JSON.stringify(log)};
    f.appendFileSync(log,JSON.stringify({label:${JSON.stringify(label)},event:'start',time:Date.now()})+'\\n');
    setTimeout(()=>f.appendFileSync(log,JSON.stringify({label:${JSON.stringify(label)},event:'end',time:Date.now()})+'\\n'),${duration});`;
}
function assertSerial(log) {
  const events = readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  let count = 0;
  for (const e of events) { count += e.event === "start" ? 1 : -1; assert(count >= 0 && count <= 1, JSON.stringify(events)); }
  assert.equal(count, 0);
}

test("skill: interfaces, independent budgets, conflict map, Failure Gate boundaries", () => {
  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: port-authority\n/);
  assert(skill.split("\n").length < 500);
  assert(skill.split("\n")[2].slice("description: ".length).length <= 1024);
  for (let i = 0; i <= 9; i++) assert(skill.includes(`## Phase ${i} (`));
  assert(skill.includes("## Independent gate — Heavy/long-running execution budgets"));
  assert(skill.includes("even a SINGLE non-conflicting suite"));
  assert(skill.includes("caller-to-resource conflict map"));
  assert(skill.includes("A composite lock does not conflict with its constituent names."));
  assert(skill.includes("necessary safety/lifecycle changes are allowed only"));
  assert(skill.includes("The adversarial acceptance matrix is mandatory"));
  assert(skill.includes("perform exactly three authorized isolation retries"));
  assert(skill.includes("A passing retry proves intermittency, not pre-existing provenance."));
  assert(skill.includes("Quarantine is a coverage change, not an ignore"));
  assert(skill.includes("Closed by owner direction—not validation passed."));
  assert(skill.includes("both runs use its checked route"));
  assert(!skill.includes("preserved byte-for-byte"));
  for (const p of ["scripts/free-ports.mjs", "scripts/validation-lock.mjs",
    "reference/runtime-contract.md", "tests/hardening.test.mjs"]) assert(existsSync(join(root, p)));
});

test("invalid inputs and production flags win over development/disable markers", async t => {
  const s = setup(t);
  for (const args of [[], ["0"], ["65536"], ["--bad"], ["abc"]]) assert.equal((await s.run(cleanup, args)).code, 2);
  for (const args of [[], ["--priority", "10", "--", "node"], ["--resource", "UPPER", "--", "node"],
    ["--resource", "../bad", "--", "node"]]) assert.equal((await s.run(lock, args)).code, 2);
  assert.equal((await s.wrapped("process.exit(0)", { VALIDATION_LOCK_POLL_MS: "0" }).done).code, 2);
  for (const marker of ["NODE_ENV", "REPLIT_DEPLOYMENT", "REPLIT_ENVIRONMENT"]) {
    const env = { [marker]: marker === "REPLIT_DEPLOYMENT" ? "1" : "production",
      REPLIT_DEV_DOMAIN: "leftover-dev", FREE_PORTS_DISABLE: "1" };
    assert.equal((await s.run(cleanup, [], env)).code, 2);
    const result = await s.wrapped("console.log('SHOULD_NOT_EXECUTE')", env).done;
    assert.equal(result.code, 2); assert(!result.text.includes("SHOULD_NOT_EXECUTE"));
  }
  for (const k of ["FREE_PORTS_DISABLE", "FREE_PORTS_RUNNING"]) {
    const result = await s.run(cleanup, ["12345"], { [k]: "1" });
    assert.equal(result.code, 3); assert.match(result.text, /SKIPPED/);
  }
});

test("unreadable socket inventories fail UNKNOWN without signals", async t => {
  const s = setup(t);
  const code = `const f=require('node:fs');const original=f.readFileSync;
    f.readFileSync=function(p,...a){if(p==='/proc/net/tcp'||p==='/proc/net/tcp6'){
    const e=new Error('fixture discovery denied');e.code='EACCES';throw e;}return original.call(this,p,...a)};
    require('node:module').syncBuiltinESMExports();process.argv=[process.execPath,${JSON.stringify(cleanup)},'12345'];
    import(require('node:url').pathToFileURL(${JSON.stringify(cleanup)}).href);`;
  const result = await s.run("-e", [code]);
  assert.equal(result.code, 4); assert.match(result.text, /UNKNOWN/);
});

test("absent IPv6 table without positive disabled-capability proof stays UNKNOWN", async t => {
  const s = setup(t);
  const code = `const f=require('node:fs');const original=f.readFileSync;
    f.readFileSync=function(p,...a){if(p==='/proc/net/tcp6'){
    const e=new Error('fixture absent table');e.code='ENOENT';throw e;}
    if(p==='/sys/module/ipv6/parameters/disable')return '0';
    return original.call(this,p,...a)};
    require('node:module').syncBuiltinESMExports();process.argv=[process.execPath,${JSON.stringify(cleanup)},'12345'];
    import(require('node:url').pathToFileURL(${JSON.stringify(cleanup)}).href);`;
  const result = await s.run("-e", [code]);
  assert.equal(result.code, 4); assert.match(result.text, /UNKNOWN/);
});

test("unused ephemeral port succeeds without a cleanup manifest", async t => {
  const s = setup(t), probe = createServer();
  await new Promise((res, rej) => { probe.once("error", rej); probe.listen(0, "127.0.0.1", res); });
  const port = probe.address().port;
  await new Promise(res => probe.close(res));
  const result = await s.run(cleanup, [String(port)]);
  assert.equal(result.code, 0, result.text); assert.match(result.text, /FREE/);
});

test("unapproved and protected-own-tree listeners are not signaled", async t => {
  const s = setup(t), f = await listener(s);
  const a = await s.run(cleanup, [String(f.port)]);
  assert.equal(a.code, 3, a.text); assert(isAlive(f.identity));
  const m = manifest(s, [f]);
  const b = await s.run(cleanup, ["--ownership-manifest", m, "--authorized-cleanup", String(f.port)]);
  assert.equal(b.code, 3); assert(isAlive(f.identity));
});

test("expired/wrong-boot/wrong-incarnation/ancestor manifests cannot signal", async t => {
  const s = setup(t), f = await listener(s);
  for (const edits of [
    { expiresAt: Date.now() - 1 }, { bootId: "not-this-boot" },
    { processes: [{ pid: f.identity.pid, startTime: "1" }] },
    { processes: [{ pid: 1, startTime: "1" }] },
    { processes: [f.identity, identity(process.pid)] },
  ]) {
    const m = manifest(s, [f], edits);
    assert.notEqual((await s.run(cleanup, actionArgs(m, f.port))).code, 0);
    assert(isAlive(f.identity));
  }
});

test("unapproved descendant blocks all cleanup signals", async t => {
  const s = setup(t), pidFile = join(s.dir, "descendant");
  const f = await listener(s, `const c=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
    require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(c.pid));`);
  await until(() => existsSync(pidFile));
  const child = await until(() => identity(Number(readFileSync(pidFile, "utf8"))));
  s.extras.push(child);
  const result = await s.run(cleanup, actionArgs(manifest(s, [f]), f.port));
  assert.equal(result.code, 3, result.text); assert.match(result.text, /unapproved descendant/);
  assert(isAlive(f.identity)); assert(isAlive(child));
});

test("dry-run changes nothing; authorized exact target stops and unrelated target survives", async t => {
  const s = setup(t), target = await listener(s), other = await listener(s);
  const m = manifest(s, [target]);
  const dry = await s.run(cleanup, ["--ownership-manifest", m, "--include-own-tree", "--dry-run", String(target.port)]);
  assert.equal(dry.code, 3, dry.text); assert(isAlive(target.identity)); assert(isAlive(other.identity));
  const result = await s.run(cleanup, actionArgs(m, target.port));
  assert.equal(result.code, 0, result.text); assert(!isAlive(target.identity)); assert(isAlive(other.identity));
  assert.match(result.text, /authorized-process-signal/);
  assert.match(result.text, /verifiedTargetsStopped/);
});

test("closing port cannot hide an authorized surviving process", async t => {
  const s = setup(t);
  const f = await listener(s, "process.on('SIGTERM',()=>server.close());setInterval(()=>{},1000);");
  const result = await s.run(cleanup, actionArgs(manifest(s, [f]), f.port));
  assert.equal(result.code, 0, result.text); assert(!isAlive(f.identity));
  assert.match(result.text, /SIGKILL/);
});

test("action manifest verifies targets even if the listener closed before invocation", async t => {
  const s = setup(t);
  const f = await listener(s, "setInterval(()=>{},1000);setTimeout(()=>server.close(()=>console.log('CLOSED')),100);");
  await until(() => f.task.text.includes("CLOSED"));
  assert(isAlive(f.identity));
  const result = await s.run(cleanup, actionArgs(manifest(s, [f]), f.port));
  assert.equal(result.code, 0, result.text); assert(!isAlive(f.identity));
  assert.match(result.text, /verifiedTargetsStopped/);
});

test("raw child statuses propagate; missing executable fails without stranded lease", async t => {
  const s = setup(t);
  for (const code of [0, 7]) {
    const result = await s.wrapped(`process.exit(${code})`).done;
    assert.equal(result.code, code, result.text); assert(!existsSync(s.env.VALIDATION_LOCK_FILE));
  }
  const failed = await s.run(lock, ["--", join(s.dir, "no-executable")]);
  assert.notEqual(failed.code, 0); assert(!existsSync(s.env.VALIDATION_LOCK_FILE), failed.text);
});

test("same-resource commands serialize; disjoint resources can overlap", async t => {
  const s = setup(t), log = join(s.dir, "events");
  const pair = [s.wrapped(overlapCode(log, "a", 250)), s.wrapped(overlapCode(log, "b", 250))];
  for (const result of await Promise.all(pair.map(p => p.done))) assert.equal(result.code, 0, result.text);
  assertSerial(log);
  const independent = join(s.dir, "independent");
  const others = [
    s.wrapped(overlapCode(independent, "a", 400), { VALIDATION_LOCK_FILE: join(s.dir, "a") }, ["--resource", "a"]),
    s.wrapped(overlapCode(independent, "b", 400), { VALIDATION_LOCK_FILE: join(s.dir, "b") }, ["--resource", "b"]),
  ];
  for (const result of await Promise.all(others.map(p => p.done))) assert.equal(result.code, 0, result.text);
  const events = readFileSync(independent, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(events[0].event, "start"); assert.equal(events[1].event, "start");
});

test("stale heartbeat/max-hold does not reclaim a live owner", async t => {
  const s = setup(t);
  const record = seedLease(s, identity(process.pid), { heartbeatAt: 1, acquiredAt: 1 });
  const result = await s.wrapped("console.log('ILLEGAL_START')", { VALIDATION_LOCK_TIMEOUT_MS: "200" }).done;
  assert.equal(result.code, 3); assert(!result.text.includes("ILLEGAL_START"));
  assert.equal(JSON.parse(readFileSync(s.env.VALIDATION_LOCK_FILE, "utf8")).token, record.token);
});

test("quiescent dead owner recovers; surviving workload blocks recovery", async t => {
  const s = setup(t), dead = await deadOwner(s);
  seedLease(s, dead);
  const recovered = await s.wrapped("process.exit(0)").done;
  assert.equal(recovered.code, 0, recovered.text);
  assert.match(recovered.text, /verified-quiescent-stale-recovery/);
  const f = await listener(s);
  seedLease(s, dead, { phase: "running", group: f.identity.pid, observed: [f.identity] });
  const blocked = await s.wrapped("console.log('ILLEGAL_START')").done;
  assert.equal(blocked.code, 4); assert(!blocked.text.includes("ILLEGAL_START"));
  assert(isAlive(f.identity)); assert(existsSync(s.env.VALIDATION_LOCK_FILE));
});

test("launch gaps, legacy/corrupt leases, and abandoned transition mutexes fail closed", async t => {
  const s = setup(t), dead = await deadOwner(s);
  seedLease(s, dead, { phase: "launching" });
  assert.equal((await s.wrapped("process.exit(0)").done).code, 4);
  seedLease(s, { ...identity(process.pid), startTime: Number(identity(process.pid).startTime) });
  assert.equal((await s.wrapped("console.log('ILLEGAL_START')").done).code, 4);
  for (const data of ["123\n456\n", "{broken-json", JSON.stringify({ version: 2 })]) {
    writeFileSync(s.env.VALIDATION_LOCK_FILE, data);
    assert.equal((await s.wrapped("process.exit(0)").done).code, 4);
    assert.equal(readFileSync(s.env.VALIDATION_LOCK_FILE, "utf8"), data);
  }
  rmSync(s.env.VALIDATION_LOCK_FILE);
  mkdirSync(`${s.env.VALIDATION_LOCK_FILE}.transition`);
  assert.equal((await s.wrapped("process.exit(0)", { VALIDATION_LOCK_TIMEOUT_MS: "150" }).done).code, 3);
});

test("PID-only and forged token/path reentry cannot bypass the lease", async t => {
  const s = setup(t);
  assert.equal((await s.wrapped("console.log('ILLEGAL_START')",
    { VALIDATION_LOCK_HELD_PID: String(process.pid) }).done).code, 4);
  const key = `VALIDATION_LOCK_CONTEXT_${createHash("sha256").update(s.env.VALIDATION_LOCK_FILE).digest("hex")}`;
  const record = seedLease(s, identity(process.pid));
  for (const entry of [
    { file: s.env.VALIDATION_LOCK_FILE, token: "wrong", owner: record.owner },
    { file: join(s.dir, "other-path"), token: record.token, owner: record.owner },
    { file: s.env.VALIDATION_LOCK_FILE, token: record.token, owner: { pid: process.pid, startTime: "1" } },
  ]) {
    const result = await s.wrapped("console.log('ILLEGAL_START')", {
      [key]: JSON.stringify({ baseFile: s.env.VALIDATION_LOCK_FILE, resource: "global", chain: [entry] }),
    }).done;
    assert.equal(result.code, 4); assert(!result.text.includes("ILLEGAL_START"));
  }
});

test("deep sequential reentry finishes; inherited-context parallel siblings serialize", async t => {
  const s = setup(t);
  const deep = s.launch(lock, ["--", process.execPath, lock, "--", process.execPath, lock,
    "--", process.execPath, "-e", "process.exit(0)"]);
  const deepResult = await deep.done;
  assert.equal(deepResult.code, 0, deepResult.text); assert.match(deepResult.text, /"nested":true/);
  const log = join(s.dir, "siblings");
  const commands = ["a", "b"].map(label => [lock, "--", process.execPath, "-e", overlapCode(log, label, 250)]);
  const parent = `const {spawn}=require('node:child_process');
    Promise.all(${JSON.stringify(commands)}.map(args=>new Promise(r=>{
      const c=spawn(process.execPath,args,{env:process.env,stdio:'inherit'});c.on('exit',r);
    }))).then(codes=>process.exit(codes.every(c=>c===0)?0:1));`;
  const result = await s.wrapped(parent).done;
  assert.equal(result.code, 0, result.text); assertSerial(log);
});

test("parent exit cleans surviving descendants and cannot become a successful run", async t => {
  const s = setup(t), pidFile = join(s.dir, "survivor");
  const descendant = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));
    process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`;
  const parent = `const c=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});
    c.unref();setTimeout(()=>process.exit(0),150);`;
  const job = s.wrapped(parent);
  await until(() => existsSync(pidFile));
  const p = await until(() => identity(Number(readFileSync(pidFile, "utf8"))));
  s.extras.push(p);
  const result = await job.done;
  assert.equal(result.code, 1, result.text); assert.match(result.text, /surviving-descendant/);
  assert(!isAlive(p)); assert(!existsSync(s.env.VALIDATION_LOCK_FILE));
});

test("cancellation holds exclusion until resistant child stops", async t => {
  const s = setup(t), pidFile = join(s.dir, "resistant");
  const code = `process.on('SIGTERM',()=>{});setInterval(()=>{},1000);
    require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));`;
  const first = s.wrapped(code);
  const p = await until(() => existsSync(pidFile) && identity(Number(readFileSync(pidFile, "utf8"))));
  s.extras.push(p);
  const check = `const f=require('node:fs');let live=false;
    try {const r=f.readFileSync('/proc/${p.pid}/stat','utf8').split(') ')[1].split(' ');
      live=r[19]===${JSON.stringify(p.startTime)}&&!['Z','X'].includes(r[0]);}catch{}
    if(live)throw new Error('OVERLAP');`;
  const second = s.wrapped(check);
  first.child.kill("SIGTERM");
  const [a, b] = await Promise.all([first.done, second.done]);
  assert.equal(a.code, 1, a.text); assert.equal(b.code, 0, b.text);
  assert(!isAlive(p)); assert(!existsSync(s.env.VALIDATION_LOCK_FILE));
});

test("execution budget stops owned work before replacement", async t => {
  const s = setup(t), pidFile = join(s.dir, "budget-child");
  const first = s.wrapped(`process.on('SIGTERM',()=>{});setInterval(()=>{},1000);
    require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));`, { VALIDATION_LOCK_MAX_HOLD_MS: "250" });
  const p = await until(() => existsSync(pidFile) && identity(Number(readFileSync(pidFile, "utf8"))));
  s.extras.push(p);
  const next = s.wrapped(`try {const f=require('node:fs').readFileSync('/proc/${p.pid}/stat','utf8').split(') ')[1].split(' ');
    if(f[19]===${JSON.stringify(p.startTime)}&&!['Z','X'].includes(f[0]))throw new Error('OVERLAP');
    }catch(e){if(e.message==='OVERLAP')throw e;}`);
  const [a, b] = await Promise.all([first.done, next.done]);
  assert.equal(a.code, 1, a.text); assert.match(a.text, /execution-budget/);
  assert.equal(b.code, 0, b.text); assert(!isAlive(p));
});