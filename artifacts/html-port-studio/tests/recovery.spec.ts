import { expect, test } from "@playwright/test";
import { zipSync } from "fflate";
import {
  classifyBrowserSetupError,
  setupDiagnostic,
} from "../scripts/prepare-browsers.mjs";
import {
  createHandoffRecovery,
  MCP_HANDOFF_RECOVERY_STORAGE_KEY,
  type HandoffRecoveryMetadata,
} from "../src/session-recovery";
import {
  createMcpHandoffStatus,
  createMcpRecoveryFixture,
} from "./mcp-fixtures";

const html = "<!doctype html><html><body><main>Imported page</main></body></html>";
const githubUrl = "https://github.com/acme/demo";
const githubRepository = {
  sourceUrl: githubUrl,
  fullName: "acme/demo",
  displayName: "demo",
  defaultBranch: "main",
  description: "A public demo repository",
  stars: 0,
  refs: [{ name: "main", sha: "a".repeat(40) }],
};
const githubImport = {
  bundle: {
    version: 1,
    sourceType: "github_repository",
    files: [{ path: "index.html", content: "<main>GitHub snapshot</main>" }],
    entrypoint: "index.html",
    metadata: {
      displayName: "acme/demo",
      sourceUrl: githubUrl,
      resolvedRef: "main",
      resolvedCommitSha: "b".repeat(40),
    },
  },
  analysis: {
    title: "GitHub snapshot",
    bytes: 30,
    scriptCount: 0,
    externalScriptCount: 0,
    inlineScriptCount: 0,
    externalAssetCount: 0,
    aiSignalCount: 0,
    findings: [],
    steps: [],
    sourceType: "github_repository",
    entrypoint: "index.html",
    fileCount: 1,
    totalBytes: 30,
    files: ["index.html"],
    localAssetReferences: [],
    externalDependencies: [],
  },
  repository: githubRepository,
  resolvedRef: "main",
  resolvedCommitSha: "b".repeat(40),
  entrypointCandidates: ["index.html"],
  warnings: [],
};
const hostedImport = {
  originalUrl: "https://example.com/app",
  finalUrl: "https://example.com/app",
  status: "fetched",
  bundle: {
    version: 1,
    sourceType: "hosted_page",
    files: [{ path: "index.html", content: "<main>Hosted page</main>" }],
    entrypoint: "index.html",
    metadata: {
      displayName: "Hosted page",
      sourceUrl: "https://example.com/app",
      originalUrl: "https://example.com/app",
      finalUrl: "https://example.com/app",
      warnings: [],
    },
  },
  warnings: [],
};
const playgroundImport = {
  provider: "codepen",
  originalUrl: "https://codepen.io/alice/pen/demo",
  status: "imported",
  bundle: {
    version: 1,
    sourceType: "playground",
    files: [{ path: "index.html", content: "<main>Playground</main>" }],
    entrypoint: "index.html",
    metadata: {
      displayName: "Playground",
      sourceUrl: "https://codepen.io/alice/pen/demo/",
      originalUrl: "https://codepen.io/alice/pen/demo",
      warnings: [],
    },
  },
  warnings: [],
};

const poeCapabilities = [
  {
    version: 1,
    id: "generic-assistant",
    endpoint: "/v1/chat/completions",
    contract: "text-only",
    limits: { maxMessages: 40, maxCompletionTokens: 4096 },
    privacyClass: "user-content",
    fallback: "none",
    owner: "api-server",
    reviewEvidence: "Poe live catalogue plus server boundary review",
    capabilities: {
      toolCalling: "unavailable",
      vision: "unavailable",
      structuredOutput: "unavailable",
      streaming: "unavailable",
    },
  },
  {
    version: 1,
    id: "gemini-repair",
    endpoint: "/v1/chat/completions",
    contract: "text-only",
    limits: { maxMessages: 40, maxCompletionTokens: 4096 },
    privacyClass: "redacted-source",
    fallback: "generic-assistant",
    owner: "api-server",
    reviewEvidence: "Poe live catalogue plus redacted-source repair review",
    capabilities: {
      toolCalling: "unavailable",
      vision: "unavailable",
      structuredOutput: "unavailable",
      streaming: "unavailable",
    },
  },
  {
    version: 1,
    id: "claude-repair",
    endpoint: "/v1/chat/completions",
    contract: "text-only",
    limits: { maxMessages: 40, maxCompletionTokens: 4096 },
    privacyClass: "redacted-source",
    fallback: "generic-assistant",
    owner: "api-server",
    reviewEvidence: "Poe live catalogue plus redacted-source repair review",
    capabilities: {
      toolCalling: "unavailable",
      vision: "unavailable",
      structuredOutput: "unavailable",
      streaming: "unavailable",
    },
  },
];

function poeModels(models: string[]) {
  return {
    configured: true,
    available: models.length > 0,
    models,
    message: "Live models loaded from Poe.",
    capabilities: poeCapabilities,
  };
}

const hostedImportFailures = [
  ["HOSTED_URL_INVALID", "The hosted link is invalid.", "Use a complete HTTPS URL."],
  ["HOSTED_URL_UNSUPPORTED_PROTOCOL", "The hosted link uses an unsupported protocol.", "Use HTTPS."],
  ["HOSTED_URL_HTTP_DISABLED", "This hosted import requires HTTPS.", "Open the page over HTTPS."],
  ["HOSTED_URL_CREDENTIALS", "The hosted link includes credentials.", "Remove credentials from the URL."],
  ["HOSTED_URL_PORT_NOT_ALLOWED", "The hosted link uses a non-standard port.", "Use the standard HTTPS port."],
  ["HOSTED_URL_BLOCKED_HOST", "This destination is private.", "Choose a public site."],
  ["HOSTED_URL_DNS_FAILED", "The hosted domain could not be resolved.", "Check the hostname."],
  ["HOSTED_URL_DNS_REBINDING", "The hosted destination changed networks.", "Use a stable public hostname."],
  ["HOSTED_URL_REDIRECT_INVALID", "The hosted page returned an unsafe redirect.", "Use the final public URL."],
  ["HOSTED_URL_TOO_MANY_REDIRECTS", "The hosted page redirected too many times.", "Use the final public URL."],
  ["HOSTED_URL_TIMEOUT", "The hosted page timed out.", "Confirm the site responds and retry."],
  ["HOSTED_URL_RATE_LIMITED", "Hosted imports are temporarily rate limited.", "Wait before retrying."],
  ["HOSTED_URL_TOO_LARGE", "The hosted page is too large.", "Use a smaller HTML page."],
  ["HOSTED_URL_NOT_HTML", "The link returned non-HTML content.", "Choose an HTML document."],
  ["HOSTED_URL_HTTP_ERROR", "The hosted page returned an error.", "Check that the page is public."],
  ["HOSTED_URL_FETCH_FAILED", "The hosted page could not be reached.", "Check the public URL."],
] as const;

const playgroundImportFailures = [
  ["PLAYGROUND_URL_INVALID", "The playground link is invalid.", "Copy the public playground URL."],
  ["PLAYGROUND_URL_UNSUPPORTED_PROTOCOL", "The playground link requires HTTPS.", "Use the public HTTPS URL."],
  ["PLAYGROUND_URL_CREDENTIALS", "The playground link includes credentials.", "Remove credentials from the URL."],
  ["PLAYGROUND_URL_PORT_NOT_ALLOWED", "The playground link uses a non-standard port.", "Use the standard provider URL."],
  ["PLAYGROUND_URL_UNSUPPORTED_FORM", "The playground URL form is unsupported.", "Use a public pen or fiddle URL."],
  ["PLAYGROUND_PROVIDER_UNSUPPORTED", "That playground provider is unsupported.", "Use CodePen or JSFiddle."],
  ["PLAYGROUND_UNSAFE_DESTINATION", "The playground export resolved to a private network.", "Retry from the provider URL."],
  ["PLAYGROUND_REDIRECT_UNSAFE", "The playground export redirected unsafely.", "Retry from the provider URL."],
  ["PLAYGROUND_TIMEOUT", "The playground export timed out.", "Check the provider and retry."],
  ["PLAYGROUND_RATE_LIMITED", "Playground imports are temporarily rate limited.", "Wait before retrying."],
  ["PLAYGROUND_RESPONSE_TOO_LARGE", "The playground export is too large.", "Use a smaller example."],
  ["PLAYGROUND_EMPTY", "The playground has no public HTML export.", "Make the playground public."],
  ["PLAYGROUND_PROVIDER_UNAVAILABLE", "The playground provider is unavailable.", "Retry later or use hosted HTML."],
] as const;

  const assertionFailure = new Error("expect(received).toBe(true)");
