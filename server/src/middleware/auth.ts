import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthRequest, AuthUser } from "../types/index.js";

/**
 * SECURITY (Fase A A1): auth token lido de cookie httpOnly signed (auth_token)
 * primeiro, Authorization Bearer header como fallback.
 *
 * Fluxo cookie (browser):
 *   - login/register seta `auth_token` httpOnly + signed via res.cookie()
 *   - cookie-parser middleware (registrado em index.ts) hidrata
 *     req.signedCookies.auth_token automático
 *   - JS no client NÃO consegue ler o cookie (mitiga XSS exfil) — só envia
 *     automático via fetch credentials:include
 *
 * Fallback Bearer (server-to-server / collectors externos):
 *   - mantido por compat com scripts/integrações que injetam JWT em header
 *   - collectors webhooks usam X-Webhook-Token, NÃO JWT — não afeta
 *   - se algum collector externo (futuro) usar JWT, Bearer header continua
 *     funcionando
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // 1) Try signed cookie (browser path, default pós-Fase A).
  let token: string | undefined = req.signedCookies?.auth_token;

  // 2) Fallback to Authorization Bearer header (server-to-server / legacy).
  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      token = header.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ status: "error", message: "No token provided" });
    return;
  }

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
