import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { decideGitSyncRecovery } from "./git-sync-recovery.mjs";

function git(directory, ...args) {
  const result = spawnSync("git", args, {
    cwd: directory,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function createFixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "git-sync-recovery-"),
  );
  git(directory, "init", "--initial-branch=main");
  git(directory, "config", "user.name", "Git Sync Recovery Test");
  git(directory, "config", "user.email", "git-sync-recovery@example.invalid");

  fs.writeFileSync(path.join(directory, "base.txt"), "base\n");
  git(directory, "add", "base.txt");
  git(directory, "commit", "-m", "base");
  const base = git(directory, "rev-parse", "HEAD");

  fs.writeFileSync(path.join(directory, "local.txt"), "local\n");
  git(directory, "add", "local.txt");
  git(directory, "commit", "-m", "local-only");
  const local = git(directory, "rev-parse", "HEAD");

  git(directory, "branch", "remote-main", base);
  git(directory, "switch", "remote-main");
  fs.writeFileSync(path.join(directory, "remote.txt"), "remote\n");
  git(directory, "add", "remote.txt");
  git(directory, "commit", "-m", "remote-only");
  const remote = git(directory, "rev-parse", "HEAD");
  git(directory, "switch", "main");

  return {
    directory,
    base,
    local,
    remote,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

test("divergent recovery preserves both histories and never selects force push", () => {
  const fixture = createFixture();
  try {
    const plan = decideGitSyncRecovery({
      remoteAuthenticated: true,
      localIsAncestorOfRemote: false,
      remoteIsAncestorOfLocal: false,
    });
    assert.equal(plan.action, "reconcile-divergent-history");
    assert.equal(plan.pushMode, "none");
    assert.equal(plan.preservesRemoteHistory, true);

    git(fixture.directory, "merge", "--no-edit", "remote-main");
    const reconciled = git(fixture.directory, "rev-parse", "HEAD");
    assert.equal(
      git(
        fixture.directory,
        "merge-base",
        "--is-ancestor",
        fixture.local,
        reconciled,
      ),
      "",
    );
    assert.equal(
      git(
        fixture.directory,
        "merge-base",
        "--is-ancestor",
        fixture.remote,
        reconciled,
      ),
      "",
    );
    assert.equal(
      git(fixture.directory, "show", `${reconciled}:local.txt`),
      "local",
    );
    assert.equal(
      git(fixture.directory, "show", `${reconciled}:remote.txt`),
      "remote",
    );
    assert.equal(
      git(fixture.directory, "show", `${fixture.remote}:remote.txt`),
      "remote",
    );
  } finally {
    fixture.cleanup();
  }
});

test("remote-ahead recovery stops for reconciliation instead of force pushing", () => {
  const plan = decideGitSyncRecovery({
    remoteAuthenticated: true,
    localIsAncestorOfRemote: true,
    remoteIsAncestorOfLocal: false,
  });
  assert.equal(plan.action, "reconcile-remote-ahead");
  assert.equal(plan.pushMode, "none");
  assert.equal(plan.preservesRemoteHistory, true);
});

test("local-ahead recovery permits only a normal push", () => {
  const plan = decideGitSyncRecovery({
    remoteAuthenticated: true,
    localIsAncestorOfRemote: false,
    remoteIsAncestorOfLocal: true,
  });
  assert.equal(plan.action, "normal-push");
  assert.equal(plan.pushMode, "normal");
  assert.equal(plan.preservesRemoteHistory, true);
});

test("rejected authentication stops before any push mode is selected", () => {
  const plan = decideGitSyncRecovery({
    remoteAuthenticated: false,
    localIsAncestorOfRemote: false,
    remoteIsAncestorOfLocal: false,
  });
  assert.equal(plan.action, "blocked-authentication");
  assert.equal(plan.pushMode, "none");
  assert.equal(plan.preservesRemoteHistory, true);
});
