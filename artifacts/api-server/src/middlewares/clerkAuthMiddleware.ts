import { getAuth } from "@clerk/express";
import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
      user?: {
        id: string;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        profileImageUrl: string | null;
      };
    }
  }
}

type ClerkSessionClaims = {
  userId?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
};

function sessionClaims(req: Request): ClerkSessionClaims {
  const claims = getAuth(req).sessionClaims;
  return claims && typeof claims === "object"
    ? (claims as ClerkSessionClaims)
    : {};
}

function stringClaim(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function unauthorized(res: Response, message: string): void {
  res.status(401).json({
    error: message,
    code: "AUTHENTICATION_REQUIRED",
  });
}

/**
 * Clerk verifies the session before this middleware runs. The local users row
 * remains the handoff ownership record, using the same ID bridge that the
 * former OIDC callback populated.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const testUserId =
    process.env.NODE_ENV === "test"
      ? stringClaim(req.headers["x-test-clerk-user-id"])
      : null;
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    if (testUserId) {
      await provisionLocalUser(req, res, testUserId, {}, next);
    } else {
      res.status(503).json({
        error: "Authentication is not configured. Set up Clerk in the workspace environment.",
        code: "AUTHENTICATION_NOT_CONFIGURED",
      });
    }
    return;
  }

  const auth = testUserId ? null : getAuth(req);
  const authenticatedUserId = testUserId ?? auth?.userId;
  if (!authenticatedUserId) {
    unauthorized(res, "Sign in before using Replit project creation.");
    return;
  }

  await provisionLocalUser(
    req,
    res,
    authenticatedUserId,
    testUserId ? {} : sessionClaims(req),
    next,
  );
}

async function provisionLocalUser(
  req: Request,
  res: Response,
  authenticatedUserId: string,
  claims: ClerkSessionClaims,
  next: NextFunction,
): Promise<void> {
  const localUserId = stringClaim(claims.userId) ?? authenticatedUserId;
  let [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, localUserId))
    .limit(1);

  if (!dbUser) {
    const [createdUser] = await db
      .insert(usersTable)
      .values({
        id: localUserId,
        email: stringClaim(claims.email),
        firstName: stringClaim(claims.firstName),
        lastName: stringClaim(claims.lastName),
      })
      .onConflictDoNothing()
      .returning();
    dbUser = createdUser;
  }

  if (!dbUser) {
    [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, localUserId))
      .limit(1);
  }

  if (!dbUser) {
    req.log.error({ localUserId }, "Authenticated Clerk user could not be provisioned");
    res.status(503).json({
      error: "Your account could not be prepared for this workspace.",
      code: "AUTHENTICATION_ACCOUNT_UNAVAILABLE",
    });
    return;
  }

  const currentEmail = stringClaim(claims.email);
  const currentFirstName = stringClaim(claims.firstName);
  const currentLastName = stringClaim(claims.lastName);
  if (currentEmail || currentFirstName || currentLastName) {
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        email: currentEmail ?? dbUser.email,
        firstName: currentFirstName ?? dbUser.firstName,
        lastName: currentLastName ?? dbUser.lastName,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, dbUser.id))
      .returning();
    dbUser = updatedUser ?? dbUser;
  }

  req.dbUser = dbUser;
  req.user = {
    id: dbUser.id,
    email: currentEmail ?? dbUser.email,
    firstName: currentFirstName ?? dbUser.firstName,
    lastName: currentLastName ?? dbUser.lastName,
    profileImageUrl: dbUser.profileImageUrl,
  };
  next();
}