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
  STUDIO_ERROR_MESSAGES,
} from "./studio-error.ts";
import {
  ApiError,
  ResponseParseError,
} from "../../../../lib/api-client-react/src/custom-fetch.ts";

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

test("validates HTML files before reading their contents", async () => {
  const source = await readFile(new URL("./home.tsx", import.meta.url), "utf8");
  const validationIndex = source.indexOf("validateHtmlFile(file)");
  const readIndex = source.indexOf("await file.text()");

  assert.notEqual(validationIndex, -1);
  assert.notEqual(readIndex, -1);
  assert.ok(validationIndex < readIndex);
  assert.match(source, /MAX_HTML_FILE_BYTES = 2 \* 1024 \* 1024/);
  assert.match(source, /Choose an HTML file ending in \.html or \.htm/);
  assert.match(source, /no larger than 2 MB/);
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
  const routeEnd = portSource.indexOf("const MAX_BUNDLE_BYTES", routeStart);
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