import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertSourceLimitBoundary } from "./validate-api-codegen.mjs";

const adapterSource = readFileSync(
  new URL(
    "../artifacts/api-server/src/routes/source-limits.ts",
    import.meta.url,
  ),
  "utf8",
);
const openApiSource = readFileSync(
  new URL("../lib/api-spec/openapi.yaml", import.meta.url),
  "utf8",
);
const generatedSource = readFileSync(
  new URL("../lib/api-zod/src/generated/api.ts", import.meta.url),
  "utf8",
);

function replaceRequired(source, search, replacement) {
  assert.ok(source.includes(search), `Expected fixture text: ${search}`);
  return source.replace(search, replacement);
}

function assertDiagnostic(sources, expectedMessage) {
  assert.throws(
    () => assertSourceLimitBoundary(sources),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, expectedMessage);
      return true;
    },
  );
}

test("accepts synchronized adapter, OpenAPI, and generated limits", () => {
  assert.equal(
    assertSourceLimitBoundary({
      adapterSource,
      openApiSource,
      generatedSource,
    }),
    2_097_152,
  );
});

test("reports adapter limit drift with the repair instruction", () => {
  const mismatchedAdapter = replaceRequired(
    adapterSource,
    "SOURCE_TEXT_MAX_BYTES = 2_097_152",
    "SOURCE_TEXT_MAX_BYTES = 2_097_151",
  );

  assertDiagnostic(
    {
      adapterSource: mismatchedAdapter,
      openApiSource,
      generatedSource,
    },
    /artifacts\/api-server\/src\/routes\/source-limits\.ts uses 2097151 bytes.*Update the adapter and contract together.*pnpm --filter @workspace\/api-spec run codegen/s,
  );
});

test("reports OpenAPI property drift with the relevant fields", () => {
  const mismatchedOpenApi = replaceRequired(
    openApiSource,
    "    HtmlInput:\n      type: object\n      properties:\n        html:\n          type: string\n          minLength: 1\n          maxLength: 2097152",
    "    HtmlInput:\n      type: object\n      properties:\n        html:\n          type: string\n          minLength: 1\n          maxLength: 2097151",
  );

  assertDiagnostic(
    {
      adapterSource,
      openApiSource: mismatchedOpenApi,
      generatedSource,
    },
    /HtmlInput\.html.*Update SourceBundleFile\.content, HtmlInput\.html, and ReplitProjectInput\.html together/s,
  );
});

test("reports generated API limit drift with the export and repair instruction", () => {
  const mismatchedGenerated = replaceRequired(
    generatedSource,
    "export const analyzeHtmlBodyThreeHtmlMax = 2097152;",
    "export const analyzeHtmlBodyThreeHtmlMax = 2097151;",
  );

  assertDiagnostic(
    {
      adapterSource,
      openApiSource,
      generatedSource: mismatchedGenerated,
    },
    /analyzeHtmlBodyThreeHtmlMax.*Regenerate API sources and update the contract or adapter together/s,
  );
});
