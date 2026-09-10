import { defineConfig, devices } from "@playwright/test";

const rawPort = process.env.PLAYWRIGHT_PORT ?? "5173";
const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PLAYWRIGHT_PORT value: "${rawPort}"`);
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node ../../scripts/free-ports.mjs ${port} && BASE_PATH=/ PORT=${port} VITE_CLERK_PUBLISHABLE_KEY= VITE_STUDIO_E2E_AUTH=true pnpm run dev`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
  },
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
