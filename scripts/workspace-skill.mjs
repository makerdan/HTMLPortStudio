#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export const PROJECTION_FORMAT = "workspace-skill-projection/v1";
export const MIRROR_METADATA_FORMAT = "workspace-skill-mirror/v1";
export const REVISION_FILE = ".workspace-revision";
export const MANIFEST_FILE = "manifest.json";
export const DEFAULT_PROJECTION_ROOT = path.join(
  ".agents",
  "skills",
  ".workspace-projections",
);
export const DEFAULT_MIRROR_ROOT = path.join(".local", "custom_skills");
export const LOCK_NAME = ".refresh-lock";
export const LOCK_STALE_MS = 5 * 60 * 1000;

const SKILL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const HELPER_NAME = /^\.(?:staging|backup)-[a-z0-9][a-z0-9-]{2,63}$/;
const OWNER_NAME = "owner.json";
const OWNER_VERSION = 1;

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export class WorkspaceSkillError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WorkspaceSkillError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new WorkspaceSkillError(code, message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeSkillId(value) {
  return typeof value === "string" && SKILL_ID.test(value);
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || !value || path.isAbsolute(value)) return false;
  const normalized = value.split(path.sep).join("/");
  return (
    normalized === value &&
    !normalized.startsWith("../") &&
    normalized !== ".." &&
    !normalized.includes("/../") &&
    !normalized.includes("//") &&
    !normalized.endsWith("/")
  );
}

function relativePath(root, absolute) {
  return path.relative(root, absolute).split(path.sep).join("/");
}

async function lstatOrNull(filePath) {
  try {
    return await fsp.lstat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function ensureDirectoryStat(stat, label) {
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
    fail("invalid-source", `${label} is not a regular directory`);
  }
}

function ensureRegularStat(stat, label) {
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    fail("invalid-source", `${label} is not a regular file`);
  }
}

async function readRevision(sourceRoot) {
  const revisionPath = path.join(sourceRoot, REVISION_FILE);
  const stat = await lstatOrNull(revisionPath);
  ensureRegularStat(stat, REVISION_FILE);
  let revision;
  try {
    revision = (await fsp.readFile(revisionPath, "utf8")).trim();
  } catch {
    fail("unavailable-source", "workspace revision is unavailable");
  }
  if (!revision || /[\u0000-\u001f\u007f]/.test(revision)) {
    fail("invalid-source", "workspace revision is malformed");
  }
  return revision;
}

async function enumerateFiles(root, current = root, files = []) {
  const entries = await fsp.readdir(current, { withFileTypes: true });
  entries.sort((a, b) => compareStrings(a.name, b.name));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    const stat = await fsp.lstat(absolute);
    if (stat.isSymbolicLink() || entry.isSymbolicLink()) {
      fail("invalid-source", "source contains a symbolic link");
    }
    if (stat.isDirectory()) {
      await enumerateFiles(root, absolute, files);
    } else if (stat.isFile()) {
      files.push(relativePath(root, absolute));
    } else {
      fail("invalid-source", "source contains a special file");
    }
  }
  files.sort(compareStrings);
  return files;
}

export function fingerprintFiles(files) {
  const hash = crypto.createHash("sha256");
  const ordered = [...files].sort((left, right) => compareStrings(left.path, right.path));
  for (const file of ordered) {
    hash.update(file.path, "utf8");
    hash.update(Buffer.from([0]));
    hash.update(String(file.bytes.byteLength), "ascii");
    hash.update(Buffer.from([0]));
    hash.update(file.bytes);
    hash.update(Buffer.from([0]));
  }
  return hash.digest("hex");
}

async function hashDirectory(root, files) {
  const entries = [];
  for (const file of files) {
    const absolute = path.join(root, file);
    const stat = await lstatOrNull(absolute);
    ensureRegularStat(stat, file);
    entries.push({ path: file, bytes: await fsp.readFile(absolute) });
  }
  return fingerprintFiles(entries);
}

