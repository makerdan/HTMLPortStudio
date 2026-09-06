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
import {
  getStudioErrorMessage,
  PROJECT_HANDOFF_FAILURE_FALLBACK,
  PROJECT_HANDOFF_RECOVERY_EXPIRED,
  STUDIO_ERROR_MESSAGES,
} from "./studio-error.ts";
import {
  ApiError,
  ResponseParseError,
} from "../../../../lib/api-client-react/src/custom-fetch.ts";
import {
  CREDENTIAL_REDACTION_PLACEHOLDER,
  containsCredential,
  redactCredentialBundle,
  redactCredentialSource,
  sanitizeUntrustedRepairText,
} from "../lib/credential-safety.ts";

function makeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    value: (key: string) => values.get(key) ?? null,
  };
}

test("keeps source requests scoped to the current import", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /const importSessionRef = useRef\(0\)/);
  assert.match(source, /const sessionId = \+\+importSessionRef\.current/);
  assert.match(source, /if \(sessionId !== importSessionRef\.current\) return;/);
  assert.match(source, /importSessionRef\.current \+= 1;\s*analyzeMutation\.reset\(\)/s);
  assert.match(source, /importSessionRef\.current \+= 1;\s*setHtmlInput\(html\)/s);
  assert.match(source, /<label htmlFor="html-source"/);
  assert.match(source, /<label htmlFor="assistant-prompt"/);
});

test("resets the GitHub import mutation when starting over", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const resetStart = source.indexOf("const handleReset = () =>");
  const resetEnd = source.indexOf("const handleFileSelect", resetStart);
  const resetHandler = source.slice(resetStart, resetEnd);

  assert.notEqual(resetStart, -1);
  assert.notEqual(resetEnd, -1);
  assert.match(resetHandler, /importSessionRef\.current \+= 1/);
  assert.match(resetHandler, /githubImportMutation\.reset\(\)/);
});

test("validates HTML files before reading their contents", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const validationIndex = source.indexOf("validateHtmlFile(file)");
  const readIndex = source.indexOf("await file.text()");

  assert.notEqual(validationIndex, -1);
  assert.notEqual(readIndex, -1);
  assert.ok(validationIndex < readIndex);
  assert.match(source, /SOURCE_TEXT_MAX_BYTES/);
  assert.match(source, /new TextEncoder\(\)\.encode\(value\)\.length/);
  assert.match(source, /Choose an HTML file ending in \.html or \.htm/);
  assert.match(source, /no larger than \$\{SOURCE_TEXT_LIMIT_LABEL\}/);
  assert.match(source, /if \(validationError\) \{\s*setFileError\(validationError\);\s*return;/s);
  assert.match(source, /event\.target\.value = ''/);
});

test("provides a recoverable copy action for every Gemini response", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /message\.role === 'assistant'/);
  assert.match(source, /aria-label=\{[\s\S]*'Copy response'/);
  assert.match(source, /navigator\.clipboard\?\.writeText/);
  assert.match(source, /await navigator\.clipboard\.writeText\(content\)/);
  assert.match(source, /Response copied to clipboard\./);
  assert.match(source, /Could not copy response\. Try again\./);
  assert.match(source, /onClick=\{\(\) => void handleCopyResponse\(index, message\.content\)\}/);
});

test("keeps Gemini copy isolated from imported source and analysis", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const copyHandlerStart = source.indexOf("const handleCopyResponse");
  const copyHandlerEnd = source.indexOf("if (!open) return null;", copyHandlerStart);
  const copyHandler = source.slice(copyHandlerStart, copyHandlerEnd);

  assert.notEqual(copyHandlerStart, -1);
  assert.notEqual(copyHandlerEnd, -1);
  assert.doesNotMatch(copyHandler, /setHtmlInput|setSourceBundle|setAnalysisData|handleAnalyze|analyzeMutation/);
});

test("maps structured analysis errors to safe, actionable guidance", () => {
  const result = getAnalysisErrorPresentation({
    data: {
      code: "BUNDLE_ENTRYPOINT_MISSING",
      error: "internal source details that must not be shown",
    },
  });

  assert.equal(result.title, "Analysis needs attention");
  assert.equal(result.code, "BUNDLE_ENTRYPOINT_MISSING");
  assert.match(result.message, /entrypoint/i);
  assert.doesNotMatch(result.message, /internal source details/i);
  assert.equal(result.retryable, false);
});

