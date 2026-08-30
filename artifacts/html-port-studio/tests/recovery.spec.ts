import { expect, test } from "@playwright/test";

const html = "<!doctype html><html><body><main>Imported page</main></body></html>";

async function mockAuth(page: import("@playwright/test").Page) {
  await page.route("**/__clerk/**", (route) => route.abort());
}

async function mockAuthenticatedAuth(page: import("@playwright/test").Page) {
  await mockAuth(page);
}

async function mockAnalysis(page: import("@playwright/test").Page) {
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
        findings: [],
        steps: [],
      }),
    }),
  );
}

async function analyzeImportedHtml(page: import("@playwright/test").Page) {
  await page.getByPlaceholder(/paste your html/i).fill(html);
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
        models: ["Claude-Sonnet-4.5"],
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
        model: "Claude-Sonnet-4.5",
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
