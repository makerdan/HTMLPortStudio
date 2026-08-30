import { SOURCE_TEXT_LIMIT_LABEL } from '../lib/source-limits.ts';

type ErrorData = {
  code?: unknown;
};

export const STUDIO_ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Log in to continue with this Replit project action.',
  BUNDLE_AMBIGUOUS:
    'Send either one HTML document or one source bundle, not both, then try again.',
  BUNDLE_DUPLICATE_PATH:
    'Two bundle files use the same path. Rename or remove the duplicate, then try again.',
  BUNDLE_EMPTY:
    'The source is empty. Paste or import a non-empty HTML document, then try again.',
  BUNDLE_ENTRYPOINT_EMPTY:
    'The selected entrypoint is empty. Choose a non-empty HTML file, then try again.',
  BUNDLE_ENTRYPOINT_MISSING:
    "The selected entrypoint isn't included in the bundle. Choose an existing HTML entrypoint, then try again.",
  BUNDLE_FILE_TOO_LARGE:
    `One file in this bundle is too large. Reduce it to ${SOURCE_TEXT_LIMIT_LABEL} or less, then try again.`,
  BUNDLE_TOO_LARGE:
    `This source bundle is too large. Reduce it to ${SOURCE_TEXT_LIMIT_LABEL} or less, then try again.`,
  BUNDLE_TOO_MANY_FILES:
    'This source bundle has too many files. Remove unused files and try again (200 files maximum).',
  BUNDLE_UNSAFE_PATH:
    "A bundle file path isn't safe to import. Use relative paths without '..' segments, then try again.",
  CHAT_CONTAINS_CREDENTIAL:
    'This request contains a service credential. Remove it before sending content to the assistant, then try again.',
  CSRF_ORIGIN_REJECTED: 'Refresh the Studio and try the request again.',
  POE_MODEL_UNAVAILABLE:
    'The requested Poe model is no longer available. Refresh model availability, then try again.',
  INVALID_PROJECT_HANDOFF:
    'The project handoff input is invalid. Check the imported HTML and try again.',
  PROJECT_CREATION_CONNECTION_UNAVAILABLE:
    'Replit project creation is unavailable. Connect the authorized project-creation capability from the setup screen, then try again.',
  PROJECT_HANDOFF_NOT_FOUND:
    'That project handoff could not be found or has expired. Start project creation again.',
  PROJECT_HANDOFF_NOT_RETRYABLE:
    'Only a failed project setup can be retried. Start project creation again if needed.',
  PROJECT_HANDOFF_SOURCE_TOO_LARGE:
    `The imported source is too large for project creation. Reduce it to ${SOURCE_TEXT_LIMIT_LABEL} or less, then try again.`,
  SOURCE_CONTAINS_CREDENTIAL:
    'This source appears to contain a service credential. Remove it before creating a project, then try again.',
  INVALID_SOURCE_BUNDLE:
    'The source bundle is not valid. Check that it contains a non-empty HTML entrypoint, then try again.',
} as const;

export const PROJECT_HANDOFF_FAILURE_FALLBACK =
  'The Replit project setup could not be completed. Retry the failed step.';

function getStructuredErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return null;
  }

  const data = (error as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null || !('code' in data)) {
    return null;
  }

  const code = (data as ErrorData).code;
  return typeof code === 'string' ? code : null;
}

export function getStudioErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const code = getStructuredErrorCode(error);
  return (code && STUDIO_ERROR_MESSAGES[code as keyof typeof STUDIO_ERROR_MESSAGES]) || fallback;
}