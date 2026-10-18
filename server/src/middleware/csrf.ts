import csrf from "csurf";
import type { RequestHandler } from "express";

/**
 * SECURITY (Fase A A1): CSRF protection — double-submit cookie pattern.
 *
 * csurf cria cookie httpOnly `_csrf` (secret) e gera token sincronizado
 * que o client envia em header `X-CSRF-Token` em requests state-changing.
 *
 * Mesma config usada no guard global (index.ts) e no endpoint
 * /api/auth/csrf-token. Manter UMA instância exportada garante que o cookie
 * `_csrf` gerado pelo endpoint seja válido pra validação no guard.
 *
 * NOTE: csurf está archived pelo Express team mas ainda funcional pra
 * Express 5 com cookie config (não session config). Migração futura pra
 * csrf-csrf (double-submit nativo, mantido) está no backlog Onda futura.
 */
export const csrfProtection = csrf({
  cookie: {
    key: "_csrf",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

/**
 * Prefixos de path que NÃO passam pelo CSRF guard global.
 * - /api/webhook/*  collectors externos usam X-Webhook-Token.
 * - /health         healthcheck público sem state change.
 */
export const CSRF_SKIP_PREFIXES = [
  "/api/webhook/",
  "/health",
];

/**
 * Paths exatos /api/auth que NÃO passam pelo CSRF guard global.
 * - login/register/forgot/reset: sem session prévia, mitigação via rate limit.
 * - csrf-token: handler aplica csrfProtection diretamente pra gerar o cookie.
 */
export const CSRF_SKIP_AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot",
  "/api/auth/reset",
  "/api/auth/csrf-token",
]);

// F13: estes coletores ficam fora de /api/webhook/ e autenticam via
// webhookAuth. Isentar apenas POST /track, nunca os routers inteiros nem
// qualquer request que apenas apresente X-Webhook-Token.
const CSRF_SKIP_WEBHOOK_POST_PATHS = new Set([
  "/api/tool-invocations/track",
  "/api/skill-invocations/track",
  "/api/compactions/track",
]);

export const csrfGuard: RequestHandler = (req, res, next) => {
  if (CSRF_SKIP_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }
  if (CSRF_SKIP_AUTH_PATHS.has(req.path)) {
    return next();
  }
  // Express usa paths case-insensitive e aceita uma barra final por padrao.
  const webhookPath = req.path.toLowerCase().replace(/\/$/, "");
  if (req.method === "POST" && CSRF_SKIP_WEBHOOK_POST_PATHS.has(webhookPath)) {
    return next();
  }
  return csrfProtection(req, res, next);
};