async function mockAuth(page: import("@playwright/test").Page) {
  await page.route("**/__clerk/**", (route) => route.abort());
}

async function mockAuthenticatedAuth(page: import("@playwright/test").Page) {
  await mockAuth(page);
}

const recoveryOwnerId = "e2e-user";

function recoveryMetadata(
  jobId: string,
  browserSessionId: string,
  overrides: Partial<
    Pick<HandoffRecoveryMetadata, "ownerId" | "createdAt">
  > = {},
): HandoffRecoveryMetadata {
  return createHandoffRecovery(
    jobId,
    overrides.ownerId ?? recoveryOwnerId,
    browserSessionId,
    overrides.createdAt ?? Date.now(),
  );
}

async function seedRecovery(
  page: import("@playwright/test").Page,
  metadata: HandoffRecoveryMetadata,
) {
  await page.addInitScript((recovery) => {
    sessionStorage.setItem(
      "html-port-studio:browser-session",
      recovery.browserSessionId,
    );
    sessionStorage.setItem(
      "html-port-studio:handoff-recovery",
      JSON.stringify(recovery),
    );
  }, metadata);
}

async function writeRecovery(
  page: import("@playwright/test").Page,
  metadata: HandoffRecoveryMetadata,
) {
  await page.evaluate((recovery) => {
    sessionStorage.setItem(
      "html-port-studio:browser-session",
      recovery.browserSessionId,
    );
    sessionStorage.setItem(
      "html-port-studio:handoff-recovery",
      JSON.stringify(recovery),
    );
  }, metadata);
}

async function seedMcpRecovery(
  page: import("@playwright/test").Page,
  metadata: McpHandoffRecoveryMetadata,
) {
  await page.addInitScript(
    ({ recovery, storageKey }) => {
      sessionStorage.setItem(storageKey, JSON.stringify(recovery));
    },
    { recovery: metadata, storageKey: MCP_HANDOFF_RECOVERY_STORAGE_KEY },
  );
}

async function mockAnalysis(
  page: import("@playwright/test").Page,
  findings: Array<{
    severity: "info" | "warning" | "error";
    title: string;
    detail: string;
    action: string;
  }> = [],
) {
  await page.route("**/api/port/analyze", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Imported page",
        bytes: html.length,
        scriptCount: 0,
        externalScriptCount: 0,
        inlineScriptCount: 0,
        externalAssetCount: 0,
        aiSignalCount: 0,
        findings,
        steps: [],
      }),
    }),
  );
}

async function analyzeImportedHtml(
  page: import("@playwright/test").Page,
  source = html,
) {
  await page.getByPlaceholder(/paste your html/i).fill(source);
  await page.getByRole("button", { name: /analyze/i }).click();
}

test("recovers from a model-load failure with the retry control", async ({ page }) => {
  let attempts = 0;
  await mockAuth(page);
  await mockAnalysis(page);
  await page.route("**/api/port/poe/models", (route) => {
    attempts += 1;
    if (attempts <= 5) {
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Temporary outage" }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(poeModels(["Claude-3.5-Sonnet"])),
    });
  });

  await page.goto("/");
  await analyzeImportedHtml(page);
  await page.getByRole("tab", { name: "Assistant" }).click();
  await expect(page.getByText("Could not load Poe models")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Retry loading models" }).click();
  await expect(page.getByRole("combobox")).toContainText("Claude-3.5-Sonnet");
  expect(attempts).toBe(6);
});

test("keeps a failed assistant prompt available and retries successfully", async ({ page }) => {
  let attempts = 0;
  await mockAuth(page);
  await mockAnalysis(page);
  await page.route("**/api/port/poe/models", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(poeModels(["Claude-3.5-Sonnet"])),
    }),
  );
  await page.route("**/api/port/poe/chat", (route) => {
    attempts += 1;
    if (attempts === 1) {
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Temporary assistant failure" }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: "Here is a successful retry." }),
    });
  });

  await page.goto("/");
  await analyzeImportedHtml(page);
  await page.getByRole("tab", { name: "Assistant" }).click();
  await expect(page.getByRole("combobox")).toContainText("Claude-3.5-Sonnet");
  const prompt = page.getByPlaceholder(/ask poe/i);
  await prompt.fill("How should I port this page?");
  await prompt.press("Enter");
  await expect(page.getByText("Assistant request failed")).toBeVisible();
  await expect(prompt).toHaveValue("How should I port this page?");
  await page.getByRole("button", { name: "Retry request" }).click();
  await expect(page.getByText("Here is a successful retry.")).toBeVisible();
  await expect(prompt).toHaveValue("");
  expect(attempts).toBe(2);
});

test("keeps the import surface available when an auth callback URL is present", async ({ page }) => {
  await mockAuth(page);
  await mockAnalysis(page);
  await page.goto("/");
  await analyzeImportedHtml(page);
  await expect(page.getByText("Guided MCP project handoff")).toBeVisible();
});

async function openGithubImport(page: import("@playwright/test").Page) {
  await page.getByRole("tab", { name: /Import GitHub repository/i }).click();
  await page.getByRole("textbox", { name: "Public GitHub repository URL" }).fill(githubUrl);
  await page.getByRole("button", { name: "Inspect" }).click();
  await expect(page.getByText("acme/demo")).toBeVisible();
}

test("starting over invalidates a pending GitHub import and permits a fresh import", async ({ page }) => {
  let importAttempts = 0;
  let releaseFirstImport: (() => void) | null = null;
  let firstImportRequest: import("@playwright/test").Request | null = null;
  let firstImportRequestAborted = false;
  let firstImportResponseSettled = false;
  await mockAuth(page);
  page.on("requestfailed", (request) => {
    if (request === firstImportRequest) {
      firstImportRequestAborted = true;
    }
  });
  await page.route("**/api/port/github/repository**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(githubRepository) }),
  );
  await page.route("**/api/port/github/import", (route) => {
    importAttempts += 1;
    if (importAttempts === 1) {
      firstImportRequest = route.request();
      return new Promise<void>((resolve) => {
        releaseFirstImport = () => {
          void route
            .fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(githubImport) })
            .then(() => {
              firstImportResponseSettled = true;
              resolve();
            })
            .catch(() => {
              firstImportResponseSettled = true;
              resolve();
            });
        };
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(githubImport),
    });
  });

  await page.goto("/");
  await openGithubImport(page);
  const fetchButton = page.getByRole("button", { name: "Fetch selected snapshot" });
  await fetchButton.click();
  await expect(page.getByRole("button", { name: "Importing snapshot..." })).toBeDisabled();

  await page.getByRole("button", { name: "Reset HTML Port Studio" }).click();
  await expect(page.getByPlaceholder(/paste your html/i)).toBeVisible();
  await expect.poll(() => firstImportRequestAborted).toBe(true);
  await openGithubImport(page);
  const freshFetchButton = page.getByRole("button", { name: "Fetch selected snapshot" });
  await expect(freshFetchButton).toBeEnabled();
  await freshFetchButton.click();
  await expect(page.getByText("Review this read-only snapshot")).toBeVisible();
  expect(importAttempts).toBe(2);
});

