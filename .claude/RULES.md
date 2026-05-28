# claude-token-tracker — Rules globais

> Regras invioláveis para todos os agentes (`.claude/agents/tracker-*`) e para o Claude Code principal trabalhando neste repo. O `tracker-documenter` é o enforcer de sync. O `tracker-qa` bloqueia merge se R8/R13/R18 violado.
>
> App single-user (Patrick), roadmap multi-user. Sem stakeholder externo. Strangler Fig pattern (não rebuild puro). Padrão operacional inspirado em `supply-mep-v2`, sem replicar complexidade de domínio dele.

## R1. Doc oficial vence

Toda skill `stack-*` ou `tracker-*` que cita doc externa (Express, Postgres, Vite, React, OTel) tem cláusula `## ⚠️ Doc oficial`. Se a skill diverge da doc oficial: **doc vence**. Atualizar skill, registrar em ADR, avisar Patrick. Nunca implementar contra a skill se a doc oficial mudou.

## R2. Mudança estrutural → docs sincronizados

Após qualquer mudança abaixo, **acionar `tracker-documenter`** para sincronizar docs/skills/runbook:

1. Nova rota Express (`app.<method>(...)` em `apps/api/src/routes/`) → regenerar `apps/api/openapi.json` + atualizar `docs/architecture/`.
2. Nova fila / kind de job no worker → atualizar `stack-express-pg-queue` skill + `docs/architecture/INGESTION.md`.
3. Nova tabela/migration Postgres → atualizar `docs/schema/` + sequencial migration. Migration aditiva obrigatória (R6).
4. Nova env var → atualizar `apps/api/README.md` + `.env.example` + skill correspondente.
5. Mudança em contrato webhook / schema Zod ingestão → skill `tracker-ingestion-contract` + bump SemVer do endpoint.
6. Bug recorrente identificado → skill correspondente (seção "Bugs conhecidos") + comentário no código + entry em `docs/historico/`.
7. Decisão arquitetural fixada → `docs/architecture/decisions/NNNN-titulo.md` (ADR) + skill `tracker-product-decisions`.

## R3. OpenAPI canônico

`apps/api/openapi.json` é a verdade. CI bloqueia drift. Disciplina de versão (`info.version`):

- PATCH: descrição/cosmético.
- MINOR: campo opcional novo, endpoint opcional novo.
- MAJOR: breaking (remoção, tipo trocado, campo obrigatório novo, mudança de contrato).

## R4. Auditoria automática

- Toda mutação na API grava `audit.audit_log` via `withAudit({ctx, mutate, loadBefore?, loadAfter?})` em `apps/api/src/infra/audit.ts`.
- Todo evento ingerido grava em `ingestion_events` (queue + audit) antes de qualquer write final.
- Endpoint que muta sem auditar = bug. `tracker-qa` bloqueia PR.

## R5. Secrets via Vault/Docker secrets

Credenciais sensíveis (`webhook_token_hash`, `JWT_SECRET`, `DB_PASSWORD`, futuras integrações Stripe/email):

1. **Dev/local**: `.env` em `apps/api/.env` (gitignored), nunca commitado.
2. **Prod**: Docker Swarm secrets (`/run/secrets/<name>`) ou variável de ambiente do host. Loader em `apps/api/src/config/secrets.ts` aceita `*_FILE` env var.

Nunca em log, nunca em texto puro fora do `.env` local.

## R6. Migrations aditivas (preserva histórico)

Apenas `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. Drops/renames só em janela explícita pós-cutover com plano de coexistência documentado em ADR.

Numeração sequencial `<NNN>_<descricao>.sql` em `apps/api/migrations/`. Migrations existentes do server legacy (`server/migrations/001-020`) preservadas — V2 continua sequencial a partir de `021_*.sql`.

`pg_dump --schema-only` versionado em `docs/schema/schema.sql` após cada migration aplicada.

## R7. Postgres queue — `CREATE TABLE` antes de send/read

Worker que consome `ingestion_events` exige a tabela existir + colunas corretas antes de subir. Bootstrap em `apps/api/src/infra/queue-bootstrap.ts`:

- Verifica `ingestion_events` existe (via `to_regclass`).
- Verifica `ingestion_dead_letters` existe.
- Verifica indexes (`status`, `next_run_at`, `unique(user_id,source,idempotency_key)`).
- Aborta boot se faltar — não tenta criar runtime.

Filas/event_types atuais: `token_entry`, `skill_invocation`, `tool_invocation`, `compaction`, `rollup_daily`. Snake_case sem ponto.

## R8. Antes de declarar concluído

`pnpm typecheck && pnpm test` mínimo. Para mudança em rota/worker/queue: smoke curl específico + pipeline real em 1 amostra (webhook → enfileira → worker → DB). `tracker-qa` valida antes de merge.

## R9. Confirmação para ações destrutivas/compartilhadas

Mesmo que tecnicamente possível, sempre pedir confirmação antes de:

- `git push --force` ou push em main protegida
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM` em produção
- Trocar `JWT_SECRET`, `webhook_token` em uso
- Mexer em prod (Postgres prod, Docker Swarm prod)
- Reset/migration que apague `token_entries`, `sessions`, `projects`, `ingestion_events`

## R10. Multi-user compatible day 1

Schema, auth e queries assumem multi-user desde o início:

