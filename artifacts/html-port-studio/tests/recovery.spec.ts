import { expect, test } from "@playwright/test";

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

async function mockAuth(page: import("@playwright/test").Page) {
  await page.route("**/__clerk/**", (route) => route.abort());
}

async function mockAuthenticatedAuth(page: import("@playwright/test").Page) {
  await mockAuth(page);
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
      body: JSON.stringify({ configured: true, models: ["Claude-3.5-Sonnet"] }),
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
      body: JSON.stringify({ configured: true, models: ["Claude-3.5-Sonnet"] }),
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
  await expect(page.getByText("Create a Replit Project")).toBeVisible();
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
  await mockAuth(page);
  await page.route("**/api/port/github/repository**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(githubRepository) }),
  );
  await page.route("**/api/port/github/import", (route) => {
    importAttempts += 1;
    if (importAttempts === 1) {
      return new Promise<void>((resolve) => {
        releaseFirstImport = () => {
          void route
            .fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(githubImport) })
            .then(resolve);
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
  await openGithubImport(page);
  const freshFetchButton = page.getByRole("button", { name: "Fetch selected snapshot" });
  await expect(freshFetchButton).toBeEnabled();
  await freshFetchButton.click();
  await expect(page.getByText("Review this read-only snapshot")).toBeVisible();
  expect(importAttempts).toBe(2);

  releaseFirstImport?.();
  await expect(page.getByText("Review this read-only snapshot")).toBeVisible();
});

test("starting over clears a failed GitHub import so it can be retried cleanly", async ({ page }) => {
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
    page.getByText(/selected entrypoint isn't included in the bundle/i),
  ).toBeVisible();
  await expect(page.getByText("internal entrypoint details")).not.toBeVisible();
});

test("stops handoff polling after an error and only resumes on retry", async ({ page }) => {
  let statusChecks = 0;
  await mockAuthenticatedAuth(page);
  await mockAnalysis(page);
  await page.route("**/api/port/poe/models", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configured: true, models: ["Claude-3.5-Sonnet"] }),
    }),
  );
  await page.route("**/api/port/replit-project-connection", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) }),
  );
  await page.route("**/api/port/replit-projects", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jobId: "job-1", status: "queued", steps: [] }),
    }),
  );
  await page.route("**/api/port/replit-projects/job-1", (route) => {
    statusChecks += 1;
    if (statusChecks > 5) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jobId: "job-1", status: "queued", steps: [] }),
      });
    }
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Polling unavailable" }),
    });
  });

  await page.goto("/");
  await analyzeImportedHtml(page);
  await page.getByRole("button", { name: "Create Replit Project" }).click();
  await expect(page.getByText("Project handoff unavailable")).toBeVisible({ timeout: 15_000 });
  const checksWhenFailed = statusChecks;
  await page.waitForTimeout(1_200);
  expect(statusChecks).toBe(checksWhenFailed);
  await page.getByRole("button", { name: "Retry status check" }).click();
  await expect.poll(() => statusChecks).toBeGreaterThan(checksWhenFailed);
});

test("keeps credential recovery analytics coarse across every browser outcome", async ({ page }) => {
  const credentialHtml =
    '<!doctype html><html><body><script>const apiKey = "super-secret-browser-value";</script><h1>Private finding marker</h1></body></html>';
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
        configured: true,
        models: ["Claude-Sonnet-4.6"],
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
  await expect(page.getByText("Private finding marker")).toBeVisible();

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
    { name: "credential_recovery_opened", data: null },
    { name: "credential_recovery_consent", data: null },
    { name: "credential_recovery_proposal_requested", data: null },
    { name: "credential_recovery_action", data: { action: "reject" } },
    { name: "credential_recovery_proposal_requested", data: null },
    { name: "credential_recovery_action", data: { action: "apply" } },
    { name: "credential_recovery_rescan", data: { result: "passed" } },
    { name: "credential_recovery_action", data: { action: "undo" } },
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

test("supports find and replace keyboard, confirmation, cancellation, and no-match states on desktop", async ({ page }) => {
  await exerciseFindReplace(page);
});

test.describe("source editor on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps find and replace controls usable at a mobile width", async ({ page }) => {
    await exerciseFindReplace(page);
    await expect(page.getByRole("tab", { name: "Source Editor" })).toBeVisible();
  });
});

test("downloads a single source file and ZIP locally, warning before credential-bearing exports", async ({ page }) => {
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
      body: JSON.stringify({ configured: true, models: ["Claude-Sonnet-4.6"] }),
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
      body: JSON.stringify({ configured: true, models: ["Claude-Sonnet-4.5"] }),
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
      body: JSON.stringify({ configured: true, models: ["Claude-Sonnet-4.6"] }),
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

test("withholds malformed Claude patches and rejects a response that becomes stale", async ({ page }) => {
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

test("requires Claude review and explicit apply, then supports undo", async ({ page }) => {
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
