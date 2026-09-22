import { expect, test } from "@playwright/test";
import {
  createMcpTransferConfirmationFixture,
  createMcpTransferCreatedFixture,
  createMcpTransferFixture,
  mcpFixtureSource,
} from "./mcp-fixtures";

const source = mcpFixtureSource;
const transfer = createMcpTransferFixture();

test("guides an authenticated owner through MCP creation and exact-file transfer", async ({ page }) => {
  let confirmationBody: Record<string, unknown> | null = null;
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
      body: JSON.stringify(createMcpTransferCreatedFixture()),
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
  await page.route("**/api/port/bundle-transfers/*/confirm-project", (route) => {
    confirmationBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createMcpTransferConfirmationFixture()),
    });
  });

  await page.goto("/");
  await page.getByPlaceholder(/paste your html/i).fill(source);
  await page.getByRole("button", { name: /Analyze & Preview/i }).click();

  await expect(page.getByText("Guided MCP project handoff")).toBeVisible();
  await page.getByRole("button", { name: "Create secure transfer package" }).click();
  await expect(page.getByRole("heading", { name: "Reconcile the MCP result before creating anything else" })).toBeVisible();
  const prompt = page.locator("pre").filter({ hasText: "external Replit MCP client" });
  await expect(prompt).toBeVisible();
  await expect(prompt).not.toContainText(source);
  await expect(prompt).not.toContainText("destination-secret-token");
  await expect(page.getByText("Save the destination secret privately")).toBeVisible();

  await page.getByRole("button", { name: "I found multiple matches" }).click();
  await expect(page.getByRole("heading", { name: "Multiple matching projects need a choice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confirmed zero matches: MCP creation prompt" })).toHaveCount(0);
  await page.getByRole("button", { name: "I found no match" }).click();
  await expect(page.getByRole("heading", { name: "Confirmed zero matches: MCP creation prompt" })).toBeVisible();
  await page.getByLabel("One confirmed — Returned Replit project ID").fill("project-123");
  await page.getByLabel("Returned Replit project URL").fill("https://replit.com/@owner/demo");
  await page.getByRole("button", { name: "Confirm selected project" }).click();
  await expect.poll(() => confirmationBody).toEqual({
    projectId: "project-123",
    projectUrl: "https://replit.com/@owner/demo",
  });
  await page.getByRole("combobox", { name: "Project creation status" }).click();
  await expect(page.getByRole("option", { name: "Verified" })).toBeVisible();
  await page.getByRole("option", { name: "Verified" }).click();
  for (const label of ["Bundle import status", "Exact-source verification status", "Runtime verification status"]) {
    await page.getByRole("combobox", { name: label }).click();
    await page.getByRole("option", { name: "Verified" }).click();
  }

  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox", { name: "Runtime verification status" })).toContainText("Verified");
  await page.getByRole("button", { name: "Reset HTML Port Studio" }).click();
  await expect(page.getByPlaceholder(/paste your html/i)).toBeVisible();
  await expect(page.getByText("Guided MCP project handoff")).toHaveCount(0);
});