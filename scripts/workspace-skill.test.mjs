import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  MIRROR_METADATA_FORMAT,
  WorkspaceSkillError,
  discoverWorkspaceSkills,
  fingerprintFiles,
  mirrorMetadataFor,
  mirrorStatus,
  projectWorkspaceSkills,
  loadSkill,
  validateProjection,
} from "./workspace-skill.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-skill-"));
  const sourceRoot = path.join(root, "workspace-source");
  const projectionRoot = path.join(root, "project", ".agents", "skills", ".workspace-projections");
  const mirrorRoot = path.join(root, "mirror");
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.writeFile(path.join(sourceRoot, ".workspace-revision"), "opaque-revision\n");
  await fs.mkdir(path.join(sourceRoot, "alpha-skill", "references"), { recursive: true });
  await fs.writeFile(path.join(sourceRoot, "alpha-skill", "SKILL.md"), "private instruction\n");
  await fs.writeFile(path.join(sourceRoot, "alpha-skill", "references", "nested.txt"), "nested bytes\n");
  return { root, sourceRoot, projectionRoot, mirrorRoot };
}

async function cleanup(root) {
  await fs.rm(root, { recursive: true, force: true });
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof WorkspaceSkillError && error.code === code);
}

test("projects recursively and preserves the opaque revision and byte fingerprint", async () => {
  const paths = await fixture();
  try {
    const result = await projectWorkspaceSkills(paths);
    assert.equal(result.sourceRevision, "opaque-revision");
    assert.deepEqual(result.skills.map((skill) => skill.id), ["alpha-skill"]);
    const manifest = await validateProjection(paths.projectionRoot, paths.sourceRoot);
    assert.deepEqual(manifest.skills[0].files, ["SKILL.md", "references/nested.txt"]);
    assert.equal(manifest.skills[0].fingerprint.length, 64);
    assert.equal(await loadSkill("alpha-skill", paths), "private instruction\n");
    const nested = await fs.readFile(path.join(paths.projectionRoot, "alpha-skill", "references", "nested.txt"), "utf8");
    assert.equal(nested, "nested bytes\n");
  } finally {
    await cleanup(paths.root);
  }
});

test("projecting an empty source creates a valid empty manifest", async () => {
  const paths = await fixture();
  try {
    await fs.rm(path.join(paths.sourceRoot, "alpha-skill"), { recursive: true });
    await projectWorkspaceSkills(paths);
    const manifest = await validateProjection(paths.projectionRoot, paths.sourceRoot);
    assert.deepEqual(manifest.skills, []);
  } finally {
    await cleanup(paths.root);
  }
});

test("rejects malformed skill IDs, missing SKILL.md, symlinks, and special source entries", async (t) => {
  const cases = [
    ["BadSkill", async (root) => fs.mkdir(path.join(root, "BadSkill"))],
    ["missing SKILL.md", async (root) => fs.mkdir(path.join(root, "missing"))],
    ["symlink", async (root) => {
      await fs.mkdir(path.join(root, "linked"));
      await fs.symlink(path.join(root, ".workspace-revision"), path.join(root, "linked", "link"));
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const paths = await fixture();
      try {
        await fs.rm(path.join(paths.sourceRoot, "alpha-skill"), { recursive: true });
        await mutate(paths.sourceRoot);
        await expectCode(discoverWorkspaceSkills(paths.sourceRoot), "invalid-source");
      } finally {
        await cleanup(paths.root);
      }
    });
  }
});

test("rejects a stale or tampered projection and never loads old bytes", async () => {
  const paths = await fixture();
  try {
    await projectWorkspaceSkills(paths);
    await fs.writeFile(path.join(paths.sourceRoot, ".workspace-revision"), "new-revision");
    await expectCode(loadSkill("alpha-skill", paths), "stale-projection");
    await fs.writeFile(path.join(paths.sourceRoot, ".workspace-revision"), "opaque-revision");
    await fs.writeFile(path.join(paths.projectionRoot, "alpha-skill", "SKILL.md"), "tampered");
    await expectCode(loadSkill("alpha-skill", paths), "invalid-projection");
  } finally {
    await cleanup(paths.root);
  }
});

test("preserves project-authored skills outside the generated projection", async () => {
  const paths = await fixture();
  const authored = path.join(paths.root, "project", ".agents", "skills", "authored");
  try {
    await fs.mkdir(authored, { recursive: true });
    await fs.writeFile(path.join(authored, "SKILL.md"), "do not overwrite\n");
    await projectWorkspaceSkills(paths);
    assert.equal(await fs.readFile(path.join(authored, "SKILL.md"), "utf8"), "do not overwrite\n");
  } finally {
    await cleanup(paths.root);
  }
});