test("[cross-browser] [mobile] starting over clears a failed GitHub import so it can be retried cleanly", async ({
  page,
}) => {
  let importAttempts = 0;
  await mockAuth(page);
  await page.route("**/api/port/github/repository**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(githubRepository) }),
  );
  await page.route("**/api/port/github/import", (route) => {
    importAttempts += 1;
    if (importAttempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary GitHub outage" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(githubImport),
    });
  });

  await page.goto("/");
  await openGithubImport(page);
  await page.getByRole("button", { name: "Fetch selected snapshot" }).click();
  await expect(page.getByText("GitHub import needs attention")).toBeVisible();

  await page.getByRole("button", { name: "Reset HTML Port Studio" }).click();
  await expect(page.getByPlaceholder(/paste your html/i)).toBeVisible();
  await openGithubImport(page);
  const freshFetchButton = page.getByRole("button", { name: "Fetch selected snapshot" });
  await expect(freshFetchButton).toBeEnabled();
  await freshFetchButton.click();
  await expect(page.getByText("Review this read-only snapshot")).toBeVisible();
  expect(importAttempts).toBe(2);
});

test("[cross-browser] [mobile] cancelling a pending GitHub import aborts the request, ignores its response, and permits retry", async ({
  page,
}) => {
  let importAttempts = 0;
  let releaseFirstImport: (() => void) | null = null;
  let firstImportRequest: import("@playwright/test").Request | null = null;
  let firstImportRequestAborted = false;
  let firstImportResponseSettled = false;
  let firstImportFailureText: string | null = null;
  await mockAuth(page);
  page.on("requestfailed", (request) => {
    if (request === firstImportRequest) {
      firstImportRequestAborted = true;
      firstImportFailureText = request.failure()?.errorText ?? null;
    }
  });
  await page.route("**/api/port/github/repository**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(githubRepository) }),
  );
  await page.route("**/api/port/github/import", (route) => {
    importAttempts += 1;
    if (importAttempts === 1) {
      firstImportRequest = route.request();
      return new Promise<void>((resolve) => {
        releaseFirstImport = () => {
          void route
            .fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(githubImport) })
            .then(() => {
              firstImportResponseSettled = true;
              resolve();
            })
            .catch(() => {
              firstImportResponseSettled = true;
              resolve();
            });
        };
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(githubImport),
    });
  });

  await page.goto("/");
  await openGithubImport(page);
  await page.getByRole("button", { name: "Fetch selected snapshot" }).click();
  await expect(page.getByRole("button", { name: "Importing snapshot..." })).toBeDisabled();
  const statusRow = page.getByText("Fetching and checking the GitHub snapshot...").locator("..");
  const cancelButton = page.getByRole("button", { name: "Cancel" });
  await expect(statusRow).toBeVisible();
  await expect(cancelButton).toBeVisible();
  const statusLayout = await statusRow.evaluate((element) => {
    const row = element.getBoundingClientRect();
    const button = element.querySelector("button")?.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      rowRight: row.right,
      rowWidth: row.width,
      rowScrollWidth: element.scrollWidth,
      rowClientWidth: element.clientWidth,
      buttonRight: button?.right ?? 0,
    };
  });
  expect(statusLayout.documentWidth).toBeLessThanOrEqual(statusLayout.viewportWidth + 1);
  expect(statusLayout.rowRight).toBeLessThanOrEqual(statusLayout.viewportWidth + 1);
  expect(statusLayout.rowScrollWidth).toBeLessThanOrEqual(statusLayout.rowClientWidth + 1);
  expect(statusLayout.buttonRight).toBeLessThanOrEqual(statusLayout.viewportWidth + 1);

  await cancelButton.click();
  await expect(page.getByText("GitHub snapshot import cancelled. You can retry the same snapshot.")).toBeVisible();
  await expect.poll(() => firstImportRequestAborted).toBe(true);
  test.info().annotations.push({
    type: "AbortController",
    description: `${test.info().project.name} reported ${firstImportFailureText ?? "a request failure without an error code"} after cancellation; the late response was ignored.`,
  });

  releaseFirstImport?.();
  await expect.poll(() => firstImportResponseSettled).toBe(true);
  await expect(page.getByText("Review this read-only snapshot")).toHaveCount(0);
  await expect(page.getByText("GitHub import needs attention")).toBeVisible();

  await page.getByRole("button", { name: "Retry snapshot fetch" }).click();
  await expect(page.getByText("Review this read-only snapshot")).toBeVisible();
  expect(importAttempts).toBe(2);
});

test("cancelling a pending hosted import aborts the request and permits retry", async ({ page }) => {
  let importAttempts = 0;
  let releaseFirstImport: (() => void) | null = null;
  let firstImportRequest: import("@playwright/test").Request | null = null;
  let firstImportRequestAborted = false;
  await mockAuth(page);
  page.on("requestfailed", (request) => {
    if (request === firstImportRequest) {
      firstImportRequestAborted = true;
    }
  });
  await page.route("**/api/port/hosted-url", (route) => {
    importAttempts += 1;
    if (importAttempts === 1) {
      firstImportRequest = route.request();
      return new Promise<void>((resolve) => {
        releaseFirstImport = () => {
          void route
            .fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(hostedImport) })
            .then(resolve)
            .catch(resolve);
        };
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(hostedImport),
    });
  });

  await page.goto("/");
  await page.getByRole("tab", { name: /Import hosted URL/i }).click();
  await page.getByRole("textbox", { name: "Hosted page URL" }).fill("https://example.com/app");
  await page.getByRole("button", { name: "Fetch hosted HTML" }).click();
  await expect(page.getByRole("button", { name: /Fetching\.\.\./ })).toBeDisabled();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Hosted import cancelled. You can retry the same URL.")).toBeVisible();
  await expect.poll(() => firstImportRequestAborted).toBe(true);

  await page.getByRole("button", { name: "Retry hosted import" }).click();
  await expect(page.getByText("Hosted page fetched safely")).toBeVisible();
  expect(importAttempts).toBe(2);

  releaseFirstImport?.();
});

test("keeps import recovery working when analytics is missing or throws", async ({ page }) => {
  let importAttempts = 0;
  let releaseFirstImport: (() => void) | null = null;
  await page.addInitScript(() => {
    delete (window as typeof window & { umami?: unknown }).umami;
  });
  await mockAuth(page);
  await page.route("**/api/port/hosted-url", (route) => {
    importAttempts += 1;
    if (importAttempts === 1) {
      return new Promise<void>((resolve) => {
        releaseFirstImport = () => {
          void route
            .fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(hostedImport) })
            .then(resolve)
            .catch(resolve);
        };
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(hostedImport),
    });
  });

  await page.goto("/");
  await page.getByRole("tab", { name: /Import hosted URL/i }).click();
  await page.getByRole("textbox", { name: "Hosted page URL" }).fill("https://example.com/app");
  await page.getByRole("button", { name: "Fetch hosted HTML" }).click();
  await expect(page.getByRole("button", { name: /Fetching\.\.\./ })).toBeDisabled();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Hosted import cancelled. You can retry the same URL.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry hosted import" })).toBeVisible();

  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      recoveryAnalyticsEvents: Array<{ name: string; data: unknown }>;
      umami?: {
        track(name: string, data?: Record<string, string | number | boolean>): void;
      };
    };
    testWindow.recoveryAnalyticsEvents = [];
    testWindow.umami = {
      track(name, data) {
        testWindow.recoveryAnalyticsEvents.push({ name, data: data ?? null });
      },
    };
  });

  await page.getByRole("button", { name: "Retry hosted import" }).click();
  await expect(page.getByText("Hosted page fetched safely")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry hosted import" })).toHaveCount(0);
  expect(importAttempts).toBe(2);

  releaseFirstImport?.();
});

