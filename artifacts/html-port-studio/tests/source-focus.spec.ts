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

async function applyRenderedBrowserZoom(
  page: import("@playwright/test").Page,
  zoom: 0.75 | 1.5,
) {
  await page.evaluate((value) => {
    document.documentElement.style.zoom = `${value * 100}%`;
    document.documentElement.dataset.testZoom = `${value * 100}%`;
  }, zoom);
  await expect(page.locator("html")).toHaveAttribute("data-test-zoom", `${zoom * 100}%`);
}

async function assertSourceChoicesReachable(page: import("@playwright/test").Page) {
  for (const label of ["Import GitHub repository", "Import CodePen / JSFiddle"]) {
    const tab = page.getByRole("tab", { name: new RegExp(label, "i") });
    const labelBox = tab.locator(".source-mode-choice__label").first();
    await expect(tab).toBeVisible();
    await expect(labelBox).toContainText(label);
    await expect
      .poll(() => labelBox.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
      .toBe(true);

    const layout = await tab.evaluate((element) => {
      const tabBox = element.getBoundingClientRect();
      const labelElement = element.querySelector(".source-mode-choice__label");
      const labelRect = labelElement?.getBoundingClientRect();
      return {
        tab: {
          left: tabBox.left,
          right: tabBox.right,
          top: tabBox.top,
          bottom: tabBox.bottom,
          width: tabBox.width,
          height: tabBox.height,
        },
        label: {
          width: labelRect?.width ?? 0,
          height: labelRect?.height ?? 0,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(layout.label.width).toBeGreaterThan(0);
    expect(layout.label.height).toBeGreaterThan(0);
    expect(layout.tab.left).toBeGreaterThanOrEqual(-1);
    expect(layout.tab.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.tab.top).toBeGreaterThanOrEqual(-1);
    expect(layout.tab.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(layout.overflow).toBeLessThanOrEqual(1);

    await tab.focus();
    await expect(tab).toBeFocused();
    const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);
    if (hasTouch) {
      await page.touchscreen.tap(
        layout.tab.left + layout.tab.width / 2,
        layout.tab.top + layout.tab.height / 2,
      );
    } else {
      await tab.click();
    }
    await expect(tab).toHaveAttribute("aria-selected", "true");
  }
}

test("[cross-browser] keeps source choices readable without document overflow at supported widths", async ({
  page,
}) => {
  await page.route("**/__clerk/**", (route) => route.abort());
  await page.goto("/");

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);

    const documentWidth = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(documentWidth.body).toBeLessThanOrEqual(documentWidth.viewport + 1);
    expect(documentWidth.document).toBeLessThanOrEqual(documentWidth.viewport + 1);

    for (const label of ["Import GitHub repository", "Import CodePen / JSFiddle"]) {
      const tab = page.getByRole("tab", { name: new RegExp(label, "i") });
      await expect(tab).toBeVisible();
      const labelBox = tab.locator(".source-mode-choice__label").first();
      await expect(labelBox).toContainText(label);
      await expect
        .poll(() =>
          labelBox.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        )
        .toBe(true);
    }
  }
});

test("[cross-browser] [headed-zoom] keeps source choices readable and reachable at 75% and 150% zoom", async ({
  page,
}) => {
  await page.route("**/__clerk/**", (route) => route.abort());
  await page.goto("/");

  for (const zoom of [0.75, 1.5] as const) {
    await applyRenderedBrowserZoom(page, zoom);
    await assertSourceChoicesReachable(page);
  }
});

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