- `user_id` obrigatório em todas tabelas com dado de cliente (`token_entries`, `sessions`, `projects`, `ingestion_events`, etc.).
- Auth flow assume `user_id` via JWT cookie httpOnly.
- Queries sempre filtram por `user_id` (sem global SELECT *).
- Sem global state que dependa de "Patrick é o único user".
- Scopes em webhook tokens (`scope: ['ingest:tokens', 'ingest:skills']` etc.).

**Mas RLS/orgs/roles/quotas completas esperam segundo usuário real.** Day 1 = compatível, não nativo.

## R11. Pricing inviolável sem ADR

`packages/domain/src/pricing.ts` é a fonte canônica de billing. Mudança exige:

1. ADR em `docs/architecture/decisions/NNNN-pricing-*.md` com motivo + snapshot anterior + plano backfill.
2. Aprovação `tracker-cto`.
3. Migration aditiva criando `pricing_snapshots` row com pricing anterior preservado (auditoria).
4. Skill `tracker-business-rules` atualizada (seção Pricing).

## R12. Timestamps: UTC storage, BRT boundaries

- Storage: todas colunas `timestamp` são `TIMESTAMPTZ` armazenadas em UTC.
- Webhook ingestion: aceita só ISO 8601 com offset (`Z` ou `+HH:MM`). Rejeita string sem offset (Zod `.datetime({ offset: true })`).
- Boundaries de relatório ("hoje", "este mês", "últimos 7 dias"): calculados em `America/Sao_Paulo` (Patrick BRT). `date_trunc('day', timestamp AT TIME ZONE 'America/Sao_Paulo')`, nunca em UTC.
- Display UI: BRT (`formatters.formatDate` força TZ).
- CSV export: UTC ISO 8601 explícito (`toISOString()`).

## R13. Idempotência universal

Todo evento (token_entry, skill_invocation, tool_invocation, compaction) tem `idempotency_key` no payload do webhook.

- Coletores novos: `X-Idempotency-Key` header obrigatório.
- Coletores legacy (compat): server calcula key canônica = `sha256(source + session_id + timestamp + event_type + tokens_tuple)`.
- Dedup via `ingestion_events.unique(user_id, source, idempotency_key)`.
- Write final em `token_entries` referencia `ingestion_event_id` (FK + unique).

Sem idempotência → webhook rejeita 400.

## R14. `tracker-ingestion-contract` é gatekeeper webhook

Mudança em:

- `apps/api/src/routes/webhook/*` (qualquer endpoint)
- Schema Zod do payload ingestão
- Allowlist de modelos/sources
- Auth do webhook (`X-Webhook-Token`, `X-Idempotency-Key`, `X-Webhook-Signature` HMAC)
- Worker consumer (`apps/worker/src/*`)

**Exige aderência à skill `tracker-ingestion-contract`** (canônica). `tracker-backend` implementa, `tracker-qa` bloqueia drift via teste contract.

## R15. Strangler, não rebuild

Toda substituição de módulo legacy (`server/` antigo) por módulo novo (`apps/api/`, `apps/worker/`):

1. Preserva legacy ativo até cutover validado.
2. Implementa flag de feature (`INGESTION_V2_ENABLED=true|false`) com default OFF.
3. Tem plano de rollback documentado em ADR.
4. Cutover por wave pequena, validável, reverível.

Big-bang rebuild = bug.

## R16. Unknown model/source fail closed

`normalizeModel(rawModel)` retorna `null` ou sentinel `"unknown"` para modelo não reconhecido. **Nunca default pra modelo billable (gpt-5, etc.)**.

- Webhook: rejeita 400 se model não bate allowlist OU permite mas marca `pricing_status='unknown'` (entry grava mas sem custo).
- Dashboard: entries com `pricing_status='unknown'` aparecem em flag "modelos sem pricing" pro user revisar.

Mesmo princípio para `source`: enum estrito (`claude-code | claude.ai | codex`). Source desconhecido = rejeita.

## R17. Custo é server-side

Cliente (webhook collector, browser UI) **nunca envia `cost_usd` confiável**. Server calcula via `pricing.ts` no momento do write final.

- Webhook payload aceita `cost_usd` opcional pra debug, mas ignora.
- Dashboard exibe custo lido do DB (calculado server).
- Recalc job: alterar pricing aplica via backfill em `pricing_snapshots` + recompute, não recebe novo cost do client.

## R18. Test fixture obrigatória para invariantes

Pricing, timezone, dedup e idempotency têm fixture explícita em `apps/api/test/fixtures/`:

- `pricing.fixtures.ts`: 1 entry por modelo suportado + cost_usd esperado.
- `timezone.fixtures.ts`: boundaries de "hoje BRT" vs UTC, "este mês BRT".
- `dedup.fixtures.ts`: 2 eventos com mesma tuple (esperar 1 inserção) + 2 eventos com session_id NULL.
- `idempotency.fixtures.ts`: replay com mesma key (esperar 1 inserção, 200 OK) + retry com key nova (2 inserções).

Mudança em pricing/TZ/dedup/idempotency = atualizar fixture obrigatório. `tracker-qa` bloqueia PR sem fixture.

## R19. Migrations/backfills idempotentes com rollback

Toda migration com data movement (backfill, recompute) é:

1. **Idempotente**: rodar 2x não duplica.
2. **Rollback documentado**: ADR ou comment no SQL com query de reversão.
3. **Batch-safe**: opera em lotes (`LIMIT 1000`) com checkpoint, não single `UPDATE WHERE`.
4. **Dry-run flag**: env var `MIGRATION_DRY_RUN=true` simula sem commit.

Drop de coluna/tabela = janela explícita pós-cutover + ADR.
