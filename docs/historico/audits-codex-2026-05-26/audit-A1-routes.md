# Audit W-A1 - Backend routes

## Status
ACHADOS

## Findings (P0-P3)
- P1 [auth]: `admin` confia no `role` do JWT, então um admin rebaixado pode manter acesso até expirar o cookie/JWT. Files: `server/src/middleware/auth.ts:45`, `server/src/middleware/requireRole.ts:6`, `server/src/routes/admin.ts:9`. Fix sugerido: revalidar role atual no DB em `requireRole` ou invalidar tokens ao mudar role.

- P1 [data integrity]: import CSV aceita tokens negativos e strings parciais (`parseInt("-5")`, `parseInt("10abc")`) e grava/cobra valores inválidos. File: `server/src/routes/import.ts:139`. Fix sugerido: trocar por schema numérico inteiro `>=0` e rejeitar parsing parcial.

- P2 [query parsing]: `from/to` entram como string crua em filtros; datas inválidas viram 500 no Postgres ou `RangeError` nos stats. Files: `server/src/utils/routeHelpers.ts:15`, `server/src/routes/skillInvocations.ts:81`, `server/src/routes/toolInvocations.ts:82`. Fix sugerido: helper central `parseIsoDateQuery` com 400 em inválido.

- P2 [query parsing]: `project_id` query sem validação é usado em cast `::uuid`, causando 500 para UUID inválido. Files: `server/src/routes/dashboard.ts:17`, `server/src/utils/filterBuilders.ts:82`. Fix sugerido: validar `project_id` com `z.string().uuid()` antes de chamar services.

- P2 [query parsing]: `period` inválido cai silenciosamente para 30d, mascarando bug de client/URL. File: `server/src/utils/routeHelpers.ts:53`. Fix sugerido: aceitar enum explícito (`today|7d|month|all|30d`) e retornar 400 para valor desconhecido.

- P2 [response shape]: `GET /api/sessions/:id/entries` descarta `{ rows,total,limit,offset }` do service e retorna só array + header `X-Total-Count`, diferente de `/api/entries` e do próprio contrato do service. Files: `server/src/routes/sessions.ts:62`, `server/src/services/sessionsService.ts:185`. Fix sugerido: retornar JSON paginado consistente.

- P2 [response shape]: `/api/analytics/compare` retorna `[]` quando não há projetos ou UUIDs válidos, mas retorna `{ summary, daily }` quando há dados. Files: `server/src/services/analyticsService.ts:197`, `server/src/services/analyticsService.ts:244`. Fix sugerido: sempre retornar `{ summary: [], daily: [] }`.

- P2 [source/model]: webhook aceita `source = codex`, mas CSV import só aceita `claude-code|claude.ai`; isso quebra paridade entre ingestion paths. Files: `server/src/webhook.ts:12`, `server/src/routes/import.ts:128`. Fix sugerido: centralizar enum de source e reutilizar em webhook/import.

- P2 [model validation]: `model` é string arbitrária sem max/allowlist em webhook/import; pricing cai em default, então typo cria dados e custo silenciosamente incorretos. Files: `server/src/routes/webhook.ts:13`, `server/src/routes/import.ts:119`. Fix sugerido: aplicar max length, normalização e flag/400 para modelo desconhecido conforme contrato desejado.

- P2 [path/query parsing]: `getSkillFile` usa `fullPath.startsWith(skillDir)`; isso pode permitir sibling prefix traversal (`skill` vs `skill-other`). Files: `server/src/routes/skills.ts:30`, `server/src/services/skillsService.ts:423`. Fix sugerido: validar `fullPath === skillDir || fullPath.startsWith(skillDir + path.sep)`.

- P2 [body validation]: `PATCH /api/projects/:id` passa `req.body` direto ao service, diferente do create schema; aceita `name` vazio/overlong e `description` sem limite. File: `server/src/routes/projects.ts:49`. Fix sugerido: usar schema parcial com trim/min/max.

- P3 [error handling]: forgot password engole erro de token/email e sempre retorna sucesso. Isso protege enumeração, mas remove sinal operacional de falha de envio. File: `server/src/routes/auth.ts:195`. Fix sugerido: manter resposta genérica, mas registrar métrica/log estruturado sem PII.

- P3 [error handling]: import retorna mensagem interna do erro de DB para o client. File: `server/src/routes/import.ts:310`. Fix sugerido: logar detalhe server-side e responder mensagem estável + `errorId`.

## Resumo executivo
- `index.ts` monta 18 routers e todos os arquivos em `server/src/routes` estão montados; orphans encontrados: nenhum.
- Rotas JWT principais usam `router.use(authMiddleware)`; exceções sem JWT são auth flow público, health e endpoints webhook protegidos por `webhookAuth`.
- O maior risco real é validação fraca de query/body: datas, UUIDs, CSV numbers e project patch.
- Shapes divergem em endpoints similares, principalmente session entries e analytics compare.
- Source/model não têm contrato único: `codex` existe no webhook, não no import; `model` é aceito quase sem validação.