test("records coarse outcomes for local paste, HTML, and ZIP sources", async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & {
      recoveryAnalyticsEvents: Array<{ name: string; data: unknown }>;
      umami?: {
        track(name: string, data?: Record<string, string | number | boolean>): void;
      };
    };
    testWindow.recoveryAnalyticsEvents = [];
    testWindow.umami = {
      track(name, data) {
        testWindow.recoveryAnalyticsEvents.push({ name, data: data ?? null });
      },
    };
  });
  await mockAuth(page);
  await mockAnalysis(page);
  await page.goto("/");

  const paste = page.getByPlaceholder(/paste your html/i);
  await paste.fill("<main>paste source</main>");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await paste.fill("<main>paste source</main>");
  await page.getByRole("button", { name: /Analyze & Preview/i }).click();
  await expect(page.getByRole("button", { name: "Reset HTML Port Studio" })).toBeVisible();
  await page.getByRole("button", { name: "Reset HTML Port Studio" }).click();

  const sourceAnnouncement = page.locator('[aria-live="polite"]');
  await page.getByRole("tab", { name: "Upload HTML" }).click();
  await expect(sourceAnnouncement).toHaveText(
    "Previous source bundle cleared. New source: Upload HTML.",
  );
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "local-page.html",
    mimeType: "text/html",
    buffer: Buffer.from("<main>uploaded source</main>"),
  });
  await expect(page.getByText(/normalized locally/i)).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();

  await page.getByRole("tab", { name: "Upload ZIP" }).click();
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: "local-project.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(
      zipSync({ "index.html": Buffer.from("<main>zipped source</main>") }),
    ),
  });
  await expect(page.getByText(/normalized locally/i)).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();

  const events = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      recoveryAnalyticsEvents: Array<{ name: string; data: unknown }>;
    };
    return testWindow.recoveryAnalyticsEvents;
  });
  expect(events).toEqual(
    expect.arrayContaining([
      { name: "source_import_outcome", data: { source_type: "paste", outcome: "cancelled" } },
      { name: "source_import_outcome", data: { source_type: "paste", outcome: "completed" } },
      { name: "source_import_outcome", data: { source_type: "html", outcome: "completed" } },
      { name: "source_import_outcome", data: { source_type: "html", outcome: "cancelled" } },
      { name: "source_import_outcome", data: { source_type: "zip", outcome: "completed" } },
      { name: "source_import_outcome", data: { source_type: "zip", outcome: "cancelled" } },
    ]),
  );
  expect(events.every((event) => Object.keys(event.data ?? {}).sort().join(",") === "outcome,source_type")).toBe(true);
});

test("records one coarse failure for each remote source without request details", async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & {
      recoveryAnalyticsEvents: Array<{ name: string; data: unknown }>;
      umami?: {
        track(name: string, data?: Record<string, string | number | boolean>): void;
      };
    };
    testWindow.recoveryAnalyticsEvents = [];
    testWindow.umami = {
      track(name, data) {
        testWindow.recoveryAnalyticsEvents.push({ name, data: data ?? null });
      },
    };
  });
  await mockAuth(page);
  await page.route("**/api/port/github/repository**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(githubRepository),
    }),
  );
  await page.route("**/api/port/github/import", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: "GITHUB_FETCH_FAILED",
        error: "private source URL and provider response must not be tracked",
      }),
    }),
  );
  await page.route("**/api/port/hosted-url", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: "HOSTED_URL_FETCH_FAILED",
        error: "private source URL and provider response must not be tracked",
      }),
    }),
  );
  await page.route("**/api/port/playground/import", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: "PLAYGROUND_PROVIDER_UNAVAILABLE",
        error: "private source URL and provider response must not be tracked",
      }),
    }),
  );

  await page.goto("/");
  await openGithubImport(page);
  await page.getByRole("button", { name: "Fetch selected snapshot" }).click();
  await expect(page.getByText("GitHub import needs attention")).toBeVisible();

  await page.getByRole("tab", { name: /Import hosted URL/i }).click();
  await page.getByRole("textbox", { name: "Hosted page URL" }).fill("https://example.com/app");
  await page.getByRole("button", { name: "Fetch hosted HTML" }).click();
  await expect(page.getByText("Hosted page could not be imported")).toBeVisible();

  await page.getByRole("tab", { name: /Import CodePen \/ JSFiddle/i }).click();
  await page.getByRole("textbox", { name: "Public CodePen or JSFiddle URL" }).fill(
    "https://codepen.io/alice/pen/demo",
  );
  await page.getByRole("button", { name: "Import playground" }).click();
  await expect(page.getByText("Playground could not be imported")).toBeVisible();

  const events = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      recoveryAnalyticsEvents: Array<{ name: string; data: unknown }>;
    };
    return testWindow.recoveryAnalyticsEvents;
  });
  expect(events).toEqual(
    expect.arrayContaining([
      { name: "source_import_outcome", data: { source_type: "github", outcome: "failed" } },
      { name: "source_import_outcome", data: { source_type: "hosted", outcome: "failed" } },
      { name: "source_import_outcome", data: { source_type: "playground", outcome: "failed" } },
    ]),
  );
  expect(JSON.stringify(events)).not.toContain("private source URL");
  expect(JSON.stringify(events)).not.toContain("provider response");
  expect(events.every((event) => Object.keys(event.data ?? {}).sort().join(",") === "outcome,source_type")).toBe(true);
});

test("cancelling a pending playground import aborts the request and permits retry", async ({ page }) => {
  let importAttempts = 0;
  let releaseFirstImport: (() => void) | null = null;
  let firstImportRequest: import("@playwright/test").Request | null = null;
  let firstImportRequestAborted = false;
  await mockAuth(page);
  page.on("requestfailed", (request) => {
    if (request === firstImportRequest) {
      firstImportRequestAborted = true;
    }
  });
  await page.route("**/api/port/playground/import", (route) => {
    importAttempts += 1;
    if (importAttempts === 1) {
      firstImportRequest = route.request();
      return new Promise<void>((resolve) => {
        releaseFirstImport = () => {
          void route
            .fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(playgroundImport) })
            .then(resolve)
            .catch(resolve);
        };
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(playgroundImport),
    });
  });

  await page.goto("/");
  await page.getByRole("tab", { name: /Import CodePen \/ JSFiddle/i }).click();
  await page.getByRole("textbox", { name: "Public CodePen or JSFiddle URL" }).fill("https://codepen.io/alice/pen/demo");
  await page.getByRole("button", { name: "Import playground" }).click();
  await expect(page.getByRole("button", { name: "Importing..." })).toBeDisabled();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Playground import cancelled. You can retry the same URL.")).toBeVisible();
  await expect.poll(() => firstImportRequestAborted).toBe(true);

  await page.getByRole("button", { name: "Retry playground import" }).click();
  await expect(page.getByText("CodePen source normalized safely")).toBeVisible();
  expect(importAttempts).toBe(2);

  releaseFirstImport?.();
});

