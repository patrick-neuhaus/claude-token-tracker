import type { Request } from "express";
import type { AuthRequest } from "../types/index.js";

export const MS_PER_DAY = 86_400_000;

/** Extrai userId do request autenticado — substitui o padrão (req as AuthRequest).user!.userId */
export function getUserId(req: Request): string {
  return (req as AuthRequest).user!.userId;
}

/** Extrai from/to dos query params */
export function getDateRange(req: Request): { from?: string; to?: string } {
  return {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  };
}

/** Converte preset ou from/to em range de timestamps ISO */
export function parsePeriod(
  period: string | undefined,
  from?: string,
  to?: string
): { start: string; end: string } {
  if (from || to) {
    return {
      start: from || "1970-01-01T00:00:00.000Z",
      end: to || new Date().toISOString(),
    };
  }

  const now = new Date();
  const end = now.toISOString();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start: start.toISOString(), end };
  }
  if (period === "7d") {
    return { start: new Date(now.getTime() - 7 * MS_PER_DAY).toISOString(), end };
  }
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end };
  }
  if (period === "all") {
    return { start: "1970-01-01T00:00:00.000Z", end };
  }
  // Default: 30d
  return { start: new Date(now.getTime() - 30 * MS_PER_DAY).toISOString(), end };
}