test("recovers an abandoned lock but keeps a live lock busy", async () => {
  const paths = await fixture();
  const lock = path.join(path.dirname(paths.projectionRoot), ".refresh-lock");
  try {
    await fs.mkdir(lock, { recursive: true });
    await fs.writeFile(path.join(lock, "owner.json"), JSON.stringify({ version: 1, pid: 999999, token: "dead" }));
    await projectWorkspaceSkills(paths);
    assert.equal(await fs.readFile(path.join(paths.projectionRoot, "alpha-skill", "SKILL.md"), "utf8"), "private instruction\n");

    await fs.mkdir(lock, { recursive: true });
    await fs.writeFile(path.join(lock, "owner.json"), JSON.stringify({ version: 1, pid: process.pid, token: "live" }));
    await expectCode(projectWorkspaceSkills(paths), "busy");
  } finally {
    await cleanup(paths.root);
  }
});

test("mirror status is read-only and returns all documented outcomes", async () => {
  const paths = await fixture();
  try {
    const missing = await mirrorStatus("alpha-skill", paths);
    assert.deepEqual(missing, { status: "missing-mirror", skill: "alpha-skill" });
    await fs.mkdir(path.join(paths.mirrorRoot, "alpha-skill"), { recursive: true });
    const mismatch = await mirrorStatus("alpha-skill", paths);
    assert.deepEqual(mismatch, { status: "missing-mirror", skill: "alpha-skill" });

    const snapshot = await discoverWorkspaceSkills(paths.sourceRoot);
    await fs.writeFile(
      path.join(paths.mirrorRoot, "alpha-skill", ".workspace-skill-metadata.json"),
      JSON.stringify({ format: MIRROR_METADATA_FORMAT, skillId: "alpha-skill", sourceRevision: "wrong", fingerprint: snapshot.skills[0].fingerprint }),
    );
    assert.deepEqual(await mirrorStatus("alpha-skill", paths), { status: "mismatch", skill: "alpha-skill" });
    await fs.writeFile(
      path.join(paths.mirrorRoot, "alpha-skill", ".workspace-skill-metadata.json"),
      JSON.stringify(mirrorMetadataFor({
        id: "alpha-skill",
        sourceRevision: snapshot.revision,
        fingerprint: snapshot.skills[0].fingerprint,
      })),
    );
    assert.deepEqual(await mirrorStatus("alpha-skill", paths), { status: "pass", skill: "alpha-skill" });

    await fs.rm(paths.sourceRoot, { recursive: true });
    assert.deepEqual(await mirrorStatus("alpha-skill", paths), { status: "unavailable-source", skill: "alpha-skill" });
    assert.deepEqual(await mirrorStatus("../private", paths), { status: "mismatch", skill: "" });
  } finally {
    await cleanup(paths.root);
  }
});

test("status never reads mirror bodies or mutates mirror metadata", async () => {
  const paths = await fixture();
  try {
    await fs.mkdir(path.join(paths.mirrorRoot, "alpha-skill"), { recursive: true });
    const snapshot = await discoverWorkspaceSkills(paths.sourceRoot);
    const sidecar = path.join(paths.mirrorRoot, "alpha-skill", ".workspace-skill-metadata.json");
    await fs.writeFile(sidecar, JSON.stringify(mirrorMetadataFor({
      id: "alpha-skill",
      sourceRevision: snapshot.revision,
      fingerprint: snapshot.skills[0].fingerprint,
    })));
    await fs.writeFile(path.join(paths.mirrorRoot, "alpha-skill", "SKILL.md"), "mirror body must not be loaded");
    const before = await fs.readFile(sidecar, "utf8");
    assert.deepEqual(await mirrorStatus("alpha-skill", paths), { status: "pass", skill: "alpha-skill" });
    assert.equal(await fs.readFile(sidecar, "utf8"), before);
  } finally {
    await cleanup(paths.root);
  }
});

test("fingerprints include sorted relative paths, byte lengths, and bytes", () => {
  const one = fingerprintFiles([{ path: "SKILL.md", bytes: Buffer.from("a") }]);
  const two = fingerprintFiles([{ path: "SKILL.md", bytes: Buffer.from("aa") }]);
  const reordered = fingerprintFiles([
    { path: "refs/x", bytes: Buffer.from("b") },
    { path: "SKILL.md", bytes: Buffer.from("a") },
  ]);
  const sorted = fingerprintFiles([
    { path: "SKILL.md", bytes: Buffer.from("a") },
    { path: "refs/x", bytes: Buffer.from("b") },
  ]);
  assert.notEqual(one, two);
  assert.equal(reordered, sorted);
});