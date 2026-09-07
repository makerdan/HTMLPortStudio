import { expect, test } from "@playwright/test";

const sourceModes = [
  { value: "html", tab: /Upload HTML/i },
  { value: "paste", tab: /Paste HTML/i },
  { value: "zip", tab: /Upload ZIP/i },
  { value: "github", tab: /Import GitHub repository/i },
  { value: "hosted", tab: /Import hosted URL/i },
  { value: "playground", tab: /Import CodePen \/ JSFiddle/i },
] as const;

async function assertSourceEntrypointFocus(page: import("@playwright/test").Page) {
  for (const source of sourceModes) {
    await page.getByRole("tab", { name: source.tab }).click();
    await expect(page.locator(`[data-source-entrypoint="${source.value}"]`)).toBeFocused();
  }
}

test.describe("source entrypoint focus on desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("moves focus to the first control for every source mode", async ({ page }) => {
    await page.route("**/__clerk/**", (route) => route.abort());
    await page.goto("/");
    await assertSourceEntrypointFocus(page);
  });
});

test.describe("source entrypoint focus on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("moves focus to the first control for every source mode", async ({ page }) => {
    await page.route("**/__clerk/**", (route) => route.abort());
    await page.goto("/");
    await assertSourceEntrypointFocus(page);
  });
});

test("does not move focus when an import finishes", async ({ page }) => {
  await page.route("**/__clerk/**", (route) => route.abort());
  await page.route("**/api/port/hosted-url", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    }),
  );

  await page.goto("/");
  await page.getByRole("tab", { name: /Import hosted URL/i }).click();
  const hostedUrl = page.locator('[data-source-entrypoint="hosted"]');
  await expect(hostedUrl).toBeFocused();
  await hostedUrl.fill("https://example.com/app");
  await hostedUrl.press("Enter");
  await expect(page.getByText("Hosted page fetched safely")).toBeVisible();
  await expect(hostedUrl).toBeFocused();
});