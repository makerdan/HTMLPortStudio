import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import { request as httpsRequest } from "node:https";

export type LookupAddress = { address: string; family: number };
export type UrlLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<LookupAddress[]>;
export const defaultUrlLookup: UrlLookup = (hostname, options) => dnsLookup(hostname, options);

export type PinnedUrlErrorCode = "BLOCKED_HOST" | "DNS_FAILED" | "DNS_REBINDING";

export class PinnedUrlError extends Error {
  public readonly code: PinnedUrlErrorCode;

  constructor(code: PinnedUrlErrorCode, message: string) {
    super(message);
    this.name = "PinnedUrlError";
    this.code = code;
  }
}

function ipv4IsBlocked(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }
  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 2 || b === 168)) ||
    (a === 192 && b === 31 && c === 196) ||
    (a === 192 && b === 52 && c === 193) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
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
      const octets = part.split(".").map(Number);
      if (
        octets.length !== 4 ||
        octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
      ) {
        return null;
      }
      return [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
    }
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    return [Number.parseInt(part, 16)];
  };
  const leftParts = left.flatMap((part) => expandPart(part) ?? []);
  const rightParts = right.flatMap((part) => expandPart(part) ?? []);
  if (left.some((part) => expandPart(part) === null) || right.some((part) => expandPart(part) === null)) {
    return null;
  }
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
  const isUnspecifiedOrLoopback =
    parts.every((part) => part === 0) ||
    (parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1);
  const isUniqueLocal = (first & 0xfe00) === 0xfc00;
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const isSiteLocal = (first & 0xffc0) === 0xfec0;
  const isDocumentation = first === 0x2001 && second === 0x0db8;
  const isBenchmark = first === 0x2001 && second === 0x0002;
  const isDiscardOnly = first === 0x0100 && parts.slice(2).every((part) => part === 0);
  const isTeredo = first === 0x2001 && second === 0;
  const isOrchid = first === 0x2001 && (second & 0xfff0) === 0x0010;
  const isSixToFour = first === 0x2002;
  const isMulticastOrReserved = (first & 0xff00) === 0xff00;
  const mappedIpv4 = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  const compatibleIpv4 = parts.slice(0, 6).every((part) => part === 0);
  const mappedAddress = `${parts[6] >> 8}.${parts[6] & 255}.${parts[7] >> 8}.${parts[7] & 255}`;
  return (
    isUnspecifiedOrLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    isSiteLocal ||
    isDocumentation ||
    isBenchmark ||
    isDiscardOnly ||
    isTeredo ||
    isOrchid ||
    isSixToFour ||
    isMulticastOrReserved ||
    (mappedIpv4 && ipv4IsBlocked(mappedAddress)) ||
    compatibleIpv4
  );
}

export type ValidatedDestination = {
  address: string;
};

export async function validatePublicUrlDestination(
  url: URL,
  lookup: UrlLookup = defaultUrlLookup,
): Promise<ValidatedDestination> {
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname === "metadata" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal")
  ) {
    throw new PinnedUrlError(
      "BLOCKED_HOST",
      "This destination is private or reserved and cannot be fetched.",
    );
  }

  let addresses: LookupAddress[];
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new PinnedUrlError(
      "DNS_FAILED",
      "This destination could not be resolved. Check the URL and try again.",
    );
  }
  if (!addresses.length || addresses.some(({ address }) => addressIsBlocked(address))) {
    throw new PinnedUrlError(
      "BLOCKED_HOST",
      "This destination resolves to a private, loopback, link-local, or cloud metadata network and cannot be fetched.",
    );
  }
  if (!isIP(hostname)) {
    let rechecked: LookupAddress[];
    try {
      rechecked = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new PinnedUrlError(
        "DNS_FAILED",
        "This destination could not be resolved consistently. Try again later.",
      );
    }
    const resolved = addresses.map(({ address }) => address).sort().join(",");
    const checked = rechecked.map(({ address }) => address).sort().join(",");
    if (
      !rechecked.length ||
      rechecked.some(({ address }) => addressIsBlocked(address)) ||
      resolved !== checked
    ) {
      throw new PinnedUrlError(
        "DNS_REBINDING",
        "This destination changed its network address, so the request was blocked. Try again later.",
      );
    }
    return rechecked[0];
  }
  return addresses[0];
}

function requestHeaders(init: RequestInit, url: URL): Record<string, string> {
  const headers = new Headers(init.headers);
  headers.set("host", url.host);
  return Object.fromEntries(headers.entries());
}

export async function fetchPinnedUrl(
  url: string,
  init: RequestInit,
  pinnedAddress: string,
  tlsOptions: { ca?: string } = {},
): Promise<Response> {
  const parsed = new URL(url);
  const request = parsed.protocol === "https:" ? httpsRequest : httpRequest;
  const requestOptions = {
    hostname: pinnedAddress,
    port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    path: `${parsed.pathname || "/"}${parsed.search}`,
    method: init.method ?? "GET",
    headers: requestHeaders(init, parsed),
    family: isIP(pinnedAddress),
    ...(parsed.protocol === "https:"
      ? {
          servername: parsed.hostname.replace(/^\[|\]$/g, ""),
          rejectUnauthorized: true,
        }
      : {}),
    ...tlsOptions,
    ...(parsed.protocol === "https:" ? { rejectUnauthorized: true } : {}),
  };

  return new Promise<Response>((resolve, reject) => {
    let incomingMessage: IncomingMessage | undefined;
    const signal = init.signal;
    const cleanup = () => signal?.removeEventListener("abort", abort);
    const abortError = new Error("The pinned URL request was aborted.");
    const abort = () => {
      clientRequest.destroy(abortError);
      incomingMessage?.destroy(abortError);
    };
    const clientRequest = request(requestOptions, (responseMessage) => {
      incomingMessage = responseMessage;
      responseMessage.once("close", cleanup);
      responseMessage.once("end", cleanup);
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(responseMessage.headers)) {
        if (value !== undefined) headers[name] = Array.isArray(value) ? value.join(", ") : value;
      }
      resolve(
        new Response(Readable.toWeb(responseMessage) as ReadableStream, {
          status: responseMessage.statusCode ?? 502,
          statusText: responseMessage.statusMessage,
          headers,
        }),
      );
    });
    clientRequest.once("error", (error) => {
      cleanup();
      reject(error);
    });
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    clientRequest.end();
  });
}