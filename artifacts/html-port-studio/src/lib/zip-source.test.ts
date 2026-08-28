import assert from 'node:assert/strict';
import test from 'node:test';
import { zipSync } from 'fflate';
import {
  ZipSourceError,
  chooseEntrypoint,
  findBundleDependencyWarnings,
  makeZipSourceBundle,
  normalizeArchivePath,
} from './zip-source.ts';

const text = (value: string) => new TextEncoder().encode(value);
const zip = (files: Record<string, string | Uint8Array>) =>
  zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [
        path,
        typeof content === 'string' ? text(content) : content,
      ]),
    ),
  );

function assertZipError(action: () => unknown, code: ZipSourceError['code']) {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof ZipSourceError);
    assert.equal(error.code, code);
    return true;
  });
}

test('imports nested HTML and common binary assets without leaving the browser bundle', () => {
  const bundle = makeZipSourceBundle(
    zip({
      'site/index.html': '<!doctype html><title>Nested App</title><img src="../assets/logo.png"><link href="./app.css">',
      'site/app.css': 'body { color: rebeccapurple; }',
      'assets/logo.png': new Uint8Array([137, 80, 78, 71]),
    }),
    'my-site.zip',
  );

  assert.equal(bundle.entrypoint, 'site/index.html');
  assert.equal(bundle.sourceType, 'zip_project');
  assert.equal(bundle.metadata.displayName, 'my-site');
  assert.match(bundle.files.find((file) => file.path === 'assets/logo.png')?.content ?? '', /^data:image\/png;base64,/);
  assert.deepEqual(bundle.metadata.warnings, undefined);
});

test('chooses root index first and exposes ambiguous HTML candidates for the picker', () => {
  const rootIndex = makeZipSourceBundle(
    zip({
      'index.html': '<title>Home</title>',
      'about.html': '<title>About</title>',
      'nested/page.html': '<title>Nested</title>',
    }),
    'app.zip',
  );
  assert.equal(rootIndex.entrypoint, 'index.html');

  const ambiguous = [
    { path: 'pages/home.html', content: '<title>Home</title>' },
    { path: 'pages/admin.html', content: '<title>Admin</title>' },
  ];
  assert.equal(chooseEntrypoint(ambiguous), null);
  const imported = makeZipSourceBundle(
    zip({
      'pages/home.html': '<title>Home</title>',
      'pages/admin.html': '<title>Admin</title>',
    }),
    'app.zip',
  );
  assert.equal(imported.entrypoint, 'pages/home.html');
  assert.match(imported.metadata.warnings?.[0] ?? '', /Multiple HTML entrypoints/);
});

test('reports missing and external dependencies without changing source files', () => {
  const files = [
    {
      path: 'pages/index.html',
      content:
        '<script src="../scripts/app.js"></script><img src="../images/missing.png"><script src="https://cdn.example/app.js"></script>',
    },
    { path: 'scripts/app.js', content: 'console.log("ok")' },
  ];
  const warnings = findBundleDependencyWarnings(files, 'pages/index.html');
  assert.match(warnings.join('\n'), /Missing local dependency "\.\.\/images\/missing\.png"/);
  assert.match(warnings.join('\n'), /External dependency "https:\/\/cdn\.example\/app\.js"/);
  assert.equal(files[0].content.includes('blob:'), false);
});

test('rejects unsafe names, duplicates, unsupported binaries, and malformed archives', () => {
  assertZipError(() => normalizeArchivePath('../outside.html'), 'ZIP_UNSAFE_PATH');
  assertZipError(() => normalizeArchivePath('/absolute.html'), 'ZIP_UNSAFE_PATH');
  assertZipError(() => normalizeArchivePath('C:/absolute.html'), 'ZIP_UNSAFE_PATH');
  assertZipError(() => normalizeArchivePath('safe/\0file.html'), 'ZIP_UNSAFE_PATH');
  assertZipError(
    () =>
      makeZipSourceBundle(
        zip({
          'index.html': '<title>App</title>',
          'a\\index.html': '<title>One</title>',
          'a/index.html': '<title>Duplicate</title>',
        }),
        'duplicate.zip',
      ),
    'ZIP_DUPLICATE_PATH',
  );
  assertZipError(
    () => makeZipSourceBundle(zip({ 'index.html': '<title>App</title>', 'unknown.bin': new Uint8Array([0, 1, 2]) }), 'binary.zip'),
    'ZIP_UNSUPPORTED_BINARY',
  );
  assertZipError(() => makeZipSourceBundle(new Uint8Array([0x50, 0x4b]), 'broken.zip'), 'ZIP_MALFORMED');
});

test('rejects archives whose expanded contents exceed the bundle limit', () => {
  const repeatedText = 'a'.repeat(900 * 1024);
  const files = Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => [`assets/chunk-${index}.txt`, repeatedText]),
  );
  assertZipError(
    () => makeZipSourceBundle(zip({ 'index.html': '<title>App</title>', ...files }), 'large.zip'),
    'ZIP_EXPANSION_TOO_LARGE',
  );
});
