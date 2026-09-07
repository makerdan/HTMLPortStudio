import type { Request } from "express";

/**
 * Production requests must set PUBLIC_ORIGIN to the exact public origin
 * served by the trusted deployment proxy (for example,
 * https://studio.example.com). We intentionally do not infer this value from
 * x-forwarded-* headers because those headers are client-controlled whenever
 * the API is exposed directly.
 */
export function getConfiguredPublicOrigin(): string | undefined {
  const configured = process.env.PUBLIC_ORIGIN?.trim();
  if (!configured) return undefined;

  try {
    const parsed = new URL(configured);
    const withoutTrailingSlash = configured.endsWith("/")
      ? configured.slice(0, -1)
      : configured;
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== withoutTrailingSlash ||
      parsed.username ||
      parsed.password
    ) {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
}

/**
 * Returns the origin that the application is willing to treat as its own.
 * Production uses only the configured canonical origin. Development and test
 * use the direct Host/protocol pair, without consulting forwarded headers.
 */
export function getEffectiveRequestOrigin(
  req: Pick<Request, "headers" | "protocol">,
): string | undefined {
  const configured = getConfiguredPublicOrigin();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return undefined;

  const host = req.headers.host?.trim();
  return host ? `${req.protocol}://${host}` : undefined;
}