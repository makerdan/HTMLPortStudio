import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  getPlaygroundProvider,
  PLAYGROUND_PROVIDERS,
  validatePlaygroundUrl,
} from './source-adapters.ts';

test('recognizes only the supported public playground providers', () => {
  assert.deepEqual(PLAYGROUND_PROVIDERS.map((provider) => provider.id), ['codepen', 'jsfiddle']);
  assert.equal(getPlaygroundProvider('https://codepen.io/alice/pen/demo'), 'codepen');
  assert.equal(getPlaygroundProvider('https://www.jsfiddle.net/alice/demo/'), 'jsfiddle');
  assert.equal(getPlaygroundProvider('https://example.com/alice/demo'), null);
  assert.equal(getPlaygroundProvider('javascript:alert(1)'), null);
});

test('validates provider URL forms and rejects credential-bearing links', () => {
  assert.equal(validatePlaygroundUrl('https://codepen.io/alice/pen/demo'), null);
  assert.equal(validatePlaygroundUrl('https://jsfiddle.net/alice/demo/'), null);
  assert.match(
    validatePlaygroundUrl('https://codepen.io/alice/collections/demo') ?? '',
    /form https:\/\/codepen\.io/i,
  );
  assert.match(
    validatePlaygroundUrl('https://jsfiddle.net/alice/demo?access_token=secret') ?? '',
    /credential-like/i,
  );
  assert.match(
    validatePlaygroundUrl('https://example.com/app') ?? '',
    /not supported/i,
  );
});

test('keeps playground fetching server-side and routes through the generated API hook', async () => {
  const source = await readFile(new URL('../pages/home.tsx', import.meta.url), 'utf8');
  assert.match(source, /useImportPlayground/);
  assert.match(source, /handlePlaygroundImport/);
  assert.match(source, /provider-specific server adapter/);
  assert.doesNotMatch(source, /fetch\(playgroundUrl/);
  assert.match(source, /sessionId !== importSessionRef\.current/);
  assert.match(source, /setPlaygroundImportData\(data\)/);
});