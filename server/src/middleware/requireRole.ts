import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/index.js";

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }
    next();
  };
}
