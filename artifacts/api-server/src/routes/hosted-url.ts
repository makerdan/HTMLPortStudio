import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export const HOSTED_URL_MAX_REDIRECTS = 5;
export const HOSTED_URL_MAX_BYTES = 2_000_000;
export const HOSTED_URL_TIMEOUT_MS = 10_000;

type LookupAddress = { address: string; family: number };
type HostedUrlDependencies = {
  lookup: (hostname: string, options: { all: true; verbatim: true }) => Promise<LookupAddress[]>;
  fetch: typeof fetch;
  timeoutMs: number;
};

export type HostedUrlResult = {
  originalUrl: string;
  finalUrl: string;
  html: string;
  warnings: string[];
};

export class HostedUrlError extends Error {
  public readonly code: string;

  constructor(
    code: string,
    message: string,
  ) {
    super(message);
    this.name = "HostedUrlError";
    this.code = code;
  }
}

function isHttpAllowed(): boolean {
  return process.env.HOSTED_URL_ALLOW_HTTP === "true";
}

function hasCredentialQuery(url: URL): boolean {
  return [...url.searchParams.keys()].some((key) =>
    /(?:api[_-]?key|access[_-]?token|auth(?:entication|orization)?|password|secret|signature|token)/i.test(
      key,
    ),
  );
}

function canonicalize(input: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new HostedUrlError(
      "HOSTED_URL_INVALID",
      "Enter a complete public HTTP(S) URL, such as https://example.com/app.",
    );
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new HostedUrlError(
      "HOSTED_URL_UNSUPPORTED_PROTOCOL",
      "Only public HTTP(S) URLs can be imported. File, data, and local URLs are not allowed.",
    );
  }
  if (parsed.protocol === "http:" && !isHttpAllowed()) {
    throw new HostedUrlError(
      "HOSTED_URL_HTTP_DISABLED",
      "HTTPS is required for hosted imports. HTTP can only be enabled by the server workspace policy.",
    );
  }
  if (parsed.username || parsed.password || hasCredentialQuery(parsed)) {
    throw new HostedUrlError(
      "HOSTED_URL_CREDENTIALS",
      "This URL contains credentials or a credential-like query parameter. Remove them and try again.",
    );
  }
  if (!parsed.hostname || parsed.hostname.endsWith(".")) {
    throw new HostedUrlError(
      "HOSTED_URL_INVALID",
      "Enter a complete public HTTP(S) URL with a normal hostname.",
    );
  }
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new HostedUrlError(
      "HOSTED_URL_PORT_NOT_ALLOWED",
      "Hosted imports only allow the standard HTTP and HTTPS ports.",
    );
  }
  parsed.hash = "";
  return parsed;
}

function ipv4IsBlocked(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && (b === 0 || b === 2 || b === 168) ||
    a === 198 && (b === 18 || b === 19 || b === 51) ||
    a === 203 && b === 0 ||
    a >= 224
  );
}

function ipv6Parts(address: string): number[] | null {
  const normalized = address.toLowerCase().split("%")[0];
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const expandPart = (part: string): number[] | null => {
    if (part.includes(".")) {
      if (!ipv4IsBlocked(part)) {
        // IPv4-in-IPv6 public addresses are still represented as two hextets.
      }
      const octets = part.split(".").map(Number);
      if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
        return null;
      }
      return [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
    }
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    return [Number.parseInt(part, 16)];
  };
  const leftParts = left.flatMap((part) => expandPart(part) ?? []);
  const rightParts = right.flatMap((part) => expandPart(part) ?? []);
  if (leftParts.length !== left.length || rightParts.length !== right.length) return null;
  if (halves.length === 1 && leftParts.length !== 8) return null;
  if (halves.length === 2 && leftParts.length + rightParts.length >= 8) return null;
  return halves.length === 2
    ? [...leftParts, ...Array(8 - leftParts.length - rightParts.length).fill(0), ...rightParts]
    : leftParts;
}

