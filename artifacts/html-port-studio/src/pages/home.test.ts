import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the handoff request source-only and exposes retry progress controls", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /useCreateReplitProject/);
  assert.match(source, /useGetReplitProjectConnection/);
  assert.match(source, /Set up Replit project creation/);
  assert.match(source, /I connected it — check again/);
  assert.match(source, /data:\s*\{\s*html\s*\}/);
  assert.match(source, /useGetReplitProjectStatus/);
  assert.match(source, /useRetryReplitProjectSetup/);
  assert.match(source, /Create Replit Project/);
  assert.match(source, /Retry step/);
  assert.doesNotMatch(source, /POE_API_KEY|REPLIT_PROJECT_CREATION_TOKEN/);
});

test("renders recoverable model, chat, auth, and polling failure paths", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /Could not load Poe models/);
  assert.match(source, /Retry loading models/);
  assert.match(source, /No Poe models available/);
  assert.match(source, /Your prompt is ready to retry/);
  assert.match(source, /Assistant request failed/);
  assert.match(source, /Retry request/);
  assert.match(source, /Retry status check/);
  assert.match(source, /if \(query\.state\.error\) return false/);
  assert.match(source, /Try logging in again/);
});