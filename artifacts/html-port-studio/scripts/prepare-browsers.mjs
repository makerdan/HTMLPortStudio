import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium, firefox } from "@playwright/test";

const browsers = [
  { name: "Chromium", type: chromium },
  { name: "Firefox", type: firefox },
];

export function classifyBrowserSetupError(error, executableExists) {
  const message = String(error?.message ?? error ?? "");

  if (
    !executableExists ||
    /executable does not exist|executable doesn't exist|browser.*not installed|please run.*install/i.test(
      message,
    )
  ) {
    return "browser-download";
  }

  if (
    /shared librar|error while loading|host system is missing dependencies|failed to launch|lib[a-z0-9_.-]+\.so|no such file or directory/i.test(
      message,
    )
  ) {
    return "native-runtime";
  }

  return "unknown";
}

export function setupDiagnostic(browser, kind, detail = "") {
  const suffix = detail ? `\n  Detail: ${detail}` : "";

  if (kind === "browser-download") {
    return `[playwright-setup] ${browser} browser download is missing or incomplete.
  Action: run pnpm --filter @workspace/html-port-studio run prepare:browsers, then rerun the browser suite.${suffix}`;
  }

  if (kind === "native-runtime") {
    return `[playwright-setup] ${browser} started without the native runtime libraries it needs.
  Action: restore the browser libraries listed in .replit, restart the workspace, and rerun the browser suite.${suffix}`;
  }

  return `[playwright-setup] ${browser} could not start before the tests opened a page.
  Action: inspect the setup detail below and repair the workspace browser/runtime prerequisites; product assertions are not being reclassified.${suffix}`;
}

function installBrowsers() {
  const result = spawnSync("playwright", ["install", "chromium", "firefox"], {
    cwd: process.cwd(),
    stdio: "inherit",
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Playwright browser download exited with status ${result.status}.`);
  }
}

async function verifyBrowser(browser) {
  const executablePath = browser.type.executablePath();
  if (!existsSync(executablePath)) {
    console.error(setupDiagnostic(browser.name, "browser-download"));
    return false;
  }

  let instance;
  try {
    instance = await browser.type.launch({ headless: true });
    await instance.close();
    return true;
  } catch (error) {
    const kind = classifyBrowserSetupError(error, true);
    console.error(setupDiagnostic(browser.name, kind, error?.message));
    if (instance) {
      await instance.close().catch(() => {});
    }
    return false;
  }
}

export async function main() {
  installBrowsers();
  const results = await Promise.all(browsers.map(verifyBrowser));
  if (results.some((result) => !result)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    for (const browser of browsers) {
      console.error(
        setupDiagnostic(browser.name, classifyBrowserSetupError(error, false), error?.message),
      );
    }
    process.exitCode = 1;
  }
}