async function readSourceSnapshot(sourceRoot) {
  const sourceStat = await lstatOrNull(sourceRoot);
  if (!sourceStat) fail("unavailable-source", "workspace skill source is unavailable");
  ensureDirectoryStat(sourceStat, "workspace skill source");

  let entries;
  try {
    entries = await fsp.readdir(sourceRoot, { withFileTypes: true });
  } catch {
    fail("unavailable-source", "workspace skill source is unreadable");
  }

  const revision = await readRevision(sourceRoot);
  const skills = [];
  for (const entry of entries.sort((a, b) => compareStrings(a.name, b.name))) {
    if (entry.name === REVISION_FILE) continue;
    const absolute = path.join(sourceRoot, entry.name);
    const stat = await fsp.lstat(absolute);
    if (stat.isSymbolicLink() || entry.isSymbolicLink()) {
      fail("invalid-source", "workspace skill source contains a symbolic link");
    }
    if (!stat.isDirectory()) {
      fail("invalid-source", "workspace skill source contains an unexpected entry");
    }
    if (!isSafeSkillId(entry.name)) {
      fail("invalid-source", "workspace skill source contains an invalid skill ID");
    }

    const files = await enumerateFiles(absolute);
    if (!files.includes("SKILL.md")) {
      fail("invalid-source", "workspace skill is missing SKILL.md");
    }
    const fileData = [];
    for (const file of files) {
      const filePath = path.join(absolute, file);
      const stat = await lstatOrNull(filePath);
      ensureRegularStat(stat, file);
      fileData.push({ path: file, bytes: await fsp.readFile(filePath) });
    }
    skills.push({
      id: entry.name,
      files,
      fingerprint: fingerprintFiles(fileData),
    });
  }

  skills.sort((a, b) => compareStrings(a.id, b.id));
  return { revision, skills };
}

export async function resolveWorkspaceSource(env = process.env) {
  const configured = env.WORKSPACE_SKILLS_SOURCE;
  if (typeof configured !== "string" || !configured.trim()) {
    fail("unavailable-source", "workspace skill source is not configured");
  }
  return path.resolve(configured);
}

export async function discoverWorkspaceSkills(sourceRoot) {
  const source = sourceRoot || (await resolveWorkspaceSource());
  return readSourceSnapshot(path.resolve(source));
}

function manifestFor(snapshot) {
  return {
    format: PROJECTION_FORMAT,
    sourceRevision: snapshot.revision,
    skills: snapshot.skills.map(({ id, files, fingerprint }) => ({
      id,
      files: [...files],
      fingerprint,
    })),
  };
}

export function mirrorMetadataFor(skill) {
  return {
    format: MIRROR_METADATA_FORMAT,
    skillId: skill.id,
    sourceRevision: skill.sourceRevision,
    fingerprint: skill.fingerprint,
  };
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareStrings)
        .map((key) => [key, canonicalJson(value[key])]),
    );
  }
  return value;
}

function sameJsonShape(actual, expected) {
  return JSON.stringify(canonicalJson(actual)) === JSON.stringify(canonicalJson(expected));
}

function validateManifestObject(manifest) {
  if (!isObject(manifest) || manifest.format !== PROJECTION_FORMAT) {
    fail("invalid-projection", "projection manifest is malformed");
  }
  if (typeof manifest.sourceRevision !== "string" || !manifest.sourceRevision) {
    fail("invalid-projection", "projection manifest revision is malformed");
  }
  if (!Array.isArray(manifest.skills)) {
    fail("invalid-projection", "projection manifest skills are malformed");
  }
  const ids = new Set();
  let previousId = "";
  for (const skill of manifest.skills) {
    if (!isObject(skill) || !isSafeSkillId(skill.id) || ids.has(skill.id)) {
      fail("invalid-projection", "projection manifest skill identity is malformed");
    }
    if (previousId && compareStrings(previousId, skill.id) > 0) {
      fail("invalid-projection", "projection manifest skills are not sorted");
    }
    previousId = skill.id;
    ids.add(skill.id);
    if (
      !Array.isArray(skill.files) ||
      skill.files.length === 0 ||
      !skill.files.includes("SKILL.md") ||
      !skill.files.every(isSafeRelativePath) ||
      skill.files.some((file, index) => index > 0 && compareStrings(skill.files[index - 1], file) >= 0) ||
      typeof skill.fingerprint !== "string" ||
      !SHA256.test(skill.fingerprint)
    ) {
      fail("invalid-projection", "projection manifest file list is malformed");
    }
  }
  return manifest;
}

async function readJsonFile(filePath, code) {
  const stat = await lstatOrNull(filePath);
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) fail(code, "metadata is unavailable");
  let parsed;
  try {
    parsed = JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    fail(code, "metadata is malformed");
  }
  return parsed;
}

async function listProjectionEntries(projectionRoot) {
  const entries = await fsp.readdir(projectionRoot, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    const stat = await fsp.lstat(path.join(projectionRoot, entry.name));
    if (stat.isSymbolicLink() || entry.isSymbolicLink()) {
      fail("invalid-projection", "projection contains a symbolic link");
    }
    names.push(entry.name);
  }
  return names;
}

