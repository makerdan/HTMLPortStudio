import type { NextFunction, Request, Response } from "express";
import {
  getConfiguredPublicOrigin,
  getEffectiveRequestOrigin,
} from "./publicOrigin.ts";

function configuredStudioOrigins(): Set<string> {
  const values = process.env.HTML_PORT_STUDIO_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  const publicOrigin = getConfiguredPublicOrigin();
  if (publicOrigin) values.push(publicOrigin);
  if (process.env.REPLIT_DEV_DOMAIN) values.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  return new Set(values);
}

/**
 * Clerk browser sessions need an Origin check on state-changing handoff calls.
 * Same-origin proxy requests are accepted.
 */
export function requireTrustedCookieOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin;
  const allowed = configuredStudioOrigins();
  if (
    origin &&
    (origin === getEffectiveRequestOrigin(req) || allowed.has(origin))
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