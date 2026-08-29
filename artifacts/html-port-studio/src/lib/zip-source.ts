import { unzipSync } from 'fflate';
import type { SourceBundle, SourceBundleFile } from '@workspace/api-client-react';
import {
  SOURCE_TEXT_LIMIT_LABEL,
  SOURCE_TEXT_MAX_BYTES,
} from './source-limits.ts';

export const ZIP_LIMITS = {
  archiveBytes: 25 * 1024 * 1024,
  expandedBytes: 8 * 1024 * 1024,
  normalizedBytes: SOURCE_TEXT_MAX_BYTES,
  fileCount: 200,
  fileBytes: SOURCE_TEXT_MAX_BYTES,
} as const;

const HTML_EXTENSIONS = ['.html', '.htm'];
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.csv',
  '.cjs',
  '.html',
  '.htm',
  '.js',
  '.json',
  '.jsx',
  '.map',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
  '.xml',
]);
const BINARY_MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svgz': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export type ZipSourceErrorCode =
  | 'ZIP_EMPTY'
  | 'ZIP_TOO_LARGE'
  | 'ZIP_MALFORMED'
  | 'ZIP_UNSUPPORTED'
  | 'ZIP_ENCRYPTED'
  | 'ZIP_UNSAFE_PATH'
  | 'ZIP_DUPLICATE_PATH'
  | 'ZIP_TOO_MANY_FILES'
  | 'ZIP_EXPANSION_TOO_LARGE'
  | 'ZIP_FILE_TOO_LARGE'
  | 'ZIP_UNSUPPORTED_BINARY'
  | 'ZIP_NO_HTML';

export class ZipSourceError extends Error {
  readonly code: ZipSourceErrorCode;

  constructor(code: ZipSourceErrorCode, message: string) {
    super(message);
    this.name = 'ZipSourceError';
    this.code = code;
  }
}

type CentralEntry = {
  rawName: string;
  path: string;
  compressedSize: number;
  expandedSize: number;
  compressionMethod: number;
  flags: number;
  localHeaderOffset: number;
  isDirectory: boolean;
  isSymlink: boolean;
};

const readU16 = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8);
const readU32 = (bytes: Uint8Array, offset: number) =>
  (bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)) >>> 0;

function zipError(code: ZipSourceErrorCode, detail: string): ZipSourceError {
  return new ZipSourceError(code, detail);
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const start = Math.max(0, bytes.length - 22 - 0xffff);
  for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
    if (readU32(bytes, offset) === 0x06054b50) return offset;
  }
  throw zipError('ZIP_MALFORMED', 'This file does not contain a readable ZIP directory.');
}

function decodeName(bytes: Uint8Array, flags: number): string {
  try {
    return new TextDecoder('utf-8', { fatal: Boolean(flags & 0x800) }).decode(bytes);
  } catch {
    throw zipError('ZIP_UNSAFE_PATH', 'A ZIP filename is not valid UTF-8.');
  }
}

export function normalizeArchivePath(rawPath: string): string {
  if (rawPath.includes('\0')) {
    throw zipError('ZIP_UNSAFE_PATH', 'The archive contains a filename with a null byte.');
  }

  const normalized = rawPath.normalize('NFC').replaceAll('\\', '/');
  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:\//.test(normalized) ||
    normalized.includes('//')
  ) {
    throw zipError(
      'ZIP_UNSAFE_PATH',
      `The archive contains an unsafe path "${rawPath}". Use relative filenames inside the ZIP.`,
    );
  }

  const segments = normalized.split('/');
  if (
    segments.some((segment) => segment === '' || segment === '.' || segment === '..') ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw zipError(
      'ZIP_UNSAFE_PATH',
      `The archive contains an unsafe path "${rawPath}". Paths cannot use traversal, empty segments, or control characters.`,
    );
  }
  return normalized;
}

