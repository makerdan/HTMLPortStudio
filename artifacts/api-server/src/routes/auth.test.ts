import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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