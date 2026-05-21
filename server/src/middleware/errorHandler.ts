import crypto from "crypto";
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const errorId = crypto.randomUUID();
  console.error(
    `[ERROR][${errorId}] ${req.method} ${req.path}`,
    err instanceof Error ? err.stack ?? err.message : err
  );

  if (res.headersSent) {
    next(err);
    return;
  }

  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json({
    status: "error",
    message: isDev ? (err instanceof Error ? err.message : "internal error") : "internal error",
    errorId,
  });
};