function readCentralEntries(bytes: Uint8Array): CentralEntry[] {
  const endOffset = findEndOfCentralDirectory(bytes);
  const diskNumber = readU16(bytes, endOffset + 4);
  const centralDisk = readU16(bytes, endOffset + 6);
  const entryCount = readU16(bytes, endOffset + 10);
  const centralSize = readU32(bytes, endOffset + 12);
  const centralOffset = readU32(bytes, endOffset + 16);

  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entryCount === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    throw zipError('ZIP_UNSUPPORTED', 'ZIP64 and multi-volume archives are not supported.');
  }
  if (centralOffset + centralSize > bytes.length || centralOffset < 0) {
    throw zipError('ZIP_MALFORMED', 'The ZIP directory extends beyond the uploaded file.');
  }

  const entries: CentralEntry[] = [];
  const seen = new Set<string>();
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || readU32(bytes, offset) !== 0x02014b50) {
      throw zipError('ZIP_MALFORMED', 'The ZIP directory contains a truncated entry.');
    }

    const flags = readU16(bytes, offset + 8);
    const compressionMethod = readU16(bytes, offset + 10);
    const compressedSize = readU32(bytes, offset + 20);
    const expandedSize = readU32(bytes, offset + 24);
    const nameLength = readU16(bytes, offset + 28);
    const extraLength = readU16(bytes, offset + 30);
    const commentLength = readU16(bytes, offset + 32);
    const localHeaderOffset = readU32(bytes, offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    const nextOffset = nameEnd + extraLength + commentLength;

    if (nextOffset > bytes.length || nextOffset > centralOffset + centralSize) {
      throw zipError('ZIP_MALFORMED', 'The ZIP directory contains a truncated filename or comment.');
    }

    const rawName = decodeName(bytes.subarray(nameStart, nameEnd), flags);
    const isDirectory = rawName.endsWith('/');
    const pathName = rawName.replace(/\/+$/, '');
    if (isDirectory && !pathName) {
      offset = nextOffset;
      continue;
    }
    const path = normalizeArchivePath(pathName);
    const madeByUnix = (readU16(bytes, offset + 4) >> 8) === 3;
    const unixMode = readU32(bytes, offset + 38) >>> 16;
    const isSymlink = madeByUnix && (unixMode & 0xf000) === 0xa000;

    if (seen.has(path)) {
      throw zipError('ZIP_DUPLICATE_PATH', `The archive contains duplicate path "${path}".`);
    }
    seen.add(path);
    if (flags & 1) {
      throw zipError('ZIP_ENCRYPTED', `The archive entry "${path}" is encrypted.`);
    }
    if (isSymlink) {
      throw zipError('ZIP_UNSAFE_PATH', `The archive entry "${path}" is a symbolic link.`);
    }
    if (compressionMethod !== 0 && compressionMethod !== 8) {
      throw zipError(
        'ZIP_UNSUPPORTED',
        `The archive entry "${path}" uses an unsupported compression method.`,
      );
    }
    if (localHeaderOffset >= bytes.length) {
      throw zipError('ZIP_MALFORMED', `The archive entry "${path}" points outside the uploaded file.`);
    }

    entries.push({
      rawName,
      path,
      compressedSize,
      expandedSize,
      compressionMethod,
      flags,
      localHeaderOffset,
      isDirectory,
      isSymlink,
    });
    offset = nextOffset;
  }
  return entries;
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    result += alphabet[first >> 2];
    result += alphabet[((first & 3) << 4) | (second === undefined ? 0 : second >> 4)];
    result += second === undefined
      ? '=='
      : alphabet[((second & 15) << 2) | (third === undefined ? 0 : third >> 6)] +
        (third === undefined ? '=' : alphabet[third & 63]);
  }
  return result;
}

function mimeTypeFor(path: string): string | null {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  return BINARY_MIME_TYPES[extension] ?? null;
}

function decodeSourceFile(path: string, bytes: Uint8Array): string {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  const mimeType = mimeTypeFor(path);
  if (mimeType) {
    return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
  }

  const isTextExtension = TEXT_EXTENSIONS.has(extension);
  try {
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (bytes.includes(0)) throw new Error('binary');
    return content;
  } catch {
    if (isTextExtension) {
      throw zipError(
        'ZIP_UNSUPPORTED_BINARY',
        `The text file "${path}" is not valid UTF-8 and cannot be safely imported.`,
      );
    }
    throw zipError(
      'ZIP_UNSUPPORTED_BINARY',
      `The binary file "${path}" is not a supported image, font, audio, or video asset.`,
    );
  }
}

export function getHtmlEntrypointTitle(content: string, path: string): string {
  const title = content.match(/<title\b[^>]*>\s*([^<]+?)\s*<\/title>/i)?.[1]?.trim();
  return title || path.split('/').pop()?.replace(/\.(html?)$/i, '') || path;
}

