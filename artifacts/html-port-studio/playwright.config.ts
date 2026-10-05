import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { resolveApiHealthUrl } from "./scripts/api-health-check.mjs";

const rawPort = process.env.PLAYWRIGHT_PORT ?? "5173";
const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PLAYWRIGHT_PORT value: "${rawPort}"`);
}

const serverUrl = `http://127.0.0.1:${port}`;
const apiHealthUrl = resolveApiHealthUrl();
const apiPort = new URL(apiHealthUrl).port;
const apiServerDirectory = fileURLToPath(new URL("../api-server/", import.meta.url));
const studioDirectory = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  globalSetup: "./tests/api-health.global-setup.mjs",
  globalTimeout: 12 * 60 * 1000,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: serverUrl,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        `PORT=${apiPort} NODE_ENV=development pnpm run build && ` +
        `PORT=${apiPort} NODE_ENV=development node --enable-source-maps dist/index.mjs`,
      cwd: apiServerDirectory,
      url: apiHealthUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        `BASE_PATH=/ PORT=${port} VITE_CLERK_PUBLISHABLE_KEY= ` +
        `VITE_STUDIO_E2E_AUTH=true pnpm exec vite --config vite.config.ts ` +
        `--host 127.0.0.1 --strictPort`,
      cwd: studioDirectory,
      url: `${serverUrl}/`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-recovery",
      grep: /\[cross-browser\]/,
      workers: 1,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-recovery",
      grep: /\[mobile\]/,
      workers: 1,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "chromium-headed-zoom",
      grep: /\[headed-zoom\]/,
      workers: 1,
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        hasTouch: true,
      },
    },
    {
      name: "firefox-headed-zoom",
      grep: /\[headed-zoom\]/,
      workers: 1,
      use: {
        ...devices["Desktop Firefox"],
        headless: false,
        hasTouch: true,
      },
    },
  ],
});