test("offers a safe temporary rename for unsafe uploaded HTML paths", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const handlerStart = source.indexOf("const handleRenameUnsafeHtmlFile");
  const handlerEnd = source.indexOf("const bundleWithEntrypointSource", handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);
  const errorBlockStart = source.indexOf("{analyzeMutation.isError && (");
  const errorBlockEnd = source.indexOf("{analyzeMutation.isError && repairSource", errorBlockStart);
  const errorBlock = source.slice(errorBlockStart, errorBlockEnd);

  assert.notEqual(handlerStart, -1);
  assert.notEqual(handlerEnd, -1);
  assert.match(handler, /sourceType !== 'single_file'/);
  assert.match(handler, /const safePath = 'index\.html'/);
  assert.match(handler, /submitBundleForAnalysis\(nextBundle, \{ requestRevision: nextRevision \}\)/);
  assert.match(errorBlock, /analysisError\?\.code === 'BUNDLE_UNSAFE_PATH'/);
  assert.match(errorBlock, /Rename File/);
});

test("renders actionable analysis failures in the visible alert", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const errorBlockStart = source.indexOf("{analyzeMutation.isError && (");
  const errorBlockEnd = source.indexOf("{analyzeMutation.isError && repairSource", errorBlockStart);
  const errorBlock = source.slice(errorBlockStart, errorBlockEnd);

  assert.notEqual(errorBlockStart, -1);
  assert.notEqual(errorBlockEnd, -1);
  assert.match(errorBlock, /<Alert variant="destructive"/);
  assert.match(errorBlock, /<AlertTitle>\{analysisError\?\.title/);
  assert.match(errorBlock, /<AlertDescription>/);
  assert.match(errorBlock, /\{analysisError\?\.message\}/);
  assert.match(errorBlock, /Retry analysis/);
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

test("uses concise retryable fallbacks for analysis transport and non-JSON failures", () => {
  const results = [
    getAnalysisErrorPresentation(new TypeError("Failed to fetch")),
    getAnalysisErrorPresentation({
      data: "<html>gateway response with source-like content</html>",
    }),
  ];

  for (const result of results) {
    assert.equal(result.title, "Analysis unavailable");
    assert.match(result.message, /connection|analysis service/i);
    assert.equal(result.retryable, true);
    assert.doesNotMatch(result.message, /gateway|source-like|Failed to fetch/i);
  }
});

test("renders the responsive Studio composition and accessible actions", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /aria-label="Reset HTML Port Studio"/);
  assert.match(source, /focus-visible:ring-2 focus-visible:ring-ring/);
  assert.match(source, /id="html-source"/);
  assert.match(source, /id="assistant-prompt"/);
  assert.match(source, /aria-label="Send prompt to Poe Assistant"/);
  assert.match(source, /direction=\{isMobile \? 'vertical' : 'horizontal'\}/);
  assert.match(source, /defaultSize=\{isMobile \? 45 : 35\}/);
  assert.match(source, /defaultSize=\{isMobile \? 55 : 65\}/);
  assert.match(source, /data-\[panel-group-direction=vertical\]:cursor-row-resize/);
  assert.match(source, /md:border-r/);
});