function resolveLocalReference(basePath: string, reference: string): string | null {
  const trimmed = reference.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:')
  ) {
    return null;
  }
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(trimmed)) return null;

  try {
    const cleanReference = decodeURIComponent(trimmed.split('#')[0].split('?')[0]);
    const baseSegments = basePath.split('/');
    baseSegments.pop();
    for (const segment of cleanReference.replaceAll('\\', '/').split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') {
        if (!baseSegments.length) return null;
        baseSegments.pop();
      } else {
        baseSegments.push(segment);
      }
    }
    return baseSegments.join('/');
  } catch {
    return null;
  }
}

export function findBundleDependencyWarnings(
  files: SourceBundleFile[],
  entrypoint: string,
): string[] {
  const entry = files.find((file) => file.path === entrypoint);
  if (!entry) return [];
  const paths = new Set(files.map((file) => file.path));
  const warnings = new Set<string>();
  const references = [
    ...entry.content.matchAll(
      /\b(?:src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    ),
  ].map((match) => match[1] ?? match[2] ?? match[3]);
  for (const reference of references) {
    const trimmedReference = reference.trim();
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(trimmedReference)) {
      if (!/^(?:data:|blob:|mailto:|javascript:|about:)/i.test(trimmedReference)) {
        warnings.add(`External dependency "${trimmedReference}" is not bundled and may not load in preview.`);
      }
      continue;
    }
    const resolved = resolveLocalReference(entrypoint, trimmedReference);
    if (resolved && !paths.has(resolved)) {
      warnings.add(`Missing local dependency "${trimmedReference}" referenced by ${entrypoint}.`);
    }
  }
  return [...warnings].slice(0, 20);
}

export function chooseEntrypoint(files: SourceBundleFile[]): string | null {
  const htmlFiles = files.filter((file) =>
    HTML_EXTENSIONS.some((extension) => file.path.toLowerCase().endsWith(extension)),
  );
  const rootIndex = htmlFiles.find((file) => file.path === 'index.html');
  if (rootIndex) return rootIndex.path;
  const rootCandidates = htmlFiles.filter((file) => !file.path.includes('/'));
  if (rootCandidates.length === 1) return rootCandidates[0].path;
  if (htmlFiles.length === 1) return htmlFiles[0].path;
  return null;
}

