import assert from 'node:assert/strict';
import test from 'node:test';
import type { SourceBundle } from '@workspace/api-client-react';
import {
  EDITOR_LIMITS,
  applyValidatedClaudePatch,
  createSourceBundleZip,
  findSourceMatches,
  replaceAllSourceMatches,
  safeDownloadFilename,
  validateClaudePatchResponse,
} from './source-editor.ts';
import { unzipSync } from 'fflate';

const bundle: SourceBundle = {
  version: 1,
  sourceType: 'zip_project',
  files: [
    { path: 'index.html', content: '<main>old</main>\n<footer>keep</footer>' },
    { path: 'assets/app.js', content: 'console.log("old");' },
  ],
  entrypoint: 'index.html',
  metadata: { displayName: 'Editor fixture' },
};

test('finds literal text by default and reports synchronized line numbers', () => {
  const result = findSourceMatches(bundle.files[0].content, {
    query: 'old',
    caseSensitive: false,
    regex: false,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.matches.map((match) => match.line), [1]);
});

test('rejects invalid and unsafe regular expressions without throwing', () => {
  assert.equal(findSourceMatches('a'.repeat(100), {
    query: '[',
    caseSensitive: false,
    regex: true,
  }).ok, false);
  assert.equal(findSourceMatches('a'.repeat(100), {
    query: '(a+)+',
    caseSensitive: false,
    regex: true,
  }).ok, false);
});

test('requires confirmation for ambiguous replacement and caps match work', () => {
  const result = replaceAllSourceMatches('x x x', {
    query: 'x',
    caseSensitive: true,
    regex: false,
  }, 'y');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.requiresConfirmation, true);
    assert.equal(result.count, 3);
  }
  const bounded = findSourceMatches('x'.repeat(EDITOR_LIMITS.maxMatches + 1), {
    query: 'x',
    caseSensitive: true,
    regex: false,
  });
  assert.equal(bounded.ok, true);
  if (bounded.ok) assert.equal(bounded.truncated, true);
});

test('sanitizes local download names and preserves normalized bundle paths', () => {
  assert.equal(safeDownloadFilename('../secret:name.html'), 'secret-name.html');
  const archive = createSourceBundleZip(bundle);
  const extracted = unzipSync(archive);
  assert.equal(new TextDecoder().decode(extracted['index.html']), bundle.files[0].content);
  assert.equal(new TextDecoder().decode(extracted['assets/app.js']), bundle.files[1].content);
});

test('withholds malformed, unknown-file, incomplete, and credential-bearing patches', () => {
  const finding = [{ severity: 'warning', title: 'Old markup', detail: 'Replace old markup', action: 'Update it' }] as const;
  const base = {
    coveredFindingIndices: [0],
    edits: [{
      fileId: 'file-1',
      findingIndex: 0,
      startLine: 1,
      endLine: 1,
      oldText: '<main>old</main>',
      newText: '<main>new</main>',
    }],
  };
  const valid = validateClaudePatchResponse(JSON.stringify(base), bundle, finding);
  assert.equal(valid.ok, true);
  if (valid.ok) {
    const next = applyValidatedClaudePatch(bundle, valid.edits);
    assert.equal(next?.files[0]?.content, '<main>new</main>\n<footer>keep</footer>');
  }
  assert.equal(validateClaudePatchResponse('{bad', bundle, finding).ok, false);
  assert.equal(validateClaudePatchResponse(JSON.stringify({
    ...base,
    edits: [{ ...base.edits[0], fileId: 'file-99' }],
  }), bundle, finding).ok, false);
  assert.equal(validateClaudePatchResponse(JSON.stringify({
    ...base,
    coveredFindingIndices: [],
  }), bundle, finding).ok, false);
  assert.equal(validateClaudePatchResponse(JSON.stringify({
    ...base,
    edits: [{ ...base.edits[0], newText: 'const apiKey = "sk-proj-secret-value";' }],
  }), bundle, finding).ok, false);
});