test("shows safe recovery details for every hosted and playground import failure", async ({ page }) => {
  let hostedFailure = hostedImportFailures[0];
  let playgroundFailure = playgroundImportFailures[0];
  await mockAuth(page);
  await page.route("**/api/port/hosted-url", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: hostedFailure[0],
        error: hostedFailure[1],
        action: hostedFailure[2],
        internal: "private upstream details must not render",
      }),
    }),
  );
  await page.route("**/api/port/playground/import", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        code: playgroundFailure[0],
        error: playgroundFailure[1],
        action: playgroundFailure[2],
        internal: "private provider details must not render",
      }),
    }),
  );

  await page.goto("/");
  await page.getByRole("tab", { name: /Import hosted URL/i }).click();
  const hostedUrlInput = page.getByRole("textbox", { name: "Hosted page URL" });
  const hostedButton = page.getByRole("button", { name: "Fetch hosted HTML" });
  for (const failure of hostedImportFailures) {
    hostedFailure = failure;
    await hostedUrlInput.fill("https://example.com/app");
    await hostedButton.click();
    await expect(page.getByText(failure[1], { exact: true })).toBeVisible();
    await expect(page.getByText(`Next step: ${failure[2]}`, { exact: true })).toBeVisible();
    await expect(page.getByText(/private upstream details must not render/i)).toHaveCount(0);
  }

  await page.getByRole("tab", { name: /Import CodePen \/ JSFiddle/i }).click();
  const playgroundUrlInput = page.getByRole("textbox", { name: "Public CodePen or JSFiddle URL" });
  const playgroundButton = page.getByRole("button", { name: "Import playground" });
  for (const failure of playgroundImportFailures) {
    playgroundFailure = failure;
    await playgroundUrlInput.fill("https://codepen.io/alice/pen/demo");
    await playgroundButton.click();
    await expect(page.getByText(failure[1], { exact: true })).toBeVisible();
    await expect(page.getByText(`Next step: ${failure[2]}`, { exact: true })).toBeVisible();
    await expect(page.getByText(/private provider details must not render/i)).toHaveCount(0);
  }
});

test("keeps actionable analysis errors visible in the Studio home alert", async ({ page }) => {
  await mockAuth(page);
  await page.route("**/api/port/analyze", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: "BUNDLE_ENTRYPOINT_MISSING",
        error: "internal entrypoint details",
      }),
    }),
  );

  await page.goto("/");
  await analyzeImportedHtml(page);
  await expect(page.getByText("Analysis needs attention")).toBeVisible();
  await expect(
    page.getByText(/selected main HTML file isn't included in the bundle/i),
  ).toBeVisible();
  await expect(page.getByText("internal entrypoint details")).not.toBeVisible();
});

