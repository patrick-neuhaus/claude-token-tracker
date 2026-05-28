# Audit W-A3 — Middleware

## Status

Read-only audit concluído em `server/src/middleware/*.ts` e montagem em `server/src/index.ts`.

Cobertura verificada:
- Rotas privadas usam `authMiddleware` via `router.use(...)` ou per-route.
- Exceções públicas esperadas: `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot`, `/api/auth/reset`, `/api/auth/csrf-token`, `/health`.
- Webhooks usam `webhookAuth`, mas nem todos estão sob `/api/webhook/*`.
- `/login`, `/register` e `/reset` usam `authLimiter`; `/forgot` usa `forgotPasswordLimiter`.
- `webhookLimiter` não existe, alinhado ao pedido do Patrick.

## Findings (P0-P3)

### P1 — CSRF bloqueia webhooks fora de `/api/webhook/*`

`CSRF_SKIP_PREFIXES` só pula `/api/webhook/` e `/health` (`server/src/middleware/csrf.ts:31`). O guard global roda antes dos routers (`server/src/index.ts:105`) e só pula esses prefixos.

Mas há endpoints webhook em:
- `POST /api/compactions/track` com `webhookAuth` (`server/src/routes/compactions.ts:33`, mount `server/src/index.ts:138`)
- `POST /api/skill-invocations/track` (`server/src/routes/skillInvocations.ts:29`, mount `server/src/index.ts:135`)
- `POST /api/tool-invocations/track` (`server/src/routes/toolInvocations.ts:29`, mount `server/src/index.ts:137`)

Collectors externos com `X-Webhook-Token` não terão token CSRF, então recebem `403` antes de chegar no `webhookAuth`. Não é bypass; é quebra de ingestão.

### P2 — `errorHandler` loga stack/message completo em produção

`errorHandler` não vaza stack para o cliente em prod, mas loga `err.stack ?? err.message` sempre (`server/src/middleware/errorHandler.ts:25`). Isso pode capturar PII/secrets se algum erro não tratado incluir payload, token, email, reset token ou SQL context.

Rotas específicas já usam `describeError`, mas o handler central não usa sanitização (`server/src/utils/security.ts`).

### P3 — CSRF cookie não é assinado

Cookie auth está `httpOnly`, `secure` em prod, `sameSite: "lax"` e `signed: true` (`server/src/routes/auth.ts:37`). Já o cookie `_csrf` usa `httpOnly`, `secure`, `sameSite`, mas não `signed` (`server/src/middleware/csrf.ts:17`).

Com `SameSite=Lax`, risco prático é menor, mas cookie CSRF não assinado deixa defesa mais frágil contra cenários de cookie injection/sibling subdomain.

### P3 — `webhookAuth` engole erro operacional sem log

`webhookAuth` faz `catch { res.status(500)... }` (`server/src/middleware/webhookAuth.ts:34`) sem logar e sem delegar para `errorHandler`.

Isso não vaza segredo, mas cria falha silenciosa em DB/auth lookup: produção verá 500 genérico sem `errorId` nem stack sanitizado.

### P3 — CSRF skip de `/health` é prefix-based demais

`CSRF_SKIP_PREFIXES` inclui `"/health"` e o guard usa `startsWith` (`server/src/index.ts:106`). Isso também pula CSRF para qualquer caminho começando com `/health`.

Hoje só há `app.use("/health", healthRouter)`, então não achei rota state-changing explorável. Ainda assim, é uma skip list mais larga do que precisa; melhor tratar `/health` como match exato ou `/health/`.

### P3 — CSP ainda permite inline style

Helmet está sem `unsafe-eval` e `scriptSrc` é só `'self'` (`server/src/index.ts:67`). Bom.

Mas `styleSrc` mantém `'unsafe-inline'` (`server/src/index.ts:68`). O comentário explica dívida técnica por `style={{...}}`, então é risco aceito/backlog, não regressão imediata.

## Resumo executivo

Não achei bypass atual de auth em rotas privadas. A cobertura via `authMiddleware` está coerente, com webhooks separados por `webhookAuth`.

O problema mais concreto é CSRF: a skip list só cobre `/api/webhook/*`, mas existem três endpoints webhook fora desse prefixo. Isso deve quebrar collectors externos antes da autenticação por `X-Webhook-Token`.

Webhook token não usa comparação plaintext `==`; ele calcula SHA-256 e busca `webhook_token_hash` no banco. `timingSafeEqual` não é necessário nesse desenho.

Rate limit está presente nos fluxos críticos de auth: login/register/reset e forgot. O webhook sem limiter parece intencional conforme instrução do Patrick.
