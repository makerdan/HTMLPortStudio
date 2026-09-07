import { SOURCE_TEXT_LIMIT_LABEL } from '../lib/source-limits.ts';

type AnalysisErrorData = {
  code?: unknown;
};

export type AnalysisErrorPresentation = {
  title: string;
  message: string;
  retryable: boolean;
};

const FALLBACK_ANALYSIS_ERROR: AnalysisErrorPresentation = {
  title: 'Analysis unavailable',
  message:
    "We couldn't reach the analysis service. Your HTML is still here. Check your connection and try again.",
  retryable: true,
};

const STRUCTURED_ANALYSIS_ERRORS: Record<string, string> = {
  BUNDLE_AMBIGUOUS:
    'Send either one HTML document or one source bundle, not both, then try again.',
  BUNDLE_EMPTY:
    'The source is empty. Paste or import a non-empty HTML document, then try again.',
  BUNDLE_TOO_LARGE:
    `This source bundle is too large to analyze safely. Keep the main HTML file and its files within ${SOURCE_TEXT_LIMIT_LABEL}, then try again.`,
  BUNDLE_FILE_TOO_LARGE:
    `One file in this bundle is too large. Reduce it to ${SOURCE_TEXT_LIMIT_LABEL} or less, then try again.`,
  BUNDLE_TOO_MANY_FILES:
    'This source bundle has too many files. Remove unused files and try again (200 files maximum).',
  BUNDLE_UNSAFE_PATH:
    "A bundle file path isn't safe to import. Use relative paths without '..' segments, then try again.",
  BUNDLE_DUPLICATE_PATH:
    'Two bundle files use the same path. Rename or remove the duplicate, then try again.',
  BUNDLE_ENTRYPOINT_MISSING:
    "The selected main HTML file isn't included in the bundle. Choose an existing HTML file, then try again.",
  BUNDLE_ENTRYPOINT_EMPTY:
    'The selected main HTML file is empty. Choose a non-empty HTML file, then try again.',
  SOURCE_CONTAINS_CREDENTIAL:
    'This source contains a service credential. Inspect the redacted finding and move the secret to a server-side environment before continuing.',
  INVALID_SOURCE_BUNDLE:
    'The source bundle is not valid. Check that it contains a non-empty main HTML file, then try again.',
};

function getStructuredErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return null;
  }

  const data = (error as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null || !('code' in data)) {
    return null;
  }

  const code = (data as AnalysisErrorData).code;
  return typeof code === 'string' ? code : null;
}

export function getAnalysisErrorPresentation(error: unknown): AnalysisErrorPresentation {
  const code = getStructuredErrorCode(error);
  const message = code ? STRUCTURED_ANALYSIS_ERRORS[code] : undefined;

  if (message) {
    return {
      title: 'Analysis needs attention',
      message,
      retryable: false,
    };
  }

  return FALLBACK_ANALYSIS_ERROR;
}