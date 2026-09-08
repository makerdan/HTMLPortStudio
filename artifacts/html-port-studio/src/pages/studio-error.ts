import { SOURCE_TEXT_LIMIT_LABEL } from '../lib/source-limits.ts';
import { getApiErrorPayload } from '../../../../lib/api-client-react/src/custom-fetch.ts';

export type StudioErrorPresentation = {
  message: string;
  action?: string;
  retryAfterSeconds?: number;
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
    'The selected main HTML file is empty. Choose a non-empty HTML file, then try again.',
  BUNDLE_ENTRYPOINT_MISSING:
    "The selected main HTML file isn't included in the bundle. Choose an existing HTML file, then try again.",
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
  POE_CHAT_REQUEST_TOO_LARGE:
    'This assistant request is too large. Shorten the source or prompt, then try again.',
  POE_MODEL_UNAVAILABLE:
    'The requested Poe model is no longer available. Refresh model availability, then try again.',
  POE_RATE_LIMITED:
    'The assistant is temporarily rate limited. Wait a moment, then try again.',
  POE_RATE_LIMIT_UNAVAILABLE:
    'The assistant protection service is temporarily unavailable. Wait a moment, then try again.',
  POE_TOKEN_LIMIT_EXCEEDED:
    'This assistant request asks for too many completion tokens. Reduce the request and try again.',
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
    'The source bundle is not valid. Check that it contains a non-empty main HTML file, then try again.',
  HOSTED_URL_INVALID:
    'That hosted link is not valid. Use a complete public HTTPS URL that serves an HTML document.',
  HOSTED_URL_UNSUPPORTED_PROTOCOL:
    'Hosted imports only support public HTTPS links. Replace the link with an https:// URL.',
  HOSTED_URL_HTTP_DISABLED:
    'This hosted import requires HTTPS. Replace the link with its secure https:// version.',
  HOSTED_URL_CREDENTIALS:
    'This hosted link includes credentials. Remove the credentials or token from the URL, then retry.',
  HOSTED_URL_PORT_NOT_ALLOWED:
    'That hosted link uses a non-standard port. Use the site’s normal HTTPS URL, then retry.',
  HOSTED_URL_BLOCKED_HOST:
    'This destination is private or unreachable from the public internet, so it cannot be imported.',
  HOSTED_URL_DNS_FAILED:
    'The hosted domain could not be resolved publicly. Check the URL and try again.',
  HOSTED_URL_DNS_REBINDING:
    'The hosted destination changed to a private network while it was being checked. Use a stable public URL.',
  HOSTED_URL_REDIRECT_INVALID:
    'The hosted page returned an unsafe redirect. Try the final public HTTPS URL instead.',
  HOSTED_URL_TOO_MANY_REDIRECTS:
    'The hosted page redirected too many times. Try its final public URL instead.',
  HOSTED_URL_TIMEOUT:
    'The hosted page took too long to respond. Check that it is public and try again.',
  HOSTED_URL_RATE_LIMITED:
    'Hosted imports are temporarily rate limited. Wait a minute, then retry or use paste or file import.',
  HOSTED_URL_TOO_LARGE:
    `The hosted page is larger than the ${SOURCE_TEXT_LIMIT_LABEL} import limit. Use a smaller standalone HTML page.`,
  HOSTED_URL_NOT_HTML:
    'That link returned something other than HTML. Choose a URL that serves an HTML document.',
  HOSTED_URL_HTTP_ERROR:
    'The hosted page returned an error. Check that the URL is public and serves HTML, then retry.',
  HOSTED_URL_FETCH_FAILED:
    'The hosted page could not be reached. Check the public URL and try again.',
  PLAYGROUND_URL_INVALID:
    'That playground link is not valid. Use a public HTTPS CodePen or JSFiddle URL.',
  PLAYGROUND_URL_UNSUPPORTED_PROTOCOL:
    'CodePen and JSFiddle imports require HTTPS. Replace the link with an https:// URL.',
  PLAYGROUND_URL_CREDENTIALS:
    'This playground link includes credentials. Remove them from the URL, then retry.',
  PLAYGROUND_URL_PORT_NOT_ALLOWED:
    'That playground link uses a non-standard port. Use the provider’s normal HTTPS URL.',
  PLAYGROUND_URL_UNSUPPORTED_FORM:
    'That link is not a supported public CodePen or JSFiddle page. Copy the playground’s public URL.',
  PLAYGROUND_PROVIDER_UNSUPPORTED:
    'That playground provider is not supported yet. Use CodePen, JSFiddle, or import a hosted HTML page.',
  PLAYGROUND_UNSAFE_DESTINATION:
    'The playground export resolved to a private or reserved network, so it was not imported.',
  PLAYGROUND_REDIRECT_UNSAFE:
    'The playground export redirected outside its provider, so it was not imported. Try the public provider link again.',
  PLAYGROUND_TIMEOUT:
    'The playground export took too long to respond. Check the public link and retry.',
  PLAYGROUND_RATE_LIMITED:
    'Playground imports are temporarily rate limited. Wait a minute, then retry or use another import method.',
  PLAYGROUND_RESPONSE_TOO_LARGE:
    `The playground export is larger than the ${SOURCE_TEXT_LIMIT_LABEL} import limit. Use a smaller public example.`,
  PLAYGROUND_EMPTY:
    'The playground did not provide a public HTML export. Check that it is public, then retry.',
  PLAYGROUND_PROVIDER_UNAVAILABLE:
    'The playground provider is unavailable right now. Retry the public link or use the hosted URL importer.',
} as const;

