import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

export const finalApiErrorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  req.log.error({ err: error }, "Unhandled API error");
  if (res.headersSent) return;
  res.status(500).json({
    error: "Internal server error.",
    code: "INTERNAL_SERVER_ERROR",
  });
};