test("stops handoff polling after an error and only resumes on retry", async ({ page }) => {
  const jobId = "123e4567-e89b-12d3-a456-426614174020";
  const browserSessionId = "123e4567-e89b-12d3-a456-426614174021";
  let statusChecks = 0;
  await mockAuthenticatedAuth(page);
  await seedRecovery(page, recoveryMetadata(jobId, browserSessionId));
  await page.route(`**/api/port/replit-projects/${jobId}`, (route) => {
    statusChecks += 1;
    if (statusChecks <= 4) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Polling unavailable" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createMcpHandoffStatus(jobId)),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).toBeVisible();
  await expect(page.getByText("Handoff status unavailable")).toBeVisible({ timeout: 15_000 });
  const checksWhenFailed = statusChecks;
  await page.waitForTimeout(1_200);
  expect(statusChecks).toBe(checksWhenFailed);
  await page.getByRole("button", { name: "Retry status check" }).click();
  await expect.poll(() => statusChecks).toBeGreaterThan(checksWhenFailed);
});

test("shows canonical skill recovery guidance and preserves completed steps", async ({ page }) => {
  const jobId = "123e4567-e89b-12d3-a456-426614174022";
  const browserSessionId = "123e4567-e89b-12d3-a456-426614174023";
  const canonicalError =
    "The authorized Replit project connection did not resolve the requested workspace skill identity. No skill contents or mirrors were sent. Reconnect the project-creation connection, then retry this step.";
  const failedSteps = [
    ["Port Authority", "completed", null],
    ["Failure Gate", "failed", canonicalError],
    ["Regression Guard", "pending", null],
    ["Skill Mirror Sync", "pending", null],
    ["App Support Ops", "pending", null],
    ["Poe Setup", "pending", null],
  ];

  await mockAuthenticatedAuth(page);
  await seedRecovery(page, recoveryMetadata(jobId, browserSessionId));
  await page.route(`**/api/port/replit-projects/${jobId}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createMcpHandoffStatus(jobId, {
        status: "failed",
        projectId: "project-1",
        currentStep: "Failure Gate",
        steps: failedSteps.map(([name, stepStatus, stepError]) => ({
          name,
          status: stepStatus as "pending" | "running" | "completed" | "failed",
          error: stepError,
        })),
        error: canonicalError,
      })),
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).toBeVisible();
  await expect(page.getByText("Canonical workspace skill resolution failed.")).toBeVisible();
  await expect(page.getByText("No skill contents or mirrors were sent.")).toBeVisible();
  await expect(page.getByText("The connector returned private skill contents.")).not.toBeVisible();
  await expect(page.getByText("Port Authority")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry step" })).toBeVisible();
});

test("[cross-browser] restores the active MCP recovery record after reload without exposing a token", async ({
  page,
}) => {
  const metadata = createMcpRecoveryFixture();
  await mockAuth(page);
  await seedMcpRecovery(page, metadata);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Resume MCP handoff reconciliation" })).toBeVisible();
  await expect(page.getByText(metadata.projectName, { exact: true })).toBeVisible();
  await expect(page.getByText(`source revision ${metadata.sourceRevision}`, { exact: false })).toBeVisible();
  await expect(page.getByText("destination-secret-token")).toHaveCount(0);

  await page.getByRole("button", { name: "Start with a new source" }).click();
  await expect(page.getByRole("heading", { name: "Resume MCP handoff reconciliation" })).not.toBeVisible();
  await expect(page.getByPlaceholder(/paste your html/i)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((storageKey) => sessionStorage.getItem(storageKey), MCP_HANDOFF_RECOVERY_STORAGE_KEY),
    )
    .toBeNull();
});

test("[cross-browser] recovers an in-progress authenticated handoff after reload", async ({ page }) => {
  const jobId = "123e4567-e89b-12d3-a456-426614174019";
  const browserSessionId = "123e4567-e89b-12d3-a456-426614174017";
  const status = createMcpHandoffStatus(jobId);
  let statusChecks = 0;
  let releaseReloadStatus: (() => void) | null = null;

  await mockAuthenticatedAuth(page);
  await seedRecovery(page, recoveryMetadata(jobId, browserSessionId));
  await page.route(`**/api/port/replit-projects/${jobId}`, (route) => {
    statusChecks += 1;
    if (statusChecks === 2) {
      return new Promise<void>((resolve) => {
        releaseReloadStatus = resolve;
      }).then(() =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(status),
        }),
      );
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(status),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).toBeVisible();
  await expect(page.getByText("running handoff")).toBeVisible();

  const recoveryBeforeReload = await page.evaluate(() => ({
    metadata: sessionStorage.getItem("html-port-studio:handoff-recovery"),
    browserSessionId: sessionStorage.getItem("html-port-studio:browser-session"),
  }));
  expect(JSON.parse(recoveryBeforeReload.metadata ?? "{}")).toMatchObject({
    jobId,
    ownerId: "e2e-user",
  });
  expect(recoveryBeforeReload.browserSessionId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  await page.reload();
  await expect.poll(() => releaseReloadStatus !== null).toBe(true);
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).toBeVisible();
  releaseReloadStatus?.();
  await expect(page.getByText("running handoff")).toBeVisible();
  await expect.poll(() => statusChecks).toBeGreaterThan(1);

  const recoveryAfterReload = await page.evaluate(() => ({
    metadata: sessionStorage.getItem("html-port-studio:handoff-recovery"),
    browserSessionId: sessionStorage.getItem("html-port-studio:browser-session"),
  }));
  expect(recoveryAfterReload).toEqual(recoveryBeforeReload);
});

test("[cross-browser] clears or surfaces completed, failed, stale, and foreign handoffs after reload", async ({
  page,
}) => {
  const browserSessionId = "123e4567-e89b-12d3-a456-426614174011";
  const records = {
    completed: "123e4567-e89b-12d3-a456-426614174012",
    failed: "123e4567-e89b-12d3-a456-426614174013",
    stale: "123e4567-e89b-12d3-a456-426614174014",
    foreignSession: "123e4567-e89b-12d3-a456-426614174015",
    foreignOwner: "123e4567-e89b-12d3-a456-426614174016",
    expired: "123e4567-e89b-12d3-a456-426614174018",
  };
  const statuses = new Map<string, "completed" | "failed" | "running">([
    [records.completed, "completed"],
    [records.failed, "failed"],
    [records.stale, "running"],
    [records.foreignSession, "running"],
    [records.foreignOwner, "running"],
  ]);

  await mockAuthenticatedAuth(page);
  await page.addInitScript((sessionId) => {
    sessionStorage.setItem("html-port-studio:browser-session", sessionId);
  }, browserSessionId);
  await page.route("**/api/port/replit-projects/*", (route) => {
    const jobId = new URL(route.request().url()).pathname.split("/").pop() ?? "";
    const status = statuses.get(jobId);
    if (!status) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          code: "PROJECT_HANDOFF_NOT_FOUND",
          error: "Not found",
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createMcpHandoffStatus(jobId, {
        status,
        projectId: status === "completed" ? "project-1" : null,
        currentStep: status === "failed" ? "Port Authority" : null,
        steps: status === "failed"
          ? [{ name: "Port Authority", status: "failed", error: "The setup step failed." }]
          : [],
        error: status === "failed" ? "The setup step failed." : null,
      })),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Import HTML App" })).toBeVisible();

  const reloadWithRecovery = async (
    jobId: string,
    overrides: Partial<{
      ownerId: string;
      browserSessionId: string;
      createdAt: number;
    }> = {},
  ) => {
    await writeRecovery(
      page,
      recoveryMetadata(
        jobId,
        overrides.browserSessionId ?? browserSessionId,
        {
          ownerId: overrides.ownerId,
          createdAt: overrides.createdAt,
        },
      ),
    );
    await page.reload();
  };

  await reloadWithRecovery(records.completed);
  await expect(page.getByRole("heading", { name: "Import HTML App" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).not.toBeVisible();
  await expect
    .poll(
      () => page.evaluate(() => sessionStorage.getItem("html-port-studio:handoff-recovery")),
      { timeout: 15_000 },
    )
    .toBeNull();

  await reloadWithRecovery(records.failed);
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).toBeVisible();
  await expect(page.getByText("failed handoff")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry step" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("html-port-studio:handoff-recovery")))
    .not.toBeNull();

  await reloadWithRecovery(records.stale, {
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  });
  await expect(page.getByRole("heading", { name: "Import HTML App" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("html-port-studio:handoff-recovery")))
    .toBeNull();

  await reloadWithRecovery(records.expired);
  await expect(page.getByRole("heading", { name: "Import HTML App" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Project setup status unavailable" })).toBeVisible();
  await expect(
    page.getByText("The project setup status is no longer available. Start again with a new source."),
  ).toBeVisible();
  await expect(page.getByText("Not found")).not.toBeVisible();
  await expect(page.getByText(/Imported HTML/i)).not.toBeVisible();
  await expect
    .poll(
      () => page.evaluate(() => sessionStorage.getItem("html-port-studio:handoff-recovery")),
      { timeout: 15_000 },
    )
    .toBeNull();
  await writeRecovery(page, recoveryMetadata(records.expired, browserSessionId));
  await page.getByRole("button", { name: "Start with a new source" }).click();
  await expect(page.getByRole("heading", { name: "Project setup status unavailable" })).not.toBeVisible();
  await expect(page.getByRole("tab", { name: "Paste HTML" })).toHaveAttribute("aria-selected", "true");
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("html-port-studio:handoff-recovery")))
    .toBeNull();

  await reloadWithRecovery(records.expired);
  await expect(page.getByRole("heading", { name: "Project setup status unavailable" })).toBeVisible();
  await page.getByRole("tab", { name: "Upload HTML" }).click();
  await expect(page.getByRole("heading", { name: "Project setup status unavailable" })).not.toBeVisible();
  await page.getByRole("tab", { name: "Paste HTML" }).click();
  await page.getByPlaceholder(/paste your html/i).fill("<main>Fresh source</main>");
  await expect(page.getByRole("heading", { name: "Project setup status unavailable" })).not.toBeVisible();

  await reloadWithRecovery(records.foreignSession, {
    browserSessionId: "123e4567-e89b-12d3-a456-426614174017",
  });
  await expect(page.getByRole("heading", { name: "Import HTML App" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("html-port-studio:handoff-recovery")))
    .toBeNull();

  await reloadWithRecovery(records.foreignOwner, { ownerId: "another-owner" });
  await expect(page.getByRole("heading", { name: "Import HTML App" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resume handoff status" })).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("html-port-studio:handoff-recovery")))
    .toBeNull();
});

test("keeps credential recovery analytics coarse across every browser outcome", async ({ page }) => {
  const credentialHtml =
    "<!doctype html><html><body><main>Local export</main><script>const apiKey = \"sk-proj-browser-download-secret\";</script></body></html>";
  const safeProposal =
    "The credential is removed.\n\nFILE_ID: file-1\n```html\n<!doctype html><html><body><h1>Safe patch</h1></body></html>\n```";
  let analysisAttempts = 0;

  await page.addInitScript(() => {
    const testWindow = window as typeof window & {
      recoveryAnalyticsEvents: Array<{ name: string; data: unknown }>;
      umami?: {
        track(name: string, data?: Record<string, string | number | boolean>): void;
      };
    };
    const events: Array<{ name: string; data: unknown }> = [];
    testWindow.recoveryAnalyticsEvents = events;
    testWindow.umami = {
      track(name, data) {
        events.push({ name, data: data ?? null });
      },
    };
  });
  await mockAuth(page);
  await page.route("**/api/port/analyze", (route) => {
    analysisAttempts += 1;
    if (analysisAttempts === 4) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "analysis-only-private-server-detail" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Imported page",
        bytes: credentialHtml.length,
        scriptCount: 1,
        externalScriptCount: 0,
        inlineScriptCount: 1,
        externalAssetCount: 0,
        aiSignalCount: 0,
        findings: [
          {
            severity: "error",
            title: "Private finding marker",
            detail: "finding-only-private-detail",
            action: "private-finding-action",
          },
        ],
        steps: [],
      }),
    });
  });
  await page.route("**/api/port/poe/models", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...poeModels(["Claude-Sonnet-4.6"]),
        message: "model-output-private-catalogue-detail",
      }),
    }),
  );
  await page.route("**/api/port/poe/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: safeProposal,
        model: "Claude-Sonnet-4.6",
        usage: { promptTokens: 12, completionTokens: 34 },
      }),
    }),
  );

  await page.goto("/");
  await page.getByPlaceholder(/paste your html/i).fill(credentialHtml);
  await page.getByRole("button", { name: /analyze/i }).click();
  const readinessFindings = page.getByRole("heading", { name: "Readiness Findings:" }).locator("..").locator("..");
  await expect(readinessFindings.getByText("Private finding marker", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Fix Code safely" }).click();
  await expect(page.getByRole("heading", { name: "Request a reviewed Claude proposal" })).toBeVisible();
  await page.getByLabel(/I confirm that only the complete redacted copy/i).check();
  await page.getByRole("button", { name: "Request redacted Claude repair" }).click();
  await expect(page.getByRole("heading", { name: "Review the untrusted proposal" })).toBeVisible();

  await page.getByRole("button", { name: "Reject proposal" }).click();
  await expect(page.getByRole("heading", { name: "Review the untrusted proposal" })).not.toBeVisible();

  await page.getByRole("button", { name: "Request redacted Claude repair" }).click();
  await expect(page.getByRole("heading", { name: "Review the untrusted proposal" })).toBeVisible();
  await page.getByRole("button", { name: "Apply reviewed patch" }).click();
  await page.getByRole("button", { name: "Confirm apply and re-scan" }).click();
  await expect(page.getByText("Reviewed patch applied in memory")).toBeVisible();

  await page.getByRole("button", { name: "Undo and restore original" }).click();
  await expect(page.getByRole("heading", { name: "Private finding marker" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request a reviewed Claude proposal" })).toBeVisible();
  await page.getByLabel(/I confirm that only the complete redacted copy/i).check();
  await page.getByRole("button", { name: "Request redacted Claude repair" }).click();
  await expect(page.getByRole("heading", { name: "Review the untrusted proposal" })).toBeVisible();
  await page.getByRole("button", { name: "Apply reviewed patch" }).click();
  await page.getByRole("button", { name: "Confirm apply and re-scan" }).click();
  await expect(page.getByRole("button", { name: "Retry analysis" })).toBeVisible();

  const analyticsEvents = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      recoveryAnalyticsEvents: Array<{ name: string; data: unknown }>;
    };
    return testWindow.recoveryAnalyticsEvents;
  });
  expect(analyticsEvents).toEqual([
    { name: "source_import_outcome", data: { source_type: "paste", outcome: "completed" } },
    { name: "credential_recovery_opened", data: null },
    { name: "credential_recovery_consent", data: null },
    { name: "credential_recovery_proposal_requested", data: null },
    { name: "credential_recovery_action", data: { action: "reject" } },
    { name: "credential_recovery_proposal_requested", data: null },
    { name: "credential_recovery_action", data: { action: "apply" } },
    { name: "credential_recovery_rescan", data: { result: "passed" } },
    { name: "credential_recovery_action", data: { action: "undo" } },
    { name: "source_import_outcome", data: { source_type: "paste", outcome: "completed" } },
    { name: "credential_recovery_opened", data: null },
    { name: "credential_recovery_consent", data: null },
    { name: "credential_recovery_proposal_requested", data: null },
    { name: "credential_recovery_action", data: { action: "apply" } },
    { name: "credential_recovery_rescan", data: { result: "failed" } },
  ]);
});

async function openEditor(
  page: import("@playwright/test").Page,
  source = "<main>Alpha</main>\n<p>Alpha</p>",
  findings: Array<{
    severity: "info" | "warning" | "error";
    title: string;
    detail: string;
    action: string;
  }> = [],
) {
  await mockAuth(page);
  await mockAnalysis(page, findings);
  await page.goto("/");
  await analyzeImportedHtml(page, source);
  await page.getByRole("tab", { name: "Source Editor" }).click();
  await expect(page.locator('[aria-label="Source Editor"]')).toBeVisible();
}

test("updates the sandbox preview from an edited entrypoint only after the editor change boundary", async ({ page }) => {
  const source = "<main id=\"preview-marker\">Before</main>";
  await openEditor(page, source);

  const preview = page.frameLocator('iframe[title="Preview"]');
  await page.getByRole("tab", { name: "Safe Preview" }).click();
  await expect(preview.locator("#preview-marker")).toHaveText("Before");

  await page.getByRole("tab", { name: "Source Editor" }).click();
  const editor = page.getByRole("textbox", { name: "Edit source file index.html" });
  await editor.fill("<main id=\"preview-marker\">After</main>");
  await expect(page.getByText("Analysis is out of date")).toBeVisible();
  await page.getByRole("tab", { name: "Safe Preview" }).click();
  await expect(preview.locator("#preview-marker")).toHaveText("After");
});

test("clears replaced editor feedback after re-analysis makes the report current", async ({ page }) => {
  await openEditor(page);

  const editor = page.getByRole("textbox", { name: "Edit source file index.html" });
  await editor.fill("<main>Edited</main>\n<p>Edited</p>");
  await expect(page.getByText("Unsaved source change is held in this browser tab.")).toBeVisible();

  await page.getByRole("button", { name: "Re-analyze source" }).click();
  await expect(page.getByRole("button", { name: "Analysis current" })).toBeVisible();
  await expect(page.getByText("Unsaved source change is held in this browser tab.")).not.toBeVisible();
  await expect(page.getByText("Unsaved changes")).not.toBeVisible();
  await expect(page.getByText("Analysis is out of date")).not.toBeVisible();

  await editor.fill("<main>Alpha</main>\n<p>Alpha</p>");
  await page.getByPlaceholder(/find \(ctrl\/cmd\+f\)/i).fill("Alpha");
  await page.getByPlaceholder("Replace with").fill("Omega");
  await page.getByRole("button", { name: "Replace all" }).click();
  await page.getByRole("button", { name: "Confirm replace all" }).click();
  await expect(page.getByText("Replaced 2 matches.")).toBeVisible();

  await page.getByRole("button", { name: "Re-analyze source" }).click();
  await expect(page.getByRole("button", { name: "Analysis current" })).toBeVisible();
  await expect(page.getByText("Replaced 2 matches.")).not.toBeVisible();
});

test("keeps stale editor feedback through a failed re-analysis and clears it after retry", async ({ page }) => {
  let analysisAttempts = 0;
  await mockAuth(page);
  await page.route("**/api/port/analyze", (route) => {
    analysisAttempts += 1;
    if (analysisAttempts === 2) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary analysis outage" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Imported page",
        bytes: html.length,
        scriptCount: 0,
        externalScriptCount: 0,
        inlineScriptCount: 0,
        externalAssetCount: 0,
        aiSignalCount: 0,
        findings: [],
        steps: [],
      }),
    });
  });

  await page.goto("/");
  await analyzeImportedHtml(page);
  await page.getByRole("tab", { name: "Source Editor" }).click();

  const editor = page.getByRole("textbox", { name: "Edit source file index.html" });
  await editor.fill("<main>Edited</main>\n<p>Edited</p>");
  await expect(page.getByText("Unsaved source change is held in this browser tab.")).toBeVisible();
  await page.getByRole("button", { name: "Re-analyze source" }).click();

  await expect(page.getByText("Analysis is out of date")).toBeVisible();
  await expect(page.getByRole("button", { name: "Re-analyze source" })).toBeVisible();
  await expect(page.getByText("Unsaved source change is held in this browser tab.")).toBeVisible();

  await page.getByRole("button", { name: "Re-analyze source" }).click();
  await expect(page.getByRole("button", { name: "Analysis current" })).toBeVisible();
  await expect(page.getByText("Analysis is out of date")).not.toBeVisible();
  await expect(page.getByText("Unsaved source change is held in this browser tab.")).not.toBeVisible();
  await expect(page.getByText("Unsaved changes")).not.toBeVisible();
  expect(analysisAttempts).toBe(3);
});

async function exerciseFindReplace(page: import("@playwright/test").Page) {
  await openEditor(page);
  const editor = page.getByRole("textbox", { name: "Edit source file index.html" });
  const find = page.getByPlaceholder(/find \(ctrl\/cmd\+f\)/i);
  const replace = page.getByPlaceholder("Replace with");

  await editor.click();
  await editor.press(process.platform === "darwin" ? "Meta+f" : "Control+f");
  await expect(find).toBeFocused();
  await find.fill("Alpha");
  await expect(page.getByRole("status")).toContainText("1 of 2");
  await find.press("Enter");
  await expect(editor).toHaveJSProperty("selectionStart", 22);

  await editor.press(process.platform === "darwin" ? "Meta+h" : "Control+h");
  await expect(find).toBeFocused();
  await replace.fill("Omega");
  await page.getByRole("button", { name: "Replace all" }).click();
  await expect(page.getByRole("alertdialog", { name: "Confirm replace all" })).toContainText("Replace 2 matches");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(editor).toHaveValue("<main>Alpha</main>\n<p>Alpha</p>");

  await page.getByRole("button", { name: "Replace all" }).click();
  await page.getByRole("button", { name: "Confirm replace all" }).click();
  await expect(editor).toHaveValue("<main>Omega</main>\n<p>Omega</p>");

  await find.fill("Not present");
  await expect(page.getByRole("status")).toHaveText("No matches");
}

test("[cross-browser] supports find and replace keyboard, confirmation, cancellation, and no-match states on desktop", async ({
  page,
}) => {
  await exerciseFindReplace(page);
});

test.describe("source editor on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("[cross-browser] keeps find and replace controls usable at a mobile width", async ({
    page,
  }) => {
    await exerciseFindReplace(page);
    await expect(page.getByRole("tab", { name: "Source Editor" })).toBeVisible();
  });
});

test("[cross-browser] downloads a single source file and ZIP locally, warning before credential-bearing exports", async ({
  page,
}) => {
  const credentialHtml =
    "<!doctype html><html><body><main>Local export</main><script>const apiKey = \"sk-proj-browser-download-secret\";</script></body></html>";
  await openEditor(page, credentialHtml);

  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) apiRequests.push(request.url());
  });

  await page.getByRole("button", { name: "Save file" }).click();
  await expect(page.getByText("Safety check before local download")).toBeVisible();
  await expect(page.getByText(/keep it local and rotate any real credential/i)).toBeVisible();
  const fileDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download anyway" }).click();
  const fileDownload = await fileDownloadPromise;
  expect(fileDownload.suggestedFilename()).toBe("index.html");

  await page.getByRole("button", { name: "Save bundle" }).click();
  await expect(page.getByText("Safety check before local download")).toBeVisible();
  const zipDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download anyway" }).click();
  const zipDownload = await zipDownloadPromise;
  expect(zipDownload.suggestedFilename()).toMatch(/\.zip$/);
  const zipBytes = await zipDownload.createReadStream();
  expect(zipBytes).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of zipBytes!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).subarray(0, 2).toString()).toBe("PK");
  expect(apiRequests.filter((url) => /analyze|poe|download/i.test(url))).toEqual([]);
});

const claudeFinding = [{
  severity: "warning" as const,
  title: "Legacy markup",
  detail: "Replace the legacy markup with the current structure.",
  action: "Update the main element.",
}];

function claudePatch(content: string, replacement: string) {
  return JSON.stringify({
    coveredFindingIndices: [0],
    edits: [{
      fileId: "file-1",
      findingIndex: 0,
      startLine: 1,
      endLine: 1,
      oldText: content,
      newText: replacement,
    }],
  });
}

async function openClaudeReview(
  page: import("@playwright/test").Page,
  source = "<main>Alpha</main>",
) {
  await mockAuth(page);
  await mockAnalysis(page, claudeFinding);
  await page.route("**/api/port/poe/models", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(poeModels(["Claude-Sonnet-4.6"])),
    }),
  );
  await page.goto("/");
  await analyzeImportedHtml(page, source);
  await page.getByRole("button", { name: "Fix with Claude" }).click();
  await expect(page.locator('[aria-label="Claude source repair review"]')).toBeVisible();
}

test("gates Claude on the exact live model and exhausts bounded attempts", async ({ page }) => {
  let chatAttempts = 0;
  await mockAuth(page);
  await mockAnalysis(page, claudeFinding);
  await page.route("**/api/port/poe/models", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(poeModels(["Claude-Sonnet-4.5"])),
    }),
  );
  await page.route("**/api/port/poe/chat", (route) => {
    chatAttempts += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: "{malformed" }),
    });
  });
  await page.goto("/");
  await analyzeImportedHtml(page, "<main>Alpha</main>");
  await page.getByRole("button", { name: "Fix with Claude" }).click();
  await expect(page.getByText("Exact Claude model unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request Claude patch" })).toBeDisabled();
  expect(chatAttempts).toBe(0);

  await page.unroute("**/api/port/poe/models");
  await page.route("**/api/port/poe/models", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(poeModels(["Claude-Sonnet-4.6"])),
    }),
  );
  await page.getByRole("button", { name: "Refresh model catalogue" }).click();
  await expect(page.getByText("0 of 3 attempts remaining")).not.toBeVisible();
  const requestButton = page.getByRole("button", { name: "Request Claude patch" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await requestButton.click();
    await expect.poll(() => chatAttempts).toBe(attempt + 1);
    await expect(page.getByText("Proposal withheld")).toBeVisible();
    if (attempt < 2) {
      await expect(page.getByText(`${2 - attempt} of 3 attempts remaining`)).toBeVisible();
    }
  }
  await expect(page.getByText("0 of 3 attempts remaining")).toBeVisible();
  await expect(requestButton).toBeDisabled();
  expect(chatAttempts).toBe(3);
});

test("[cross-browser] withholds malformed Claude patches and rejects a response that becomes stale", async ({
  page,
}) => {
  let resolveChat: (() => void) | null = null;
  await openClaudeReview(page);
  await page.route("**/api/port/poe/chat", (route) => {
    return new Promise<void>((resolve) => {
      resolveChat = () => {
        void route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ content: claudePatch("<main>Alpha</main>", "<main>Patched</main>") }),
        }).then(resolve);
      };
    });
  });
  await page.getByRole("button", { name: "Request Claude patch" }).click();
  await expect.poll(() => Boolean(resolveChat)).toBe(true);
  await page.getByRole("tab", { name: "Source Editor" }).click();
  const editor = page.getByRole("textbox", { name: "Edit source file index.html" });
  await editor.fill("<main>Changed while Claude worked</main>");
  resolveChat?.();
  await expect(editor).toHaveValue("<main>Changed while Claude worked</main>");
  await expect(page.getByText("Reviewed patch applied in memory")).not.toBeVisible();

  await page.getByRole("button", { name: "Re-analyze source" }).click();
  await expect(page.getByRole("button", { name: "Fix with Claude" })).toBeVisible();
  await page.getByRole("button", { name: "Fix with Claude" }).click();
  await expect(page.getByRole("button", { name: "Request Claude patch" })).toBeVisible();
  await page.unroute("**/api/port/poe/chat");
  await page.route("**/api/port/poe/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: "{malformed" }),
    }),
  );
  await page.getByRole("button", { name: "Request Claude patch" }).click();
  await expect(page.getByText("Proposal withheld")).toBeVisible();
  await expect(editor).toHaveValue("<main>Changed while Claude worked</main>");
});

test("[cross-browser] requires Claude review and explicit apply, then supports undo", async ({
  page,
}) => {
  const original = "<main>Alpha</main>";
  await openClaudeReview(page, original);
  await page.route("**/api/port/poe/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: claudePatch(original, "<main>Patched</main>") }),
    }),
  );
  await page.getByRole("button", { name: "Request Claude patch" }).click();
  await expect(page.getByRole("heading", { name: "Review Claude's untrusted patch" })).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Edit source file index.html" });
  await page.getByRole("tab", { name: "Source Editor" }).click();
  await expect(editor).toHaveValue(original);
  await page.getByRole("tab", { name: "Safe Preview" }).click();
  await page.getByRole("tab", { name: "Source Editor" }).click();
  await page.getByRole("button", { name: "Fix with Claude" }).click();
  await page.getByRole("button", { name: "Review and apply patch" }).click();
  await expect(page.getByRole("alertdialog", { name: "Confirm Claude patch" })).toBeVisible();
  await page.getByRole("button", { name: "Keep reviewing" }).click();
  await expect(editor).toHaveValue(original);
  await page.getByRole("button", { name: "Review and apply patch" }).click();
  await page.getByRole("button", { name: "Confirm apply" }).click();
  await expect(page.getByText("Analysis is out of date")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Edit source file index.html" })).toHaveValue("<main>Patched</main>");
  await page.getByRole("button", { name: "Undo and restore original" }).click();
  await expect(page.getByRole("tab", { name: "Source Editor" })).toBeVisible();
  await page.getByRole("tab", { name: "Source Editor" }).click();
  await expect(page.getByRole("textbox", { name: "Edit source file index.html" })).toHaveValue(original);
});
