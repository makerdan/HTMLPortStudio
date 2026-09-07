import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware.ts";
import { requireTrustedCookieOrigin } from "../middlewares/csrfMiddleware.ts";
import {
  getConfiguredPublicOrigin,
  getEffectiveRequestOrigin,
} from "../middlewares/publicOrigin.ts";
import { finalApiErrorHandler } from "../middlewares/apiErrorMiddleware.ts";

test("Clerk protects handoff routes and keeps connector authorization separate", async () => {
  const middleware = await readFile(
    new URL("../middlewares/clerkAuthMiddleware.ts", import.meta.url),
    "utf8",
  );
  const routes = await readFile(new URL("./port.ts", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.ts", import.meta.url), "utf8");

  assert.match(middleware, /getAuth\(req\)/);
  assert.match(middleware, /AUTHENTICATION_REQUIRED/);
  assert.match(middleware, /usersTable/);
  assert.match(middleware, /localUserId/);
  assert.match(routes, /requireAuth/);
  assert.match(routes, /req\.dbUser!\.id/);
  assert.match(routes, /PROJECT_CREATION_CONNECTION_UNAVAILABLE/);
  assert.match(app, /clerkMiddleware/);
  assert.doesNotMatch(app, /authMiddleware/);
});

test("Clerk configuration failures return actionable API states", async () => {
  const middleware = await readFile(
    new URL("../middlewares/clerkAuthMiddleware.ts", import.meta.url),
    "utf8",
  );

  assert.match(middleware, /AUTHENTICATION_NOT_CONFIGURED/);
  assert.match(middleware, /Authentication is not configured/);
});

test("forwarded headers cannot spoof the configured public origin", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPublicOrigin = process.env.PUBLIC_ORIGIN;
  process.env.NODE_ENV = "production";
  process.env.PUBLIC_ORIGIN = "https://studio.example.com";

  try {
    const request = {
      protocol: "http",
      headers: {
        host: "127.0.0.1:3000",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "http",
      },
    } as const;

    assert.equal(getConfiguredPublicOrigin(), "https://studio.example.com");
    assert.equal(
      getEffectiveRequestOrigin(request),
      "https://studio.example.com",
    );
    assert.equal(getClerkProxyHost(request), "studio.example.com");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPublicOrigin === undefined) delete process.env.PUBLIC_ORIGIN;
    else process.env.PUBLIC_ORIGIN = previousPublicOrigin;
  }
});

test("production rejects forwarded origins when no canonical origin is configured", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPublicOrigin = process.env.PUBLIC_ORIGIN;
  process.env.NODE_ENV = "production";
  delete process.env.PUBLIC_ORIGIN;

  try {
    const request = {
      protocol: "https",
      headers: {
        host: "api.example.com",
        "x-forwarded-host": "studio.example.com",
        "x-forwarded-proto": "https",
      },
    } as const;

    assert.equal(getEffectiveRequestOrigin(request), undefined);
    assert.equal(getClerkProxyHost(request), undefined);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPublicOrigin === undefined) delete process.env.PUBLIC_ORIGIN;
    else process.env.PUBLIC_ORIGIN = previousPublicOrigin;
  }
});

test("state-changing requests reject an origin spoofed through forwarded headers", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPublicOrigin = process.env.PUBLIC_ORIGIN;
  process.env.NODE_ENV = "production";
  process.env.PUBLIC_ORIGIN = "https://studio.example.com";
  let nextCalled = false;
  let statusCode = 0;
  let responseBody: Record<string, unknown> | undefined;

  try {
    requireTrustedCookieOrigin(
      {
        protocol: "https",
        headers: {
          host: "studio.example.com",
          origin: "https://attacker.example",
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "https",
        },
      } as never,
      {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: Record<string, unknown>) {
          responseBody = body;
          return this;
        },
      } as never,
      () => {
        nextCalled = true;
      },
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPublicOrigin === undefined) delete process.env.PUBLIC_ORIGIN;
    else process.env.PUBLIC_ORIGIN = previousPublicOrigin;
  }

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
  assert.deepEqual(responseBody, {
    error: "This request must come from the HTML Port Studio.",
    code: "CSRF_ORIGIN_REJECTED",
  });
});

test("the final API error handler returns a generic non-production response", () => {
  let statusCode = 0;
  let responseBody: Record<string, unknown> | undefined;
  let loggedError: unknown;

  finalApiErrorHandler(
    new Error("sensitive implementation detail"),
    {
      log: {
        error(payload: { err: unknown }) {
          loggedError = payload.err;
        },
      },
    } as never,
    {
      headersSent: false,
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: Record<string, unknown>) {
        responseBody = body;
        return this;
      },
    } as never,
    (() => undefined) as never,
  );

  assert.equal(statusCode, 500);
  assert.deepEqual(responseBody, {
    error: "Internal server error.",
    code: "INTERNAL_SERVER_ERROR",
  });
  assert.equal(loggedError instanceof Error, true);
  assert.doesNotMatch(JSON.stringify(responseBody), /sensitive implementation detail/);
});
