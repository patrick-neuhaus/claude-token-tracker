import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthRequest, AuthUser } from "../types/index.js";

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ status: "error", message: "No token provided" });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      const name = err instanceof Error ? err.name : "unknown";
      console.warn(`[auth] JWT verify failed: ${name}`);
    }
    res.status(401).json({ status: "error", message: "Invalid token" });
  }
}