export async function validateProjection(projectionRoot, sourceRoot) {
  const root = path.resolve(projectionRoot);
  const rootStat = await lstatOrNull(root);
  if (!rootStat) fail("invalid-projection", "projection is missing");
  ensureDirectoryStat(rootStat, "projection");
  const manifest = validateManifestObject(
    await readJsonFile(path.join(root, MANIFEST_FILE), "invalid-projection"),
  );
  const source = sourceRoot || (await resolveWorkspaceSource());
  const snapshot = await discoverWorkspaceSkills(source);
  const expected = manifestFor(snapshot);
  if (!sameJsonShape(manifest, expected)) {
    fail("stale-projection", "projection does not match the workspace source");
  }

  const expectedTopLevel = new Set([MANIFEST_FILE, ...manifest.skills.map((skill) => skill.id)]);
  const actualTopLevel = await listProjectionEntries(root);
  if (
    actualTopLevel.length !== expectedTopLevel.size ||
    actualTopLevel.some((entry) => !expectedTopLevel.has(entry))
  ) {
    fail("invalid-projection", "projection contains unexpected entries");
  }

  for (const skill of manifest.skills) {
    const skillRoot = path.join(root, skill.id);
    const skillStat = await lstatOrNull(skillRoot);
    ensureDirectoryStat(skillStat, "projected skill");
    const actualFiles = await enumerateFiles(skillRoot);
    if (!sameJsonShape(actualFiles, skill.files)) {
      fail("invalid-projection", "projected files do not match the manifest");
    }
    const fingerprint = await hashDirectory(skillRoot, actualFiles);
    if (fingerprint !== skill.fingerprint) {
      fail("invalid-projection", "projected bytes do not match the manifest");
    }
  }
  return manifest;
}

function helperPath(parent, kind, id) {
  return path.join(parent, `.${kind}-${id}`);
}

function helperNames(parent) {
  try {
    return fs.readdirSync(parent).filter((name) => HELPER_NAME.test(name));
  } catch {
    return [];
  }
}

async function removeHelperArtifact(parent, name) {
  if (!HELPER_NAME.test(name)) return;
  const target = path.join(parent, name);
  const stat = await lstatOrNull(target);
  if (stat?.isDirectory() && !stat.isSymbolicLink()) {
    await fsp.rm(target, { recursive: true, force: true });
  }
}

async function cleanupHelpers(parent, keep = new Set()) {
  for (const name of helperNames(parent)) {
    if (!keep.has(name)) await removeHelperArtifact(parent, name);
  }
}

function ownerToken() {
  return crypto.randomUUID();
}