export function makeZipSourceBundle(
  bytes: Uint8Array | ArrayBuffer,
  displayName: string,
): SourceBundle {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!input.length) throw zipError('ZIP_EMPTY', 'The ZIP file is empty.');
  if (input.length > ZIP_LIMITS.archiveBytes) {
    throw zipError(
      'ZIP_TOO_LARGE',
      `This ZIP is ${formatZipBytes(input.length)}. Choose an archive no larger than 25 MB.`,
    );
  }

  let entries: CentralEntry[];
  try {
    entries = readCentralEntries(input);
  } catch (error) {
    if (error instanceof ZipSourceError) throw error;
    throw zipError('ZIP_MALFORMED', 'The ZIP archive could not be read. It may be malformed.');
  }

  const fileEntries = entries.filter((entry) => !entry.isDirectory);
  if (!fileEntries.length) {
    throw zipError('ZIP_EMPTY', 'The ZIP contains no files. Add an HTML app and try again.');
  }
  if (fileEntries.length > ZIP_LIMITS.fileCount) {
    throw zipError(
      'ZIP_TOO_MANY_FILES',
      `This ZIP contains ${fileEntries.length} files. Choose an archive with no more than 200 files.`,
    );
  }

  const expandedSize = fileEntries.reduce((sum, entry) => sum + entry.expandedSize, 0);
  if (expandedSize > ZIP_LIMITS.expandedBytes) {
    throw zipError(
      'ZIP_EXPANSION_TOO_LARGE',
      `This ZIP expands to ${formatZipBytes(expandedSize)}. Choose an archive that expands to no more than 8 MB.`,
    );
  }
  for (const entry of fileEntries) {
    if (entry.expandedSize > ZIP_LIMITS.fileBytes) {
      throw zipError(
        'ZIP_FILE_TOO_LARGE',
        `The file "${entry.path}" is larger than ${SOURCE_TEXT_LIMIT_LABEL} after extraction.`,
      );
    }
    if (
      entry.expandedSize > 256 * 1024 &&
      entry.compressedSize > 0 &&
      entry.expandedSize / entry.compressedSize > 1000
    ) {
      throw zipError(
        'ZIP_EXPANSION_TOO_LARGE',
        `The file "${entry.path}" has an unsafe compression ratio and was not extracted.`,
      );
    }
  }

  let extracted: Record<string, Uint8Array>;
  try {
    extracted = unzipSync(input) as Record<string, Uint8Array>;
  } catch {
    throw zipError('ZIP_MALFORMED', 'The ZIP archive could not be extracted. It may be malformed.');
  }

  const files: SourceBundleFile[] = [];
  let normalizedBytes = 0;
  for (const entry of fileEntries) {
    const data = extracted[entry.rawName] ?? extracted[entry.path];
    if (!data || data.length !== entry.expandedSize) {
      throw zipError(
        'ZIP_MALFORMED',
        `The extracted contents for "${entry.path}" do not match the ZIP directory.`,
      );
    }
    const content = decodeSourceFile(entry.path, data);
    const normalizedFileBytes = new TextEncoder().encode(content).length;
    if (normalizedFileBytes > ZIP_LIMITS.fileBytes) {
      throw zipError(
        'ZIP_FILE_TOO_LARGE',
        `The normalized file "${entry.path}" is larger than ${SOURCE_TEXT_LIMIT_LABEL}. Remove or resize this asset and try again.`,
      );
    }
    normalizedBytes += normalizedFileBytes;
    if (normalizedBytes > ZIP_LIMITS.normalizedBytes) {
      throw zipError(
        'ZIP_TOO_LARGE',
        `The imported source is larger than ${SOURCE_TEXT_LIMIT_LABEL} after normalization. Remove unused assets and try again.`,
      );
    }
    files.push({ path: entry.path, content });
  }

  const htmlFiles = files.filter((file) =>
    HTML_EXTENSIONS.some((extension) => file.path.toLowerCase().endsWith(extension)),
  );
  const detectedEntrypoint = chooseEntrypoint(files);
  const entrypoint = detectedEntrypoint ?? htmlFiles[0]?.path;
  if (!entrypoint) {
    throw zipError('ZIP_NO_HTML', 'No .html or .htm entrypoint was found in this ZIP.');
  }

  const warnings = [
    ...(detectedEntrypoint ? [] : ['Multiple HTML entrypoints found. Choose the page to preview before analyzing.']),
    ...findBundleDependencyWarnings(files, entrypoint),
  ].slice(0, 20);
  return {
    version: 1,
    sourceType: 'zip_project',
    files,
    entrypoint,
    metadata: {
      displayName: displayName.replace(/\.zip$/i, '') || 'ZIP HTML app',
      warnings: warnings.length ? warnings : undefined,
    },
  };
}

export function formatZipBytes(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / 1024 ** unit).toFixed(unit ? 1 : 0))} ${units[unit]}`;
}

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
};

function mimeTypeForPreview(path: string): string {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[extension] ?? 'text/plain';
}

function previewReference(entrypoint: string, reference: string, urls: Map<string, string>): string | null {
  const resolved = resolveLocalReference(entrypoint, reference);
  return resolved ? urls.get(resolved) ?? null : null;
}

export function createSafePreviewHtml(
  bundle: SourceBundle,
): { html: string; revoke: () => void } {
  const urls = new Map<string, string>();
  const createdUrls: string[] = [];
  for (const file of bundle.files) {
    if (file.path === bundle.entrypoint) continue;
    if (file.content.startsWith('data:')) {
      urls.set(file.path, file.content);
      continue;
    }
    const url = URL.createObjectURL(new Blob([file.content], { type: mimeTypeForPreview(file.path) }));
    urls.set(file.path, url);
    createdUrls.push(url);
  }

  const entry = bundle.files.find((file) => file.path === bundle.entrypoint);
  const html = entry?.content.replace(
    /\b(src|href|poster)\s*=\s*(["'])(.*?)\2/gi,
    (whole, attribute: string, quote: string, reference: string) => {
      const replacement = previewReference(bundle.entrypoint, reference, urls);
      return replacement ? `${attribute}=${quote}${replacement}${quote}` : whole;
    },
  ) ?? '';

  return {
    html,
    revoke: () => createdUrls.forEach((url) => URL.revokeObjectURL(url)),
  };
}
