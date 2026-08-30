import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { analyzeHtmlBodyThreeHtmlMax as SOURCE_TEXT_MAX_BYTES } from "@workspace/api-zod";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();
const SOURCE_TEXT_LIMIT_LABEL = `${SOURCE_TEXT_MAX_BYTES / 1024 ** 2} MB`;

function allowedStudioOrigins(): Set<string> {
  const configured = process.env.HTML_PORT_STUDIO_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  if (process.env.REPLIT_DEV_DOMAIN) {
    configured.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  return new Set(
    configured.filter((origin) => {
      try {
        return new URL(origin).origin === origin;
      } catch {
        return false;
      }
    }),
  );
}

const studioOrigins = allowedStudioOrigins();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Requests without Origin are same-origin/non-browser requests and do not
      // receive CORS headers. Never reflect an arbitrary credentialed origin.
      callback(null, Boolean(origin && studioOrigins.has(origin)));
    },
  }),
);
if (process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
}
// Repair prompts include the complete imported document plus a small
// instruction envelope. Keep the analyzer and handoff limits at 2 MB while
// allowing a valid near-limit document to reach the existing Poe bridge.
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const jsonBodyErrorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errorType =
    typeof error === "object" &&
    error !== null &&
    "type" in error
      ? (error as { type?: unknown }).type
      : undefined;

  if (errorType === "entity.parse.failed") {
    res.status(400).json({
      error: "Provide a valid JSON request body.",
      code: "INVALID_JSON",
    });
    return;
  }

  if (
    errorType === "entity.too.large"
  ) {
    res.status(413).json(
      req.path === "/api/port/analyze"
        ? {
            error: `Provide exactly one valid source bundle no larger than ${SOURCE_TEXT_LIMIT_LABEL}.`,
            code: "BUNDLE_TOO_LARGE",
          }
        : {
            error: `Provide a non-empty source bundle no larger than ${SOURCE_TEXT_LIMIT_LABEL}.`,
            code: "PROJECT_HANDOFF_SOURCE_TOO_LARGE",
          },
    );
    return;
  }
  next(error);
};

app.use(jsonBodyErrorHandler);

export default app;
