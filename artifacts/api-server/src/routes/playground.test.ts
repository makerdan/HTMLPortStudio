import assert from "node:assert/strict";
import test from "node:test";
import {
  importPlayground,
  parsePlaygroundUrl,
  PlaygroundError,
} from "./playground.ts";

function response(body: string, url: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });
}

test("parses supported public CodePen and JSFiddle URL forms", () => {
  assert.deepEqual(parsePlaygroundUrl("https://codepen.io/alice/pen/demo"), {
    provider: "codepen",
    sourceUrl: "https://codepen.io/alice/pen/demo/",
    user: "alice",
    slug: "demo",
  });
  assert.deepEqual(parsePlaygroundUrl("https://jsfiddle.net/alice/demo/latest/"), {
    provider: "jsfiddle",
    sourceUrl: "https://jsfiddle.net/alice/demo/latest/",
    user: "alice",
    slug: "demo",
  });
  assert.equal(parsePlaygroundUrl("https://jsfiddle.net/demo/").user, null);
});

test("rejects unsupported forms, providers, protocols, and credential-like URLs", () => {
  for (const value of [
    "https://codepen.io/alice/collections/demo",
    "https://example.com/alice/demo",
    "http://codepen.io/alice/pen/demo",
    "https://codepen.io:443/alice/pen/demo?access_token=secret",
  ]) {
    assert.throws(() => parsePlaygroundUrl(value), PlaygroundError);
  }
});

test("normalizes CodePen exports into a portable attributed bundle", async () => {
  const calls: string[] = [];
  const result = await importPlayground("https://codepen.io/alice/pen/demo", {
    fetch: async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith(".html")) return response("<main>Hello</main>", url);
      if (url.endsWith(".css")) return response("main { color: red; }", url);
      return response("document.title = 'Demo';", url);
    },
  });

  assert.equal(result.provider, "codepen");
  assert.equal(result.bundle.sourceType, "playground");
  assert.deepEqual(result.bundle.files.map((file) => file.path), [
    "index.html",
    "styles.css",
    "script.js",
  ]);
  assert.match(result.bundle.files[0].content, /styles\.css/);
  assert.match(result.bundle.files[0].content, /script\.js/);
  assert.match(result.bundle.metadata.sourceUrl, /codepen\.io\/alice\/pen\/demo/);
  assert.match(result.warnings.join(" "), /settings|preprocessors/i);
  assert.equal(calls.length, 3);
});

test("normalizes the public JSFiddle result and reports its limitations", async () => {
  const result = await importPlayground("https://jsfiddle.net/alice/demo/", {
    fetch: async (input) => response("<!doctype html><html><body><button>Run</button></body></html>", String(input)),
  });

  assert.equal(result.provider, "jsfiddle");
  assert.deepEqual(result.bundle.files.map((file) => file.path), ["index.html"]);
  assert.match(result.warnings.join(" "), /rendered result|editor-only/i);
  assert.match(result.bundle.metadata.originalUrl, /jsfiddle\.net\/alice\/demo/);
});

test("does not pass empty or unavailable provider results into a bundle", async () => {
  await assert.rejects(
    () => importPlayground("https://codepen.io/alice/pen/empty", {
      fetch: async (input) => response("", String(input)),
    }),
    (error: unknown) => error instanceof PlaygroundError && error.code === "PLAYGROUND_EMPTY",
  );
  await assert.rejects(
    () => importPlayground("https://jsfiddle.net/alice/private", {
      fetch: async (input) => response("not found", String(input), 404),
    }),
    (error: unknown) => error instanceof PlaygroundError && error.code === "PLAYGROUND_EMPTY",
  );
});