function addressIsBlocked(address: string): boolean {
  if (isIP(address) === 4) return ipv4IsBlocked(address);
  if (isIP(address) !== 6) return true;
  const parts = ipv6Parts(address);
  if (!parts) return true;
  const first = parts[0];
  const second = parts[1];
  const isUnspecifiedOrLoopback = parts.every((part) => part === 0) || parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1;
  const isUniqueLocal = (first & 0xfe00) === 0xfc00;
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const isDocumentation = first === 0x2001 && second === 0x0db8;
  const isBenchmark = first === 0x2001 && second === 0x0002;
  const mappedIpv4 = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  const mappedAddress = `${parts[6] >> 8}.${parts[6] & 255}.${parts[7] >> 8}.${parts[7] & 255}`;
  return (
    isUnspecifiedOrLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    isDocumentation ||
    isBenchmark ||
    (mappedIpv4 && ipv4IsBlocked(mappedAddress))
  );
}

async function validateDestination(
  url: URL,
  lookup: HostedUrlDependencies["lookup"],
): Promise<void> {
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname === "metadata" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal")
  ) {
    throw new HostedUrlError(
      "HOSTED_URL_BLOCKED_HOST",
      "This destination is private or reserved and cannot be fetched.",
    );
  }

  let addresses: LookupAddress[];
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new HostedUrlError(
      "HOSTED_URL_DNS_FAILED",
      "The hosted page hostname could not be resolved. Check the URL and try again.",
    );
  }
  if (!addresses.length || addresses.some(({ address }) => addressIsBlocked(address))) {
    throw new HostedUrlError(
      "HOSTED_URL_BLOCKED_HOST",
      "This destination resolves to a private, loopback, link-local, or cloud metadata network and cannot be fetched.",
    );
  }
  if (!isIP(hostname)) {
    let rechecked: LookupAddress[];
    try {
      rechecked = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new HostedUrlError(
        "HOSTED_URL_DNS_FAILED",
        "The hosted page hostname could not be resolved consistently. Try again later.",
      );
    }
    const resolved = addresses.map(({ address }) => address).sort().join(",");
    const checked = rechecked.map(({ address }) => address).sort().join(",");
    if (
      !rechecked.length ||
      rechecked.some(({ address }) => addressIsBlocked(address)) ||
      resolved !== checked
    ) {
      throw new HostedUrlError(
        "HOSTED_URL_DNS_REBINDING",
        "The hosted page hostname changed its network destination, so the import was blocked. Try again later.",
      );
    }
  }
}

