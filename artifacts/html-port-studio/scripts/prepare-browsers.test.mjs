import assert from "node:assert/strict";
import test from "node:test";
import { getMissingBrowsers } from "./prepare-browsers.mjs";

const browsers = [
  { name: "Chromium", type: { executablePath: () => "/cache/chromium" } },
  { name: "Firefox", type: { executablePath: () => "/cache/firefox" } },
];

test("detects when both managed browser engines are installed", () => {
  const missing = getMissingBrowsers(browsers, () => true);

  assert.deepEqual(missing, []);
});

test("reports missing managed browser engines before installation", () => {
  const missing = getMissingBrowsers(
    browsers,
    (executablePath) => executablePath === "/cache/chromium",
  );

  assert.deepEqual(
    missing.map(({ name }) => name),
    ["Firefox"],
  );
});