function ownerIsLive(owner) {
  if (!isObject(owner) || owner.version !== OWNER_VERSION || typeof owner.token !== "string" || !owner.token) {
    return null;
  }
  if (!Number.isInteger(owner.pid) || owner.pid <= 0) return false;
  try {
    process.kill(owner.pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function inspectLock(lockPath) {
  const stat = await lstatOrNull(lockPath);
  if (!stat) return null;
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("busy", "workspace skill refresh is busy");
  let owner = null;
  try {
    const ownerStat = await lstatOrNull(path.join(lockPath, OWNER_NAME));
    if (ownerStat?.isFile() && !ownerStat.isSymbolicLink()) {
      owner = JSON.parse(await fsp.readFile(path.join(lockPath, OWNER_NAME), "utf8"));
    }
  } catch {
    owner = null;
  }
  return { stat, owner, live: ownerIsLive(owner) };
}

async function recoverLock(lockPath, lockState) {
  const stale =
    lockState.live === false ||
    (lockState.live === null && Date.now() - lockState.stat.mtimeMs > LOCK_STALE_MS);
  if (!stale) fail("busy", "workspace skill refresh is busy");
  const recovery = `${lockPath}.recovery-${ownerToken()}`;
  try {
    await fsp.rename(lockPath, recovery);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    fail("busy", "workspace skill refresh is busy");
  }
  const recoveryStat = await lstatOrNull(recovery);
  if (recoveryStat?.isDirectory() && !recoveryStat.isSymbolicLink()) {
    await fsp.rm(recovery, { recursive: true, force: true });
  }
  return true;
}

async function acquireLock(parent) {
  const lockPath = path.join(parent, LOCK_NAME);
  await fsp.mkdir(parent, { recursive: true });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = ownerToken();
    try {
      await fsp.mkdir(lockPath);
      try {
        await fsp.writeFile(
          path.join(lockPath, OWNER_NAME),
          stableJson({ version: OWNER_VERSION, pid: process.pid, token, acquiredAt: Date.now() }),
          { mode: 0o600 },
        );
      } catch (error) {
        await fsp.rm(lockPath, { recursive: true, force: true });
        throw error;
      }
      return async () => {
        try {
          const owner = JSON.parse(await fsp.readFile(path.join(lockPath, OWNER_NAME), "utf8"));
          if (owner.token === token) await fsp.rm(lockPath, { recursive: true, force: true });
        } catch {
          // Another owner may have recovered the lock. Never remove its work.
        }
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const lockState = await inspectLock(lockPath);
      if (!(await recoverLock(lockPath, lockState))) continue;
    }
  }
  fail("busy", "workspace skill refresh is busy");
}

async function copySourceToStage(sourceRoot, stageRoot, snapshot) {
  for (const skill of snapshot.skills) {
    for (const file of skill.files) {
      const sourceFile = path.join(sourceRoot, skill.id, file);
      const targetFile = path.join(stageRoot, skill.id, file);
      await fsp.mkdir(path.dirname(targetFile), { recursive: true });
      const stat = await lstatOrNull(sourceFile);
      ensureRegularStat(stat, file);
      await fsp.copyFile(sourceFile, targetFile);
    }
  }
  await fsp.writeFile(path.join(stageRoot, MANIFEST_FILE), stableJson(manifestFor(snapshot)));
}

async function installStage(parent, stageRoot, projectionRoot) {
  const existing = await lstatOrNull(projectionRoot);
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    fail("invalid-projection", "projection destination is not a regular directory");
  }
  const backupRoot = helperPath(parent, "backup", crypto.randomUUID());
  let movedExisting = false;
  try {
    if (existing) {
      await fsp.rename(projectionRoot, backupRoot);
      movedExisting = true;
    }
    await fsp.rename(stageRoot, projectionRoot);
  } catch (error) {
    if (movedExisting) {
      try {
        await fsp.rename(backupRoot, projectionRoot);
      } catch {
        throw new WorkspaceSkillError("rollback-failed", "projection rollback failed");
      }
    }
    throw error;
  }
  return { backupRoot, movedExisting };
}

async function rollbackInstallation(projectionRoot, transaction) {
  const installed = await lstatOrNull(projectionRoot);
  if (installed?.isDirectory() && !installed.isSymbolicLink()) {
    await fsp.rm(projectionRoot, { recursive: true, force: true });
  }
  if (transaction.movedExisting) {
    try {
      await fsp.rename(transaction.backupRoot, projectionRoot);
    } catch {
      throw new WorkspaceSkillError("rollback-failed", "projection rollback failed");
    }
  }
}

export async function projectWorkspaceSkills(options = {}) {
  const sourceRoot = path.resolve(options.sourceRoot || (await resolveWorkspaceSource()));
  const projectionRoot = path.resolve(options.projectionRoot || DEFAULT_PROJECTION_ROOT);
  const parent = path.dirname(projectionRoot);
  await fsp.mkdir(parent, { recursive: true });
  const release = await acquireLock(parent);
  let stageRoot;
  let transaction = null;
  try {
    await cleanupHelpers(parent);
    const snapshot = await discoverWorkspaceSkills(sourceRoot);
    const id = crypto.randomUUID();
    stageRoot = helperPath(parent, "staging", id);
    await fsp.mkdir(stageRoot);
    await copySourceToStage(sourceRoot, stageRoot, snapshot);
    await validateProjection(stageRoot, sourceRoot);
    const reread = await discoverWorkspaceSkills(sourceRoot);
    if (!sameJsonShape(snapshot, reread)) {
      fail("source-changed", "workspace skill source changed during refresh");
    }
    transaction = await installStage(parent, stageRoot, projectionRoot);
    stageRoot = null;
    await validateProjection(projectionRoot, sourceRoot);
    const installedSource = await discoverWorkspaceSkills(sourceRoot);
    if (!sameJsonShape(reread, installedSource)) {
      fail("source-changed", "workspace skill source changed during refresh");
    }
    const result = manifestFor(installedSource);
    const backupStat = await lstatOrNull(transaction.backupRoot);
    if (backupStat?.isDirectory() && !backupStat.isSymbolicLink()) {
      await fsp.rm(transaction.backupRoot, { recursive: true, force: true });
    }
    transaction = null;
    return result;
  } catch (error) {
    if (transaction) {
      await rollbackInstallation(projectionRoot, transaction);
      transaction = null;
    }
    throw error;
  } finally {
    if (stageRoot) {
      const stageStat = await lstatOrNull(stageRoot);
      if (stageStat?.isDirectory() && !stageStat.isSymbolicLink()) {
        await fsp.rm(stageRoot, { recursive: true, force: true });
      }
    }
    if (transaction) {
      const backupStat = await lstatOrNull(transaction.backupRoot);
      if (backupStat?.isDirectory() && !backupStat.isSymbolicLink()) {
        await fsp.rm(transaction.backupRoot, { recursive: true, force: true });
      }
    }
    await cleanupHelpers(parent);
    await release();
  }
}

export async function loadSkill(skillId, options = {}) {
  if (!isSafeSkillId(skillId)) fail("invalid-skill", "skill ID is invalid");
  const sourceRoot = path.resolve(options.sourceRoot || (await resolveWorkspaceSource()));
  const projectionRoot = path.resolve(options.projectionRoot || DEFAULT_PROJECTION_ROOT);
  const manifest = await validateProjection(projectionRoot, sourceRoot);
  const skill = manifest.skills.find((entry) => entry.id === skillId);
  if (!skill) fail("missing-skill", "requested skill is not projected");
  const bodyPath = path.join(projectionRoot, skillId, "SKILL.md");
  const bodyStat = await lstatOrNull(bodyPath);
  ensureRegularStat(bodyStat, "projected skill");
  return fsp.readFile(bodyPath, "utf8");
}

export async function mirrorStatus(skillId, options = {}) {
  if (!isSafeSkillId(skillId)) return { status: "mismatch", skill: "" };
  let snapshot;
  try {
    const sourceRoot = path.resolve(options.sourceRoot || (await resolveWorkspaceSource()));
    snapshot = await discoverWorkspaceSkills(sourceRoot);
  } catch (error) {
    if (error instanceof WorkspaceSkillError) {
      return { status: "unavailable-source", skill: skillId };
    }
    return { status: "unavailable-source", skill: skillId };
  }
  const skill = snapshot.skills.find((entry) => entry.id === skillId);
  if (!skill) return { status: "mismatch", skill: skillId };
  const mirrorRoot = path.resolve(options.mirrorRoot || DEFAULT_MIRROR_ROOT, skillId);
  const mirrorRootStat = await lstatOrNull(mirrorRoot);
  if (!mirrorRootStat) return { status: "missing-mirror", skill: skillId };
  if (!mirrorRootStat.isDirectory() || mirrorRootStat.isSymbolicLink()) {
    return { status: "mismatch", skill: skillId };
  }
  const sidecarPath = path.join(mirrorRoot, ".workspace-skill-metadata.json");
  const sidecarStat = await lstatOrNull(sidecarPath);
  if (!sidecarStat) return { status: "missing-mirror", skill: skillId };
  if (!sidecarStat.isFile() || sidecarStat.isSymbolicLink()) {
    return { status: "mismatch", skill: skillId };
  }
  let sidecar;
  try {
    sidecar = JSON.parse(await fsp.readFile(sidecarPath, "utf8"));
  } catch {
    return { status: "mismatch", skill: skillId };
  }
  const expected = mirrorMetadataFor({
    id: skillId,
    sourceRevision: snapshot.revision,
    fingerprint: skill.fingerprint,
  });
  return {
    status: sameJsonShape(sidecar, expected) ? "pass" : "mismatch",
    skill: skillId,
  };
}

function printResult(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function exitCode(status) {
  return { pass: 0, mismatch: 1, "unavailable-source": 2, "missing-mirror": 3 }[status] ?? 1;
}

async function main() {
  const [command = "project", ...args] = process.argv.slice(2);
  const skillIndex = args.indexOf("--skill");
  const skillId = skillIndex === -1 ? null : args[skillIndex + 1];
  if (command === "status") {
    if (!skillId) {
      printResult({ status: "mismatch", skill: "" });
      process.exitCode = 1;
      return;
    }
    const result = await mirrorStatus(skillId);
    printResult(result);
    process.exitCode = exitCode(result.status);
    return;
  }
  if (command === "project" || command === "refresh") {
    const manifest = await projectWorkspaceSkills();
    printResult({
      status: "projected",
      sourceRevision: manifest.sourceRevision,
      skills: manifest.skills.map(({ id, fingerprint }) => ({ id, fingerprint })),
    });
    return;
  }
  if (command === "load") {
    if (!skillId) fail("invalid-skill", "skill ID is required");
    process.stdout.write(await loadSkill(skillId));
    return;
  }
  fail("usage", "unsupported workspace skill command");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const result = {
      status: error instanceof WorkspaceSkillError ? error.code : "error",
    };
    printResult(result);
    process.exitCode = error instanceof WorkspaceSkillError && error.code === "unavailable-source" ? 2 : 1;
  });
}