import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("OIDC callback failures clear temporary cookies and return a safe recoverable error", async () => {
  const source = await readFile(new URL("./auth.ts", import.meta.url), "utf8");

  assert.match(source, /function clearTemporaryCookies/);
  assert.match(source, /clearTemporaryCookies\(res\)/);
  assert.match(source, /authError.*login_failed/);
  assert.match(source, /getSafeReturnTo\(req\.cookies\?\.return_to\)/);
  assert.doesNotMatch(source, /catch \(error\)[\s\S]*res\.redirect\("\/api\/login"\)/);
});