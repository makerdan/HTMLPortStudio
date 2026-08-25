import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE } from "../lib/auth";

function requestOrigin(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function configuredStudioOrigins(): Set<string> {
  const values = process.env.HTML_PORT_STUDIO_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  if (process.env.REPLIT_DEV_DOMAIN) values.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  return new Set(values);
}

/**
 * Browser cookie sessions need an Origin check on state-changing handoff calls.
 * Bearer sessions are not CSRFable, and same-origin proxy requests are accepted.
 */
export function requireTrustedCookieOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const hasCookieSession = Boolean(req.cookies?.[SESSION_COOKIE]);
  const usesBearer = req.headers.authorization?.startsWith("Bearer ");
  if (!hasCookieSession || usesBearer) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const allowed = configuredStudioOrigins();
  if (
    origin &&
    (origin === requestOrigin(req) || allowed.has(origin))
  ) {
    next();
    return;
  }

  // Browsers may omit Origin for a same-origin navigation through the proxy.
  if (!origin && req.headers["sec-fetch-site"] === "same-origin") {
    next();
    return;
  }

  res.status(403).json({
    error: "This request must come from the HTML Port Studio.",
    code: "CSRF_ORIGIN_REJECTED",
  });
}