function portabilityWarnings(html: string): string[] {
  const warnings: string[] = [];
  if (/<(?:script|link|img|iframe|video|audio|source)\b[^>]*(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html)) {
    warnings.push("External assets are referenced; they may be unavailable or change outside this imported source.");
  }
  if (/<script\b[^>]*\bsrc\s*=/i.test(html)) {
    warnings.push("External scripts are not copied into the source bundle and may require a stable CDN allowlist.");
  }
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/i.test(html)) {
    warnings.push("Browser runtime network calls were detected; they may need CORS or a server-side route in Replit.");
  }
  if (/\b(?:serviceWorker|navigator\.credentials|localStorage|indexedDB)\b/i.test(html)) {
    warnings.push("Browser-specific runtime behavior was detected; verify it in the safe preview.");
  }
  if (/<form\b/i.test(html)) {
    warnings.push("Forms are preserved but are not submitted during import; verify their action and server behavior separately.");
  }
  if (/(?:api[_-]?key|authorization|access[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["'`]/i.test(html)) {
    warnings.push("A possible credential signal was found in the fetched HTML; remove it before using assistant or handoff features.");
  }
  return warnings;
}

async function readLimitedBody(response: Response, signal: AbortSignal): Promise<string> {
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        if (signal.aborted) throw new HostedUrlError("HOSTED_URL_TIMEOUT", "The hosted page took too long to download. Try again.");
        const { done, value } = await new Promise<{ done: boolean; value?: Uint8Array }>(
          (resolve, reject) => {
            const onAbort = () => {
              reject(
                new HostedUrlError(
                  "HOSTED_URL_TIMEOUT",
                  "The hosted page took too long to download. Try again.",
                ),
              );
            };
            signal.addEventListener("abort", onAbort, { once: true });
            void reader.read().then(
              (result) => {
                signal.removeEventListener("abort", onAbort);
                resolve(result);
              },
              (error) => {
                signal.removeEventListener("abort", onAbort);
                reject(error);
              },
            );
          },
        );
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > HOSTED_URL_MAX_BYTES) {
          await reader.cancel();
          throw new HostedUrlError(
            "HOSTED_URL_TOO_LARGE",
            "The hosted page is larger than the 2 MB import limit. Use a smaller standalone HTML page.",
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return new TextDecoder().decode(
      chunks.reduce((result, chunk) => {
        const next = new Uint8Array(result.length + chunk.length);
        next.set(result);
        next.set(chunk, result.length);
        return next;
      }, new Uint8Array()),
    );
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).length > HOSTED_URL_MAX_BYTES) {
    throw new HostedUrlError(
      "HOSTED_URL_TOO_LARGE",
      "The hosted page is larger than the 2 MB import limit. Use a smaller standalone HTML page.",
    );
  }
  return text;
}

export async function fetchHostedUrl(
  input: string,
  overrides: Partial<HostedUrlDependencies> = {},
): Promise<HostedUrlResult> {
  const dependencies: HostedUrlDependencies = {
    lookup: (hostname, options) => dnsLookup(hostname, options),
    fetch,
    timeoutMs: HOSTED_URL_TIMEOUT_MS,
    ...overrides,
  };
  const original = canonicalize(input);
  let current = original;

  for (let redirectCount = 0; redirectCount <= HOSTED_URL_MAX_REDIRECTS; redirectCount += 1) {
    await validateDestination(current, dependencies.lookup);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), dependencies.timeoutMs);
    let response: Response;
    try {
      response = await dependencies.fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new HostedUrlError(
          "HOSTED_URL_TIMEOUT",
          "The hosted page timed out before it could be imported. Check the URL and try again.",
        );
      }
      throw new HostedUrlError(
        "HOSTED_URL_FETCH_FAILED",
        "The hosted page could not be fetched. Check that it is publicly reachable over HTTP(S) and try again.",
      );
    }
    if (response.status >= 300 && response.status < 400) {
      clearTimeout(timeout);
      const location = response.headers.get("location");
      if (!location) {
        throw new HostedUrlError(
          "HOSTED_URL_REDIRECT_INVALID",
          "The hosted page returned a redirect without a destination. Try its final public URL.",
        );
      }
      if (redirectCount === HOSTED_URL_MAX_REDIRECTS) {
        throw new HostedUrlError(
          "HOSTED_URL_TOO_MANY_REDIRECTS",
          "The hosted page redirected too many times. Try its final public URL.",
        );
      }
      try {
        current = canonicalize(new URL(location, current).toString());
      } catch (error) {
        if (error instanceof HostedUrlError) throw error;
        throw new HostedUrlError(
          "HOSTED_URL_REDIRECT_INVALID",
          "The hosted page redirected to an invalid destination.",
        );
      }
      continue;
    }

    if (!response.ok) {
      clearTimeout(timeout);
      throw new HostedUrlError(
        "HOSTED_URL_HTTP_ERROR",
        `The hosted page returned HTTP ${response.status}. Check that the URL serves a public HTML document.`,
      );
    }
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
      clearTimeout(timeout);
      throw new HostedUrlError(
        "HOSTED_URL_NOT_HTML",
        "That URL returned a non-HTML response. Choose a URL that serves text/html or application/xhtml+xml.",
      );
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > HOSTED_URL_MAX_BYTES) {
      clearTimeout(timeout);
      throw new HostedUrlError(
        "HOSTED_URL_TOO_LARGE",
        "The hosted page is larger than the 2 MB import limit. Use a smaller standalone HTML page.",
      );
    }
    let html: string;
    try {
      html = await readLimitedBody(response, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new HostedUrlError(
          "HOSTED_URL_TIMEOUT",
          "The hosted page timed out before it could be imported. Check the URL and try again.",
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    return {
      originalUrl: original.toString(),
      finalUrl: current.toString(),
      html,
      warnings: portabilityWarnings(html),
    };
  }

  throw new HostedUrlError("HOSTED_URL_TOO_MANY_REDIRECTS", "The hosted page redirected too many times.");
}