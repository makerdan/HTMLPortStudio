import assert from "node:assert/strict";
import test from "node:test";
import {
  POE_CAPABILITIES,
  PoeProviderError,
  isPoeModelConfirmed,
  parseCompletion,
  poeRequest,
  validateCatalogue,
} from "./poe-provider.ts";

test("registry records text-only contracts and explicit unavailable capabilities", () => {
  assert.equal(POE_CAPABILITIES["gemini-repair"].contract, "text-only");
  assert.equal(POE_CAPABILITIES["claude-repair"].privacyClass, "redacted-source");
  assert.equal(POE_CAPABILITIES["generic-assistant"].capabilities.vision, "unavailable");
  assert.equal(POE_CAPABILITIES["generic-assistant"].capabilities.streaming, "unavailable");
});

test("catalogue validation and model identity are exact", () => {
  assert.deepEqual(validateCatalogue({ data: [{ id: "Claude-Sonnet-4.6" }] }), ["Claude-Sonnet-4.6"]);
  assert.equal(isPoeModelConfirmed(["Claude-Sonnet-4.6"], "claude-sonnet-4.6"), false);
  assert.throws(() => validateCatalogue({ data: [{ name: "missing id" }] }), (error: unknown) =>
    error instanceof PoeProviderError && error.code === "POE_CATALOGUE_INVALID",
  );
});

test("completion parsing rejects provider diagnostics and malformed payloads", () => {
  assert.deepEqual(parseCompletion({
    model: "model",
    choices: [{ message: { content: "answer" } }],
  }).content, "answer");
  assert.throws(() => parseCompletion({ error: { message: "private diagnostic" } }), (error: unknown) =>
    error instanceof PoeProviderError && error.code === "POE_COMPLETION_INVALID",
  );
});

test("missing configuration is normalized before network access", async () => {
  const previous = process.env.POE_API_KEY2;
  delete process.env.POE_API_KEY2;
  try {
    await assert.rejects(() => poeRequest("/models"), (error: unknown) =>
      error instanceof PoeProviderError && error.code === "POE_NOT_CONFIGURED",
    );
  } finally {
    if (previous === undefined) delete process.env.POE_API_KEY2;
    else process.env.POE_API_KEY2 = previous;
  }
});

test("redirect responses are rejected without following the location", async () => {
  const previousKey = process.env.POE_API_KEY2;
  const previousFetch = globalThis.fetch;
  process.env.POE_API_KEY2 = "test-key";
  process.env.NODE_ENV = "test";
  process.env.POE_API_BASE_URL = "http://poe.test/v1";
  globalThis.fetch = async () => new Response(null, {
    status: 302,
    headers: { location: "https://private.example/" },
  });
  try {
    await assert.rejects(() => poeRequest("/models"), (error: unknown) =>
      error instanceof PoeProviderError && error.code === "POE_REDIRECT_REJECTED",
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.POE_API_KEY2;
    else process.env.POE_API_KEY2 = previousKey;
  }
});