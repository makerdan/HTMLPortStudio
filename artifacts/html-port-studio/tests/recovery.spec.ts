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