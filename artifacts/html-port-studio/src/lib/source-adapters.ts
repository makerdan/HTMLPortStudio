export type PlaygroundProvider = 'codepen' | 'jsfiddle';

export const PLAYGROUND_PROVIDERS = [
  { id: 'codepen', label: 'CodePen' },
  { id: 'jsfiddle', label: 'JSFiddle' },
] as const;

export function getPlaygroundProvider(value: string): PlaygroundProvider | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'codepen.io' || hostname === 'www.codepen.io') return 'codepen';
    if (hostname === 'jsfiddle.net' || hostname === 'www.jsfiddle.net') return 'jsfiddle';
    return null;
  } catch {
    return null;
  }
}

export function validatePlaygroundUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    const provider = getPlaygroundProvider(value);
    if (!provider) {
      return parsed.protocol !== 'https:'
        ? 'Use a public HTTPS CodePen or JSFiddle URL.'
        : 'That provider is not supported yet. Use the hosted URL importer for a public HTML page.';
    }
    if (parsed.username || parsed.password) {
      return 'Remove usernames and passwords from the playground URL before importing it.';
    }
    if ([...parsed.searchParams.keys()].some((key) =>
      /(?:api[_-]?key|access[_-]?token|auth|password|secret|signature|token)/i.test(key),
    )) {
      return 'Remove credential-like query parameters before importing this playground.';
    }
    const path = parsed.pathname.replace(/\/+$/, '');
    const validPath = provider === 'codepen'
      ? /^\/[A-Za-z0-9_-]{1,80}\/pen\/[A-Za-z0-9_-]{1,120}$/.test(path)
      : /^\/(?:[A-Za-z0-9_-]{1,80}\/)?[A-Za-z0-9_-]{1,120}(?:\/latest)?$/.test(path);
    return validPath
      ? null
      : provider === 'codepen'
        ? 'Use a public CodePen URL in the form https://codepen.io/user/pen/pen-id.'
        : 'Use a public JSFiddle URL such as https://jsfiddle.net/user/fiddle-id/.';
  } catch {
    return 'Enter a complete public CodePen or JSFiddle URL.';
  }
}