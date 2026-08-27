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
  assert.match(source, /first 3,000 characters/);
  assert.match(source, /No document content will be sent to Poe/);
  assert.match(source, /containsCredential/);
  assert.match(source, /documentContainsCredential/);
});

test("keeps the main import description focused on HTML and Replit compatibility", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /Paste your standalone HTML code or file to safely analyze compatibility with Replit and to preview it in a sandboxed environment\./,
  );
  assert.doesNotMatch(
    source,
    /Paste your standalone HTML file from Poe to safely analyze compatibility and preview it in a sandboxed environment\./,
  );
});

test("validates file imports before reading and preserves the existing source on rejection", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const validationIndex = source.indexOf("validateHtmlFile(file)");
  const readIndex = source.indexOf("await file.text()");

  assert.notEqual(validationIndex, -1);
  assert.notEqual(readIndex, -1);
  assert.ok(validationIndex < readIndex, "file validation must happen before file.text()");
  assert.match(source, /MAX_HTML_FILE_BYTES = 2 \* 1024 \* 1024/);
  assert.match(source, /Choose an HTML file ending in \.html or \.htm/);
  assert.match(source, /no larger than 2 MB/);
  assert.match(source, /if \(validationError\) \{\s*setFileError\(validationError\);\s*return;/s);
  assert.match(source, /event\.target\.value = ''/);
});

test("suppresses late analysis results after reset or import replacement", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /const importSessionRef = useRef\(0\)/);
  assert.match(source, /const sessionId = \+\+importSessionRef\.current/);
  assert.match(source, /if \(sessionId !== importSessionRef\.current\) return;/);
  assert.match(source, /importSessionRef\.current \+= 1;\s*analyzeMutation\.reset\(\)/s);
  assert.match(source, /importSessionRef\.current \+= 1;\s*setHtmlInput\(html\)/s);
});

test("uses semantic names for reset, source, assistant, and icon actions", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /<Button[\s\S]*?type="button"[\s\S]*?aria-label="Reset HTML Port Studio"/);
  assert.match(source, /focus-visible:ring-2 focus-visible:ring-ring/);
  assert.match(source, /<label htmlFor="html-source"/);
  assert.match(source, /id="html-source"/);
  assert.match(source, /<label htmlFor="assistant-prompt"/);
  assert.match(source, /id="assistant-prompt"/);
  assert.match(source, /aria-label="Send prompt to Poe Assistant"/);
});

test("renders a compact vertical studio composition on mobile", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  // Manual QA: verify import, findings/handoff, preview, and assistant at 375px;
  // verify the horizontal split and resize handle remain usable at 1440px.
  assert.match(source, /useIsMobile/);
  assert.match(source, /direction=\{isMobile \? 'vertical' : 'horizontal'\}/);
  assert.match(source, /defaultSize=\{isMobile \? 45 : 35\}/);
  assert.match(source, /defaultSize=\{isMobile \? 55 : 65\}/);
  assert.match(source, /data-\[panel-group-direction=vertical\]:cursor-row-resize/);
  assert.match(source, /md:border-r/);
});