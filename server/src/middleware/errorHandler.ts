import crypto from "crypto";
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // SECURITY (Fase A A1): CSRF token mismatch → 403 com code estável pra client
  // saber refetchar /api/auth/csrf-token + retry. Não vaza stack pro client.
  const code = (err as { code?: string })?.code;
  if (code === "EBADCSRFTOKEN") {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[csrf] EBADCSRFTOKEN on ${req.method} ${req.path}`);
    }
    res.status(403).json({
      status: "error",
      code: "csrf_invalid",
      message: "Invalid CSRF token. Refresh and retry.",
    });
    return;
  }

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
