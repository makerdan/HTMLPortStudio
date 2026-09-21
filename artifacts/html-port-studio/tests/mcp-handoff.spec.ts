import { expect, test } from "@playwright/test";

const source = "<!doctype html><html><head><title>Demo app</title></head><body><main>Imported page</main></body></html>";
const bundle = {
  version: 1,
  sourceType: "pasted_html",
  files: [{ path: "index.html", content: source }],
  entrypoint: "index.html",
  metadata: { displayName: "Demo app" },
};
const manifest = {
  version: 1,
  sourceType: "pasted_html",
  entrypoint: "index.html",
  fileCount: 1,
  totalBytes: new TextEncoder().encode(source).length,
  files: [{ path: "index.html", bytes: new TextEncoder().encode(source).length, sha256: "a".repeat(64) }],
  bundleSha256: "b".repeat(64),
};
const transfer = {
  transferId: "123e4567-e89b-12d3-a456-426614174000",
  manifestHash: "c".repeat(64),
  manifest,
  expiresAt: "2099-01-01T00:00:00.000Z",
  retrievalLimit: 1,
  retrievalCount: 0,
  state: "active",
  revokedAt: null,
  completedAt: null,
  createdAt: "2026-09-21T00:00:00.000Z",
};

test("guides an authenticated owner through MCP creation and exact-file transfer", async ({ page }) => {
  await page.route("**/__clerk/**", (route) => route.abort());
  await page.route("**/api/port/analyze", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Demo app",
        bytes: source.length,
        totalBytes: source.length,
        sourceType: "pasted_html",
        entrypoint: "index.html",
        fileCount: 1,
        files: ["index.html"],
        localAssetReferences: [],
        externalDependencies: [],
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
  await page.route("**/api/port/bundle-transfers", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ...transfer, transferToken: "destination-secret-token" }),
    }),
  );
  await page.route("**/api/port/bundle-transfers/*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(transfer),
      });
    }
    return route.continue();
  });

  await page.goto("/");
  await page.getByPlaceholder(/paste your html/i).fill(source);
  await page.getByRole("button", { name: /Analyze & Preview/i }).click();

  await expect(page.getByText("Guided MCP project handoff")).toBeVisible();
  await page.getByRole("button", { name: "Create secure transfer package" }).click();
  await expect(page.getByRole("heading", { name: "MCP project-creation prompt" })).toBeVisible();
  const prompt = page.locator("pre").filter({ hasText: "external Replit MCP client" });
  await expect(prompt).toBeVisible();
  await expect(prompt).not.toContainText("destination-secret-token");
  await expect(page.getByText("Save the destination secret privately")).toBeVisible();

  await page.getByLabel("Returned Replit project ID").fill("project-123");
  await page.getByLabel("Returned Replit project URL").fill("https://replit.com/@owner/demo");
  await page.getByRole("button", { name: "Save project identity" }).click();
  await page.getByRole("combobox", { name: "Project creation status" }).click();
  await expect(page.getByRole("option", { name: "Verified" })).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Reset HTML Port Studio" }).click();
  await expect(page.getByPlaceholder(/paste your html/i)).toBeVisible();
  await expect(page.getByText("Guided MCP project handoff")).toHaveCount(0);
});