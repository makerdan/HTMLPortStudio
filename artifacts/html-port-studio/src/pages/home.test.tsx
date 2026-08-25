import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the handoff request source-only and exposes retry progress controls", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /useCreateReplitProject/);
  assert.match(source, /data:\s*\{\s*html\s*\}/);
  assert.match(source, /useGetReplitProjectStatus/);
  assert.match(source, /useRetryReplitProjectSetup/);
  assert.match(source, /Create Replit Project/);
  assert.match(source, /Retry step/);
  assert.doesNotMatch(source, /POE_API_KEY|REPLIT_PROJECT_CREATION_TOKEN/);
});