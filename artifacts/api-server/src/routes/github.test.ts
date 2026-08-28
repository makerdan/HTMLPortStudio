import test from "node:test";
import assert from "node:assert/strict";
import {
  entrypointCandidates,
  isIgnoredPath,
  isSafeGithubPath,
  isSafeGithubRef,
  isSupportedTextPath,
  parseGithubUrl,
  pathDepth,
} from "./github-utils.ts";

test("accepts only canonical public GitHub repository URLs", () => {
  assert.deepEqual(parseGithubUrl("https://github.com/acme/demo.git"), {
    owner: "acme",
    repo: "demo",
    sourceUrl: "https://github.com/acme/demo",
  });
  assert.throws(
    () => parseGithubUrl("https://api.github.com/repos/acme/demo"),
    /Only public repositories hosted/,
  );
  assert.throws(
    () => parseGithubUrl("https://github.com/acme/demo/blob/main/index.html"),
    /repository URL, not a file/,
  );
  assert.throws(
    () => parseGithubUrl("https://github.com/acme/demo?ref=main"),
    /Only public repositories hosted/,
  );
});

test("rejects unsafe refs and repository paths before fetching", () => {
  assert.equal(isSafeGithubRef("main"), true);
  assert.equal(isSafeGithubRef("feature/accessible-ui"), true);
  assert.equal(isSafeGithubRef("a".repeat(40)), true);
  assert.equal(isSafeGithubRef("../main"), false);
  assert.equal(isSafeGithubRef("main?download=1"), false);
  assert.equal(isSafeGithubPath("src/index.html"), true);
  assert.equal(isSafeGithubPath("../secrets.env"), false);
  assert.equal(isSafeGithubPath("src//index.html"), false);
  assert.equal(isSafeGithubPath("src/"), false);
});

test("filters generated content and approved text file types", () => {
  assert.equal(isSupportedTextPath("index.html"), true);
  assert.equal(isSupportedTextPath("styles.css"), true);
  assert.equal(isSupportedTextPath("assets/logo.png"), false);
  assert.equal(isIgnoredPath("node_modules/react/index.js"), true);
  assert.equal(isIgnoredPath("src/index.html"), false);
  assert.equal(pathDepth("src/pages/index.html"), 2);
});

test("prefers a root HTML entrypoint and surfaces ambiguity", () => {
  assert.deepEqual(
    entrypointCandidates([
      "src/app.html",
      "about.html",
      "index.html",
      "index.htm",
      "README.md",
    ]),
    ["index.html", "index.htm", "about.html", "src/app.html"],
  );
});