test("gives Studio controls a token border without crossing the preview iframe", async () => {
  const homeSource = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const buttonSource = await readFile(
    new URL("../components/ui/button.tsx", import.meta.url),
    "utf8",
  );
  const fallbackSource = await readFile(
    new URL("../components/error-boundary.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(new URL("../index.css", import.meta.url), "utf8");

  assert.match(buttonSource, /"studio-button inline-flex/);
  assert.match(fallbackSource, /className="studio-button mt-4/);
  assert.match(styles, /\.studio-button\s*\{\s*border:\s*1px solid hsl\(var\(--border\)\);\s*\}/s);
  assert.match(homeSource, /<TabsTrigger value="preview" className="studio-button gap-2">/);
  assert.match(homeSource, /<TabsTrigger value="assistant" className="studio-button gap-2">/);
  assert.match(homeSource, /<iframe[\s\S]*sandbox="allow-scripts allow-forms"[\s\S]*className="w-full h-full border-0"/);
});

test("allowlists structured assistant and handoff errors", () => {
  const credentialResult = getStudioErrorMessage(
    {
      data: {
        code: "CHAT_CONTAINS_CREDENTIAL",
        error: "credential=super-secret-value",
      },
    },
    "assistant fallback",
  );
  const connectionResult = getStudioErrorMessage(
    {
      data: {
        code: "PROJECT_CREATION_CONNECTION_UNAVAILABLE",
        error: "proxy request headers and upstream response details",
      },
    },
    "handoff fallback",
  );
  const bundleResult = getStudioErrorMessage(
    {
      data: {
        code: "BUNDLE_ENTRYPOINT_MISSING",
        error: "source contents and request credentials",
      },
    },
    "handoff fallback",
  );

  assert.match(credentialResult, /service credential/i);
  assert.match(connectionResult, /setup screen/i);
  assert.match(bundleResult, /entrypoint/i);
  assert.doesNotMatch(credentialResult, /super-secret-value/i);
  assert.doesNotMatch(connectionResult, /proxy request|upstream response/i);
  assert.doesNotMatch(bundleResult, /source contents|request credentials/i);
});

test("keeps every assistant and handoff API code mapped to safe Studio copy", async () => {
  const portSource = await readFile(
    new URL("../../../api-server/src/routes/port.ts", import.meta.url),
    "utf8",
  );
  const routeStart = portSource.indexOf('router.post("/port/poe/chat"');
  const routeEnd = portSource.indexOf("const SAFE_PATH", routeStart);
  assert.notEqual(routeStart, -1);
  assert.notEqual(routeEnd, -1);

  const routeSource = portSource.slice(routeStart, routeEnd);
  const emittedCodes = [
    ...routeSource.matchAll(/code:\s*([\s\S]*?),/g),
    ...routeSource.matchAll(/const code\s*=\s*([\s\S]*?);/g),
  ]
    .flatMap((match) => match[1].match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? [])
    .filter((code, index, codes) => codes.indexOf(code) === index)
    .sort();
  const expectedCodes = [
    "CHAT_CONTAINS_CREDENTIAL",
    "INVALID_PROJECT_HANDOFF",
    "INVALID_SOURCE_BUNDLE",
    "POE_MODEL_UNAVAILABLE",
    "PROJECT_CREATION_CONNECTION_UNAVAILABLE",
    "PROJECT_HANDOFF_NOT_FOUND",
    "PROJECT_HANDOFF_NOT_RETRYABLE",
    "PROJECT_HANDOFF_SOURCE_TOO_LARGE",
    "SOURCE_CONTAINS_CREDENTIAL",
  ].sort();

  assert.deepEqual(emittedCodes, expectedCodes);
  for (const code of expectedCodes) {
    assert.equal(typeof STUDIO_ERROR_MESSAGES[code as keyof typeof STUDIO_ERROR_MESSAGES], "string");
    assert.ok(STUDIO_ERROR_MESSAGES[code as keyof typeof STUDIO_ERROR_MESSAGES].length > 0);
  }
});

test("uses exact live Poe identifiers and preserves retryable assistant state", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const assistantStart = source.indexOf("function PoeAssistantPanel");
  const repairStart = source.indexOf("function PoeRepairPanel");
  const assistantSource = source.slice(assistantStart, repairStart);
  const repairSource = source.slice(repairStart);

  assert.match(source, /const GEMINI_REPAIR_MODEL = 'gemini-3\.1-pro'/);
  assert.match(repairSource, /poeData\.models\.find\(\(model(?:: string)?\) => model === GEMINI_REPAIR_MODEL\)/);
  assert.match(repairSource, /model: confirmedRepairModel/);
  assert.doesNotMatch(repairSource, /Gemini-3\.1-Pro/);
  assert.match(assistantSource, /availableModels\.includes\(selectedModel\)/);
  assert.match(assistantSource, /setSelectedModel\(''\)/);
  assert.match(assistantSource, /Refresh Poe models/);
  assert.match(repairSource, /Retry loading models/);
  assert.match(repairSource, /setPrompt\(message\)/);
  assert.match(repairSource, /setPendingPrompt\(message\)/);
});

test("redacts every supported credential family before repair context is assembled", () => {
  const credentials = [
    "sk-proj-imported-secret-value",
    "sk-ant-api03-imported-secret-value",
    "poe-imported-secret-value",
    "pplx-imported-secret-value",
    "AIzaSyImportedSecretValue123",
    "r8_imported-secret-value",
    "hf_imported-secret-value",
    "ghp_imported_secret_value_123456",
    "github_pat_imported_secret_value_123456",
    "xoxb-1234567890-1234567890-1234567890",
    "AKIAIOSFODNN7EXAMPLE",
    "gsk_imported-secret-value",
    "SG.imported-secret-value-123456",
    "eyJhbGciOiJIUzI1NiJ9.imported-secret-payload.signature-value",
  ];
  const source = credentials
    .map((credential, index) => `const token${index} = "${credential}";`)
    .join("\n");
  const result = redactCredentialSource(source);

  assert.equal(result.safe, true);
  assert.equal(result.hadCredential, true);
  assert.equal(containsCredential(result.redactedSource), false);
  assert.ok(result.findings.length >= credentials.length);
  assert.match(result.redactedSource, /\[REDACTED CREDENTIAL\]/);
  for (const credential of credentials) {
    assert.doesNotMatch(result.redactedSource, new RegExp(credential.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const finding of result.findings) {
      assert.doesNotMatch(finding.excerpt, new RegExp(credential.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
});

test("keeps model commentary and proposals sanitized", () => {
  const unsafeResponse = [
    "Rotate sk-proj-model-leaked-secret before continuing.",
    "```html",
    "<script>const apiKey = 'sk-proj-model-leaked-secret';</script>",
    "```",
  ].join("\n");
  const sanitized = sanitizeUntrustedRepairText(unsafeResponse);

  assert.doesNotMatch(sanitized, /sk-proj-model-leaked-secret/);
  assert.match(sanitized, new RegExp(CREDENTIAL_REDACTION_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("redacts credentials across a complete multi-file bundle", () => {
  const rawCredential = "sk-proj-non-entrypoint-secret-value";
  const result = redactCredentialBundle([
    { path: "index.html", content: "<script src=\"app.js\"></script>" },
    { path: "app.js", content: `const apiKey = "${rawCredential}";` },
    { path: "styles.css", content: "body { color: black; }" },
  ]);

  assert.equal(result.safe, true);
  assert.equal(result.hadCredential, true);
  assert.equal(result.files.length, 3);
  assert.doesNotMatch(JSON.stringify(result), /sk-proj-non-entrypoint-secret-value/);
  assert.equal(result.findings[0]?.filePath, "app.js");
  assert.match(result.files[1]?.content ?? "", /\[REDACTED CREDENTIAL\]/);
});

test("uses opaque file IDs when a bundle path contains a credential pattern", () => {
  const rawPath = "assets/sk-proj-path-secret-value.js";
  const result = redactCredentialBundle([
    { path: "index.html", content: "<main>Safe entrypoint</main>" },
    { path: rawPath, content: "console.log('safe content');" },
  ]);

  assert.equal(result.safe, true);
  assert.equal(result.hadCredential, true);
  assert.doesNotMatch(JSON.stringify(result), /sk-proj-path-secret-value/);
  assert.equal(result.files[1]?.id, "file-2");
  assert.match(result.files[1]?.path ?? "", /\[REDACTED CREDENTIAL\]/);
  assert.equal(result.findings[0]?.category, "Credential-like file path");
});

test("requires redacted consent, review, confirmation, re-scan, and undo in Fix Code", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /const CLAUDE_REPAIR_MODEL = 'Claude-Sonnet-4\.6'/);
  assert.doesNotMatch(source, /Claude-Sonnet-4\.5/);
  assert.match(source, /model === CLAUDE_REPAIR_MODEL/);
  assert.match(source, /credentialRedaction\.safe &&\s*shareConfirmed/s);
  assert.match(source, /only the complete redacted copy will be shared with Claude/i);
  assert.match(source, /Request redacted Claude repair/);
  assert.match(source, /Fix explanation/);
  assert.match(source, /Claude&apos;s proposed code/);
  assert.match(source, /Apply reviewed patch/);
  assert.match(source, /Confirm apply and re-scan/);
  assert.match(source, /submitBundleForAnalysis\(nextBundle\)/);
  assert.match(source, /redactCredentialBundle\(currentBundle\.files\)\.hadCredential/);
  assert.match(source, /const replacements = new Map\(patchedFiles/);
  assert.match(source, /originalBundle: SourceBundle/);
  assert.match(source, /FILE_ID: file-N/);
  assert.match(source, /never echo or invent paths/);
  assert.match(source, /Undo and restore original/);
  assert.match(source, /Ask for concise explanatory comments/);
  assert.match(source, /Reject proposal/);
});

test("uses concise fallbacks for unknown, transport, and non-JSON errors", () => {
  const fallback = "The assistant could not answer. Your prompt is ready to retry.";
  const errors = [
    new TypeError("Failed to fetch: Authorization: Bearer secret-token"),
    {
      data: "<html>gateway response containing source contents and credentials</html>",
    },
    {
      data: {
        code: "UNKNOWN_UPSTREAM_CODE",
        error: "raw upstream details with secret-token",
      },
    },
  ];

  for (const error of errors) {
    assert.equal(getStudioErrorMessage(error, fallback), fallback);
  }

  assert.equal(
    PROJECT_HANDOFF_FAILURE_FALLBACK,
    "The Replit project setup could not be completed. Retry the failed step.",
  );
  assert.match(PROJECT_HANDOFF_RECOVERY_EXPIRED, /status is no longer available/i);
});

test("does not render raw server error fields in non-analysis surfaces", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /apiErrorMessage/);
  assert.doesNotMatch(source, /failedStep\?\.error\s*\|\||handoff\.error\s*\|\|/);
  assert.doesNotMatch(source, /\{authError\}/);
  assert.match(source, /getStudioErrorMessage\(error/);
  assert.match(source, /PROJECT_HANDOFF_FAILURE_FALLBACK/);
});

test("keeps shared fetch error messages free of raw response details", () => {
  const response = new Response(
    "gateway body with source contents and secret-token",
    { status: 502, statusText: "upstream request details" },
  );
  const apiError = new ApiError(
    response,
    "gateway body with source contents and secret-token",
    { method: "POST", url: "https://example.test/api/hand-off?token=secret-token" },
  );
  const parseError = new ResponseParseError(
    response,
    "gateway body with source contents and secret-token",
    new SyntaxError("secret-token"),
    { method: "POST", url: "https://example.test/api/hand-off?token=secret-token" },
  );

  for (const error of [apiError, parseError]) {
    assert.doesNotMatch(error.message, /gateway body|source contents|secret-token|upstream request/i);
  }
});

test("keeps recovery metadata non-sensitive and session-scoped", () => {
  const storage = makeStorage();
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
  const authSource = await readFile(new URL("../auth.tsx", import.meta.url), "utf8");

  assert.match(source, /A reload does not restore imported HTML or analysis/);
  assert.match(source, /Only this signed-in handoff status can be recovered/);
  assert.match(source, /metadata\.ownerId === user\.id/);
  assert.match(source, /metadata\.browserSessionId === browserSessionId/);
  assert.match(source, /clearHandoffRecovery\(\)/);
  assert.match(source, /Starting a new source clears this recovery record/);
  assert.match(source, /studio-auth:logout/);
  assert.match(authSource, /dispatchEvent\(new Event\("studio-auth:logout"\)\)/);
  assert.match(authSource, /ClerkProvider/);
  assert.match(authSource, /SignIn/);
  assert.match(authSource, /SignUp/);
});

test("exposes both Clerk sign-in entry points without coupling import state to auth", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const authSource = await readFile(new URL("../auth.tsx", import.meta.url), "utf8");
  const appSource = await readFile(new URL("../App.tsx", import.meta.url), "utf8");

  assert.match(source, /Sign in/);
  assert.match(source, /Log in to create/);
  assert.match(source, /onClick=\{login\}/);
  assert.match(authSource, /setLocation\("\/sign-in"\)/);
  assert.match(authSource, /fallbackRedirectUrl/);
  assert.match(authSource, /AUTHENTICATION_NOT_CONFIGURED|configured for this app/);
  assert.match(appSource, /location === '\/' \|\| isAuthRoute \? <Home \/>/);
});

test("offers a pinned, review-before-confirming public GitHub import", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /useGetGithubRepository/);
  assert.match(source, /useImportGithubRepository/);
  assert.match(source, /Import a public GitHub repository/);
  assert.match(source, /Or immutable commit SHA/);
  assert.match(source, /Fetch selected snapshot/);
  assert.match(source, /Review this read-only snapshot/);
  assert.match(source, /Use this GitHub source/);
  assert.match(source, /resolvedCommitSha/);
  assert.match(source, /GitHub\s+credentials are never requested/);
});

test("keeps hosted URL fetching server-side and shows fetch diagnostics", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /useImportHostedUrl/);
  assert.match(source, /validateHostedUrl/);
  assert.match(source, /Fetch hosted HTML/);
  assert.match(source, /Fetching and checking the hosted page/);
  assert.match(source, /Cancel/);
  assert.match(source, /Retry hosted import/);
  assert.match(source, /Original URL:/);
  assert.match(source, /Final allowed URL:/);
  assert.match(source, /sourceType !== 'hosted_page'/);
  assert.match(source, /The server fetches one public HTTP\(S\) document/);
  assert.doesNotMatch(source, /fetch\(hostedUrl/);
});

test("offers a local ZIP project flow with explicit entrypoint recovery", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");

  assert.match(source, /makeZipSourceBundle/);
  assert.match(source, /accept="\.zip,application\/zip,application\/x-zip-compressed"/);
  assert.match(source, /Choose ZIP project/);
  assert.match(source, /Unpacking ZIP\.\.\./);
  assert.match(source, /Choose an entrypoint to continue/);
  assert.match(source, /Multiple HTML entrypoints/);
  assert.match(source, /Selecting the ZIP only unpacks files locally/);
});

test("does not analyze ZIP source while it is being selected", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const zipHandlerStart = source.indexOf("const handleZipSelect");
  const zipHandlerEnd = source.indexOf("const handleEntrypointChange", zipHandlerStart);
  const zipHandler = source.slice(zipHandlerStart, zipHandlerEnd);

  assert.notEqual(zipHandlerStart, -1);
  assert.match(source, /useImportHostedUrl/);
  assert.doesNotMatch(zipHandler, /analyzeMutation\.mutate/);
  assert.match(zipHandler, /makeZipSourceBundle\(await file\.arrayBuffer\(\), file\.name\)/);
  assert.match(zipHandler, /if \(sessionId !== importSessionRef\.current\) return/);
});

test("clears obsolete editor feedback when analysis becomes current", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const editorStart = source.indexOf("function SourceEditorPanel");
  const editorEnd = source.indexOf("function ClaudeRepairPanel", editorStart);
  const editorSource = source.slice(editorStart, editorEnd);

  assert.match(editorSource, /const isStale = !hasReport \|\| analyzedRevision !== revision/);
  assert.match(editorSource, /if \(!isStale\) \{\s*setStatus\(''\);\s*\}/s);
  assert.match(editorSource, /onClick=\{onAnalyze\} disabled=\{isStale === false\}/);
  assert.match(editorSource, /isStale \? 'Re-analyze source' : 'Analysis current'/);
});

test("keeps the editor stale when analysis fails", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const submitStart = source.indexOf("const submitBundleForAnalysis");
  const submitEnd = source.indexOf("const handleAnalyze", submitStart);
  const submitSource = source.slice(submitStart, submitEnd);

  assert.notEqual(submitStart, -1);
  assert.match(submitSource, /onError: \(\) => \{\s*if \(sessionId !== importSessionRef\.current \|\| requestRevision !== sourceRevisionRef\.current\) return;\s*\/\/ A failed retry must never make the current revision look analyzed\.\s*\/\/ Keep the existing report and editor feedback available for another attempt\.\s*setAnalysisStale\(true\);/s);
  assert.doesNotMatch(submitSource, /onError:[\s\S]*setAnalysisData\(null\)/);
});