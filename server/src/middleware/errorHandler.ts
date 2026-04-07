import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error("[ERROR]", err instanceof Error ? err.message : err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ status: "error", message: "internal error" });
};
