import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

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
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

const jsonBodyErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: unknown }).type === "entity.too.large"
  ) {
    res.status(413).json({
      error: "Provide one non-empty HTML document no larger than 2 MB.",
      code: "PROJECT_HANDOFF_SOURCE_TOO_LARGE",
    });
    return;
  }
  next(error);
};

app.use(jsonBodyErrorHandler);

export default app;
