type PlaygroundProvider = "codepen" | "jsfiddle";

export type PlaygroundSource = {
  provider: PlaygroundProvider;
  sourceUrl: string;
  user: string | null;
  slug: string;
};

export type PlaygroundBundle = {
  version: 1;
  sourceType: "playground";
  files: Array<{ path: string; content: string }>;
  entrypoint: string;
  metadata: {
    displayName: string;
    sourceUrl: string;
    originalUrl: string;
    warnings: string[];
  };
};

export type PlaygroundImport = {
  provider: PlaygroundProvider;
  originalUrl: string;
  status: "imported";
  bundle: PlaygroundBundle;
  warnings: string[];
};

type PlaygroundFetch = typeof fetch;
type PlaygroundDependencies = {
  fetch: PlaygroundFetch;
  timeoutMs: number;
};

const CODEPEN_HOSTS = new Set(["codepen.io", "www.codepen.io"]);
const JSFIDDLE_HOSTS = new Set(["jsfiddle.net", "www.jsfiddle.net"]);
export const PLAYGROUND_MAX_BYTES = 1_000_000;
export const PLAYGROUND_TIMEOUT_MS = 10_000;

export class PlaygroundError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PlaygroundError";
    this.code = code;
  }
}

function hasCredentialQuery(url: URL): boolean {
  return [...url.searchParams.keys()].some((key) =>
    /(?:api[_-]?key|access[_-]?token|auth(?:entication|orization)?|password|secret|signature|token)/i.test(
      key,
    ),
  );
}

function boundedSegment(value: string): string {
  return value.length > 120 ? value.slice(0, 120) : value;
}

export function parsePlaygroundUrl(input: string): PlaygroundSource {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new PlaygroundError(
      "PLAYGROUND_URL_INVALID",
      "Enter a complete public CodePen or JSFiddle URL.",
    );
  }

  if (url.protocol !== "https:") {
    throw new PlaygroundError(
      "PLAYGROUND_URL_UNSUPPORTED_PROTOCOL",
      "CodePen and JSFiddle imports require an HTTPS URL.",
    );
  }
  if (url.username || url.password || hasCredentialQuery(url)) {
    throw new PlaygroundError(
      "PLAYGROUND_URL_CREDENTIALS",
      "Remove credentials and credential-like query parameters before importing this playground.",
    );
  }
  if (url.port && url.port !== "443") {
    throw new PlaygroundError(
      "PLAYGROUND_URL_PORT_NOT_ALLOWED",
      "Playground imports only allow the standard HTTPS port.",
    );
  }

  const hostname = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  let provider: PlaygroundProvider;
  let user: string | null = null;
  let slug: string;

  if (CODEPEN_HOSTS.has(hostname)) {
    provider = "codepen";
    const match = path.match(/^\/([A-Za-z0-9_-]{1,80})\/pen\/([A-Za-z0-9_-]{1,120})$/);
    if (!match) {
      throw new PlaygroundError(
        "PLAYGROUND_URL_UNSUPPORTED_FORM",
        "Use a public CodePen URL in the form https://codepen.io/user/pen/pen-id.",
      );
    }
    user = match[1];
    slug = match[2];
  } else if (JSFIDDLE_HOSTS.has(hostname)) {
    provider = "jsfiddle";
    const match = path.match(
      /^\/(?:([A-Za-z0-9_-]{1,80})\/)?([A-Za-z0-9_-]{1,120})(?:\/latest)?$/,
    );
    if (!match || match[2].toLowerCase() === "api") {
      throw new PlaygroundError(
        "PLAYGROUND_URL_UNSUPPORTED_FORM",
        "Use a public JSFiddle URL such as https://jsfiddle.net/user/fiddle-id/.",
      );
    }
    user = match[1] ?? null;
    slug = match[2];
  } else {
    throw new PlaygroundError(
      "PLAYGROUND_PROVIDER_UNSUPPORTED",
      "That provider is not supported yet. Use the hosted URL importer for a public HTML page.",
    );
  }

  url.search = "";
  url.hash = "";
  url.hostname = hostname;
  url.pathname = path + "/";
  url.port = "";
  return {
    provider,
    sourceUrl: url.toString(),
    user,
    slug: boundedSegment(slug),
  };
}

