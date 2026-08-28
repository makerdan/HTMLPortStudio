import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  HANDOFF_RECOVERY_STORAGE_KEY,
  createHandoffRecovery,
  isValidHandoffRecoveryMetadata,
  readHandoffRecovery,
  writeHandoffRecovery,
} from "../session-recovery.ts";
import { getAnalysisErrorPresentation } from "./analysis-error.ts";

function makeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    value: (key: string) => values.get(key) ?? null,
  };
}
test("keeps the handoff request source-only and exposes retry progress controls", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");

  assert.match(source, /const importSessionRef = useRef\(0\)/);
  assert.match(source, /const sessionId = \+\+importSessionRef\.current/);
  assert.match(source, /if \(sessionId !== importSessionRef\.current\) return;/);
  assert.match(source, /importSessionRef\.current \+= 1;\s*analyzeMutation\.reset\(\)/s);
  assert.match(source, /importSessionRef\.current \+= 1;\s*setHtmlInput\(html\)/s);
});

test("uses semantic names for reset, source, assistant, and icon actions", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");

  assert.match(source, /const importSessionRef = useRef\(0\)/);
  assert.match(source, /const sessionId = \+\+importSessionRef\.current/);
  assert.match(source, /if \(sessionId !== importSessionRef\.current\) return;/);
  assert.match(source, /importSessionRef\.current \+= 1;\s*analyzeMutation\.reset\(\)/s);
  assert.match(source, /importSessionRef\.current \+= 1;\s*setHtmlInput\(html\)/s);
});

test("uses semantic names for reset, source, assistant, and icon actions", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");

  assert.match(source, /const importSessionRef = useRef\(0\)/);
  assert.match(source, /const sessionId = \+\+importSessionRef\.current/);
  assert.match(source, /if \(sessionId !== importSessionRef\.current\) return;/);
  assert.match(source, /importSessionRef\.current \+= 1;\s*analyzeMutation\.reset\(\)/s);
  assert.match(source, /importSessionRef\.current \+= 1;\s*setHtmlInput\(html\)/s);
});

test("uses semantic names for reset, source, assistant, and icon actions", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");
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

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");

  assert.match(source, /const importSessionRef = useRef\(0\)/);
  assert.match(source, /const sessionId = \+\+importSessionRef\.current/);
  assert.match(source, /if \(sessionId !== importSessionRef\.current\) return;/);
  assert.match(source, /importSessionRef\.current \+= 1;\s*analyzeMutation\.reset\(\)/s);
  assert.match(source, /importSessionRef\.current \+= 1;\s*setHtmlInput\(html\)/s);
});

test("uses semantic names for reset, source, assistant, and icon actions", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");

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
      code: "BUNDLE_TOO_LARGE",
      error: "secret=do-not-display",
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

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");

  // Manual QA: verify import, findings/handoff, preview, and assistant at 375px;
  // verify the horizontal split and resize handle remain usable at 1440px.
  assert.match(source, /useIsMobile/);
  assert.match(source, /direction=\{isMobile \? 'vertical' : 'horizontal'\}/);
  assert.match(source, /defaultSize=\{isMobile \? 45 : 35\}/);
  assert.match(source, /defaultSize=\{isMobile \? 55 : 65\}/);
  assert.match(source, /data-\[panel-group-direction=vertical\]:cursor-row-resize/);
  assert.match(source, /md:border-r/);
});

test("keeps recovery metadata non-sensitive and session-scoped", () => {
  const storage = makeStorage({
    [HANDOFF_RECOVERY_STORAGE_KEY]: JSON.stringify({
      ...createHandoffRecovery(
        "123e4567-e89b-12d3-a456-426614174000",
        "owner-123",
        "123e4567-e89b-12d3-a456-426614174001",
        1,
      ),
      html: "<script>const token = 'secret'</script>",
    }),
  });
  const metadata = createHandoffRecovery(
    "123e4567-e89b-12d3-a456-426614174000",
    "owner-123",
    "123e4567-e89b-12d3-a456-426614174001",
  );

  assert.equal(writeHandoffRecovery(metadata, storage), true);
  const stored = storage.value(HANDOFF_RECOVERY_STORAGE_KEY);
  assert.ok(stored);
  assert.doesNotMatch(stored, /html|authorization|secret|token|credential-bearing source/i);
  assert.deepEqual(readHandoffRecovery(storage), metadata);
});

test("does not share recovery metadata between separate browser sessions", () => {
  const firstTab = makeStorage();
  const secondTab = makeStorage();
  const metadata = createHandoffRecovery(
    "123e4567-e89b-12d3-a456-426614174000",
    "owner-123",
    "123e4567-e89b-12d3-a456-426614174001",
  );
  writeHandoffRecovery(metadata, firstTab);
  assert.equal(readHandoffRecovery(secondTab), null);
});

test("discards invalid and stale recovery records instead of restoring them", () => {
  const storage = makeStorage({
    [HANDOFF_RECOVERY_STORAGE_KEY]: JSON.stringify({
      ...createHandoffRecovery(
        "123e4567-e89b-12d3-a456-426614174000",
        "owner-123",
        "123e4567-e89b-12d3-a456-426614174001",
        1,
      ),
      html: "<script>const token = 'secret'</script>",
    }),
  });

  assert.equal(readHandoffRecovery(storage, 2_000), null);
  assert.equal(storage.value(HANDOFF_RECOVERY_STORAGE_KEY), null);
  assert.equal(
    isValidHandoffRecoveryMetadata({
      version: 1,
      jobId: "123e4567-e89b-12d3-a456-426614174000",
      ownerId: "owner-123",
      browserSessionId: "123e4567-e89b-12d3-a456-426614174001",
      createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    }),
    false,
  );
});

test("exposes the reload boundary, owner reconciliation, and lifecycle cleanup", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  const importDescriptionStart = source.indexOf("<CardTitle className=\"text-2xl font-bold\">Import HTML App</CardTitle>");
  const authSource = await readFile(
    new URL("../../../../lib/replit-auth-web/src/use-auth.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /A reload does not restore imported HTML or analysis/);
  assert.match(source, /Only this signed-in handoff status can be recovered/);
  assert.match(source, /metadata\.ownerId === user\.id/);
  assert.match(source, /metadata\.browserSessionId === browserSessionId/);
  assert.match(source, /clearHandoffRecovery\(\)/);
  assert.match(source, /Starting a new source clears this recovery record/);
  assert.match(source, /replit-auth:logout/);
  assert.match(authSource, /dispatchEvent\(new Event\("replit-auth:logout"\)\)/);
});

  const poeAssistantEnd = source.indexOf("function PoeRepairPanel");

  const handoffStart = source.indexOf("function ReplitProjectHandoffPanel");

  const poeAssistantSource = source.slice(assistantStart, poeAssistantEnd);

  const mainPageStart = source.indexOf("// Main Page");

  const assistantStart = source.indexOf("function PoeAssistantPanel");

  const importDescriptionEnd = source.indexOf("</CardHeader>", importDescriptionStart);
