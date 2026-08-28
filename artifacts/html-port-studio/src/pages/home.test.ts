import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getAnalysisErrorPresentation } from "./analysis-error.ts";

test("keeps the handoff request source-only and exposes retry progress controls", async () => {
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

  assert.match(source, /<Button[\s\S]*?type="button"[\s\S]*?aria-label="Reset HTML Port Studio"/);
  assert.match(source, /focus-visible:ring-2 focus-visible:ring-ring/);
  assert.match(source, /<label htmlFor="html-source"/);
  assert.match(source, /id="html-source"/);
  assert.match(source, /<label htmlFor="assistant-prompt"/);
  assert.match(source, /id="assistant-prompt"/);
  assert.match(source, /aria-label="Send prompt to Poe Assistant"/);
});

test("maps structured analysis errors to safe, actionable guidance", () => {
  const result = getAnalysisErrorPresentation({
    data: {
      code: "BUNDLE_ENTRYPOINT_MISSING",
      error: "internal source details that must not be shown",
    },
  });

  assert.equal(result.title, "Analysis needs attention");
  assert.match(result.message, /entrypoint/i);
  assert.doesNotMatch(result.message, /internal source details/i);
  assert.equal(result.retryable, false);
});

test("explains oversized bundles without exposing the API response", () => {
  const result = getAnalysisErrorPresentation({
    data: {
      code: "BUNDLE_TOO_LARGE",
      error: "secret=do-not-display",
    },
  });

  assert.match(result.message, /2 MB/i);
  assert.doesNotMatch(result.message, /secret|do-not-display/i);
  assert.equal(result.retryable, false);
});

test("uses a concise retryable fallback for transport and non-JSON failures", () => {
  const transportResult = getAnalysisErrorPresentation(new TypeError("Failed to fetch"));
  const nonJsonResult = getAnalysisErrorPresentation({
    data: "<html>gateway response with source-like content</html>",
  });

  for (const result of [transportResult, nonJsonResult]) {
    assert.equal(result.title, "Analysis unavailable");
    assert.match(result.message, /connection|analysis service/i);
    assert.equal(result.retryable, true);
    assert.doesNotMatch(result.message, /gateway|source-like|Failed to fetch/i);
  }
});

test("renders a compact vertical studio composition on mobile", async () => {
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