export const STUDIO_ERROR_ACTIONS = {
  HOSTED_URL_INVALID: 'Use a complete URL beginning with https:// that serves an HTML document.',
  HOSTED_URL_UNSUPPORTED_PROTOCOL: 'Use the provider’s public HTTPS URL instead of a file, data, or local URL.',
  HOSTED_URL_HTTP_DISABLED: 'Open the same page over HTTPS, then retry the import.',
  HOSTED_URL_CREDENTIALS: 'Remove usernames, passwords, API keys, and tokens from the URL.',
  HOSTED_URL_PORT_NOT_ALLOWED: 'Use the standard HTTPS port with no custom port in the URL.',
  HOSTED_URL_BLOCKED_HOST: 'Choose a public site instead of localhost, a private address, or a cloud metadata address.',
  HOSTED_URL_DNS_FAILED: 'Confirm the hostname is spelled correctly and publicly resolvable.',
  HOSTED_URL_DNS_REBINDING: 'Use a stable public hostname whose DNS stays on a public address.',
  HOSTED_URL_REDIRECT_INVALID: 'Paste the final public HTTPS URL rather than following the unsafe redirect.',
  HOSTED_URL_TOO_MANY_REDIRECTS: 'Paste the final public URL to avoid the redirect chain.',
  HOSTED_URL_TIMEOUT: 'Confirm the site responds normally, then retry.',
  HOSTED_URL_RATE_LIMITED: 'Wait before retrying, or use paste, file, ZIP, GitHub, or another import method.',
  HOSTED_URL_TOO_LARGE: 'Export a smaller standalone HTML page or paste the source directly.',
  HOSTED_URL_NOT_HTML: 'Choose a page URL, not a JSON, image, PDF, or download endpoint.',
  HOSTED_URL_HTTP_ERROR: 'Check that the page is publicly reachable without login, then retry.',
  HOSTED_URL_FETCH_FAILED: 'Check that the page is publicly reachable over HTTPS, then retry.',
  PLAYGROUND_URL_INVALID: 'Copy the public URL from the CodePen or JSFiddle address bar.',
  PLAYGROUND_URL_UNSUPPORTED_PROTOCOL: 'Use the public HTTPS playground URL.',
  PLAYGROUND_URL_CREDENTIALS: 'Remove credentials and credential-like query parameters before retrying.',
  PLAYGROUND_URL_PORT_NOT_ALLOWED: 'Use the standard HTTPS provider URL without a custom port.',
  PLAYGROUND_URL_UNSUPPORTED_FORM: 'Use a public pen or fiddle URL, not a collection, editor, or private link.',
  PLAYGROUND_PROVIDER_UNSUPPORTED: 'Use CodePen or JSFiddle, or switch to the hosted URL importer.',
  PLAYGROUND_UNSAFE_DESTINATION: 'Retry the public provider URL and confirm it does not redirect to a private network.',
  PLAYGROUND_REDIRECT_UNSAFE: 'Retry from the original public provider URL and review any redirect.',
  PLAYGROUND_TIMEOUT: 'Check that the provider is available, then retry.',
  PLAYGROUND_RATE_LIMITED: 'Wait before retrying, or use paste, file, ZIP, GitHub, or hosted URL import.',
  PLAYGROUND_RESPONSE_TOO_LARGE: 'Use a smaller public example or paste only the HTML you need.',
  PLAYGROUND_EMPTY: 'Make the pen or fiddle public and ensure it has a rendered HTML result.',
  PLAYGROUND_PROVIDER_UNAVAILABLE: 'Retry later or use the hosted URL importer for a standalone HTML page.',
} as const;

export const PROJECT_HANDOFF_FAILURE_FALLBACK =
  'The Replit project setup could not be completed. Retry the failed step.';

export const PROJECT_HANDOFF_RECOVERY_EXPIRED =
  'The project setup status is no longer available. Start again with a new source.';

function getStructuredErrorData(error: unknown): {
  code: string | null;
  error: string | null;
  action: string | null;
} {
  const payload = getApiErrorPayload(error);
  return {
    code: payload?.code ?? null,
    error: payload?.error ?? null,
    action: payload?.action ?? null,
  };
}

function getRetryAfterSeconds(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('headers' in error)) {
    return undefined;
  }

  const headers = (error as { headers?: unknown }).headers;
  if (
    typeof headers !== 'object' ||
    headers === null ||
    !('get' in headers) ||
    typeof (headers as { get?: unknown }).get !== 'function'
  ) {
    return undefined;
  }

  const headerValue = (headers as { get: (name: string) => string | null }).get(
    'retry-after',
  );
  const normalizedHeaderValue = headerValue?.trim() ?? '';
  if (!/^\d+$/.test(normalizedHeaderValue)) {
    return undefined;
  }

  const seconds = Number(normalizedHeaderValue);
  if (!Number.isInteger(seconds) || seconds <= 0) {
    return undefined;
  }

  return Math.min(seconds, 60 * 60);
}

export function getStudioErrorPresentation(
  error: unknown,
  fallback: string,
): StudioErrorPresentation {
  const { code, error: serverMessage, action: serverAction } =
    getStructuredErrorData(error);
  const knownMessage =
    code && STUDIO_ERROR_MESSAGES[code as keyof typeof STUDIO_ERROR_MESSAGES];
  if (!knownMessage) {
    return { message: fallback };
  }

  const isImportCode =
    code.startsWith('HOSTED_URL_') || code.startsWith('PLAYGROUND_');
  return {
    message: isImportCode ? serverMessage || knownMessage : knownMessage,
    action: isImportCode
      ? serverAction ||
        STUDIO_ERROR_ACTIONS[code as keyof typeof STUDIO_ERROR_ACTIONS]
      : undefined,
    retryAfterSeconds:
      code === 'POE_RATE_LIMITED' ? getRetryAfterSeconds(error) : undefined,
  };
}

export function getStudioErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return getStudioErrorPresentation(error, fallback).message;
}
