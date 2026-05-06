import type { Request } from "express";
import type { AuthRequest } from "../types/index.js";
import { startOfTodayBR, startOfMonthBR, startOfNDaysAgoBR } from "./dateBR.js";

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

/**
 * Converte preset ou from/to em range de timestamps ISO.
 *
 * Wave 7.1 fix: presets calculados em America/Sao_Paulo (não UTC do container Docker).
 * Antes: `setHours(0,0,0,0)` no Node = midnight UTC = 21h ontem BR.
 * Agora: helpers dateBR usam fromZonedTime/toZonedTime pra wall-clock BR correto.
 */
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

  const end = new Date().toISOString();

  if (period === "today") {
    return { start: startOfTodayBR(), end };
  }
  if (period === "7d") {
    return { start: startOfNDaysAgoBR(7), end };
  }
  if (period === "month") {
    return { start: startOfMonthBR(), end };
  }
  if (period === "all") {
    return { start: "1970-01-01T00:00:00.000Z", end };
  }
  // Default: 30d
  return { start: startOfNDaysAgoBR(30), end };
}