async function readLimitedBody(
  response: Response,
  signal: AbortSignal,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      throw new PlaygroundError(
        "PLAYGROUND_RESPONSE_TOO_LARGE",
        "The playground export is larger than the 1 MB import limit.",
      );
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new PlaygroundError(
          "PLAYGROUND_RESPONSE_TOO_LARGE",
          "The playground export is larger than the 1 MB import limit.",
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function responseHostIsAllowed(response: Response, provider: PlaygroundProvider): boolean {
  if (!response.url) return true;
  try {
    const hostname = new URL(response.url).hostname.toLowerCase();
    return provider === "codepen"
      ? CODEPEN_HOSTS.has(hostname)
      : JSFIDDLE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

async function fetchProviderText(
  url: string,
  provider: PlaygroundProvider,
  kind: string,
  dependencies: PlaygroundDependencies,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), dependencies.timeoutMs);
  try {
    const response = await dependencies.fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "text/html,text/css,application/javascript,text/javascript" },
    });
    if (!responseHostIsAllowed(response, provider)) {
      throw new PlaygroundError(
        "PLAYGROUND_REDIRECT_UNSAFE",
        "The playground export redirected outside its provider, so it was not imported.",
      );
    }
    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) {
      throw new PlaygroundError(
        "PLAYGROUND_PROVIDER_UNAVAILABLE",
        `The public ${provider === "codepen" ? "CodePen" : "JSFiddle"} export could not be fetched right now.`,
      );
    }
    const content = await readLimitedBody(response, controller.signal, PLAYGROUND_MAX_BYTES);
    if (!content.trim()) return null;
    return content;
  } catch (error) {
    if (error instanceof PlaygroundError) throw error;
    if (controller.signal.aborted) {
      throw new PlaygroundError(
        "PLAYGROUND_TIMEOUT",
        `The ${kind} export timed out. Check the public link and retry.`,
      );
    }
    throw new PlaygroundError(
      "PLAYGROUND_PROVIDER_UNAVAILABLE",
      `The public ${kind} export could not be fetched right now.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function hasDocumentShell(html: string): boolean {
  return /<html\b/i.test(html) || /<!doctype\s+html/i.test(html);
}

function normalizeCodePenHtml(html: string, css: string | null, js: string | null): string {
  if (hasDocumentShell(html)) {
    let result = html;
    if (css && !/<link\b[^>]*href=["'][^"']*styles\.css/i.test(result)) {
      result = /<\/head>/i.test(result)
        ? result.replace(/<\/head>/i, '<link rel="stylesheet" href="styles.css"></head>')
        : `<style>${css}</style>${result}`;
    }
    if (js && !/<script\b[^>]*src=["'][^"']*script\.js/i.test(result)) {
      result = /<\/body>/i.test(result)
        ? result.replace(/<\/body>/i, '<script src="script.js"></script></body>')
        : `${result}<script src="script.js"></script>`;
    }
    return result;
  }

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    css ? '<link rel="stylesheet" href="styles.css">' : "",
    "</head>",
    "<body>",
    html,
    js ? '<script src="script.js"></script>' : "",
    "</body>",
    "</html>",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeWarnings(
  provider: PlaygroundProvider,
  html: string,
  css: string | null,
  js: string | null,
): string[] {
  const warnings =
    provider === "codepen"
      ? [
          "CodePen settings, preprocessors, asset uploads, and private pens are not included.",
          "External assets and libraries remain external and may need a Replit dependency or allowlist.",
        ]
      : [
          "JSFiddle provides the public rendered result, not editor-only settings or private resources.",
          "External assets, libraries, and runtime requests remain external and may not work in Replit Preview.",
        ];
  if (!css && provider === "codepen") warnings.push("CodePen did not expose a public CSS export.");
  if (!js && provider === "codepen") warnings.push("CodePen did not expose a public JavaScript export.");
  if (/<(?:img|link|script|iframe|source)\b[^>]*(?:src|href)\s*=\s*["']https?:\/\//i.test(html)) {
    warnings.push("The imported document references external assets or scripts.");
  }
  if (css && /@import\s+url\(\s*["']?https?:\/\//i.test(css)) {
    warnings.push("The imported stylesheet references an external stylesheet.");
  }
  if (js && /\b(?:fetch|XMLHttpRequest|WebSocket)\b/i.test(js)) {
    warnings.push("The imported JavaScript uses browser runtime or network behavior that was not executed.");
  }
  return [...new Set(warnings)].slice(0, 20);
}

function codePenExportUrls(source: PlaygroundSource) {
  const base = `https://codepen.io/${encodeURIComponent(source.user!)}/pen/${encodeURIComponent(source.slug)}`;
  return {
    html: `${base}.html`,
    css: `${base}.css`,
    js: `${base}.js`,
  };
}

function jsFiddleResultUrl(source: PlaygroundSource): string {
  return source.user
    ? `https://jsfiddle.net/${encodeURIComponent(source.user)}/${encodeURIComponent(source.slug)}/show/`
    : `https://jsfiddle.net/${encodeURIComponent(source.slug)}/show/`;
}

async function importCodePen(
  source: PlaygroundSource,
  dependencies: PlaygroundDependencies,
): Promise<PlaygroundImport> {
  const urls = codePenExportUrls(source);
  const [html, css, js] = await Promise.all([
    fetchProviderText(urls.html, "codepen", "CodePen HTML", dependencies),
    fetchProviderText(urls.css, "codepen", "CodePen CSS", dependencies),
    fetchProviderText(urls.js, "codepen", "CodePen JavaScript", dependencies),
  ]);
  if (!html) {
    throw new PlaygroundError(
      "PLAYGROUND_EMPTY",
      "This CodePen has no public HTML export. Check that the pen is public and retry.",
    );
  }
  const normalizedHtml = normalizeCodePenHtml(html, css, js);
  const warnings = normalizeWarnings("codepen", normalizedHtml, css, js);
  const files = [{ path: "index.html", content: normalizedHtml }];
  if (css) files.push({ path: "styles.css", content: css });
  if (js) files.push({ path: "script.js", content: js });
  return {
    provider: "codepen",
    originalUrl: source.sourceUrl,
    status: "imported",
    bundle: {
      version: 1,
      sourceType: "playground",
      files,
      entrypoint: "index.html",
      metadata: {
        displayName: `CodePen · ${source.user}/${source.slug}`,
        sourceUrl: source.sourceUrl,
        originalUrl: source.sourceUrl,
        warnings,
      },
    },
    warnings,
  };
}

async function importJsFiddle(
  source: PlaygroundSource,
  dependencies: PlaygroundDependencies,
): Promise<PlaygroundImport> {
  const html = await fetchProviderText(
    jsFiddleResultUrl(source),
    "jsfiddle",
    "JSFiddle result",
    dependencies,
  );
  if (!html) {
    throw new PlaygroundError(
      "PLAYGROUND_EMPTY",
      "This JSFiddle has no public rendered result. Check that it is public and retry.",
    );
  }
  const warnings = normalizeWarnings("jsfiddle", html, null, null);
  return {
    provider: "jsfiddle",
    originalUrl: source.sourceUrl,
    status: "imported",
    bundle: {
      version: 1,
      sourceType: "playground",
      files: [{ path: "index.html", content: html }],
      entrypoint: "index.html",
      metadata: {
        displayName: `JSFiddle · ${source.user ? `${source.user}/` : ""}${source.slug}`,
        sourceUrl: source.sourceUrl,
        originalUrl: source.sourceUrl,
        warnings,
      },
    },
    warnings,
  };
}

export type PlaygroundAdapter = {
  provider: PlaygroundProvider;
  matches(source: PlaygroundSource): boolean;
  import(source: PlaygroundSource, dependencies?: Partial<PlaygroundDependencies>): Promise<PlaygroundImport>;
};

export const playgroundAdapters: readonly PlaygroundAdapter[] = [
  {
    provider: "codepen",
    matches: (source) => source.provider === "codepen",
    import: (source, dependencies = {}) =>
      importCodePen(source, {
        fetch: dependencies.fetch ?? fetch,
        timeoutMs: dependencies.timeoutMs ?? PLAYGROUND_TIMEOUT_MS,
      }),
  },
  {
    provider: "jsfiddle",
    matches: (source) => source.provider === "jsfiddle",
    import: (source, dependencies = {}) =>
      importJsFiddle(source, {
        fetch: dependencies.fetch ?? fetch,
        timeoutMs: dependencies.timeoutMs ?? PLAYGROUND_TIMEOUT_MS,
      }),
  },
];

export function resolvePlaygroundAdapter(source: PlaygroundSource): PlaygroundAdapter {
  const adapter = playgroundAdapters.find((candidate) => candidate.matches(source));
  if (!adapter) {
    throw new PlaygroundError(
      "PLAYGROUND_PROVIDER_UNSUPPORTED",
      "That playground provider is not supported yet. Use the hosted URL importer for a public HTML page.",
    );
  }
  return adapter;
}

export async function importPlayground(
  input: string,
  dependencies?: Partial<PlaygroundDependencies>,
): Promise<PlaygroundImport> {
  const source = parsePlaygroundUrl(input);
  return resolvePlaygroundAdapter(source).import(source, dependencies);
}