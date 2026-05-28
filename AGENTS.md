# AGENTS.md — claude-token-tracker

> Convenções para agentes de IA que trabalham neste repo. Single-user Patrick. Strangler Fig pattern em curso (legacy `server/` → V2 `apps/`+`packages/`).

---

## 1. Sobre o Projeto

claude-token-tracker é uma ferramenta single-user pra Patrick rastrear uso e custo de tokens LLM (Claude Code + Codex CLI + claude.ai via Tampermonkey). Coletores externos enviam eventos via webhook; tracker armazena, normaliza pricing, calcula custos e exibe dashboards/analytics.

Estado atual (legacy):
- `server/` — Express 5 + TS monolítico + Postgres 16 (Docker container `claude-token-tracker-db`).
- `client/` — React + Vite + TS.
- 60k+ entries em DB, ~5k/dia.
- Audit 2026-05-26: 88 findings (0 P0, 22 P1, 43 P2, 23 P3).

Estado alvo (V2 strangler):
- `apps/api` — Express modular (rotas + auth + ingestion gateway).
- `apps/web` — Vite + React (frontend).
- `apps/worker` — Node consumer da Postgres queue caseira.
- `packages/api-client` — types gerados de OpenAPI/Zod.
- `packages/domain` — schemas Zod + regras (pricing, normalize, dedup, time).
- `packages/config` — env loader.
- `infra/` — docker-compose dev/prod + (day-2) Grafana LGTM + GlitchTip.
- `.github/workflows/` — CI lint + typecheck + unit + integration + build.

Não é SaaS público. Multi-user **compatível** day-1 (`user_id` em todas tabelas, scopes em tokens). Multi-user nativo (RLS/orgs/quotas) só quando 2º user real chegar.

## 2. Documentos canônicos

Sempre consulte antes de mexer:

- **`.claude/RULES.md`** — R1-R19 invioláveis.
- **`docs/architecture/architecture-proposal.md`** — Codex xhigh strangler (2026-05-26).
- **`docs/architecture/decisions/`** — ADRs aceitas (numeradas).
- **`docs/historico/audits-codex-2026-05-26/audit-FINAL.md`** — 88 findings priorizados (P0-P3).
- **`docs/historico/audits-codex-2026-05-26/architecture-proposal.md`** — proposta original.
- **`RUNBOOK.md`** — ops day-to-day legacy.

## 3. Estrutura (alvo V2)

```
claude-token-tracker/
├── apps/                                  (planejado V2)
│   ├── api/                               # Express + rotas + auth + ingestion gateway
│   ├── web/                               # Vite + React + Recharts
│   └── worker/                            # Node + queue consumer
├── packages/                              (planejado V2)
│   ├── api-client/                        # Types gerados de Zod (web consome)
│   ├── domain/                            # Pricing, normalize, dedup, time, schemas Zod
│   └── config/                            # Env loader (zod)
├── infra/                                 (planejado V2)
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── otel-collector/                    (day-2)
│   └── grafana/                           (day-2)
├── server/                                (legacy — strangler em curso)
├── client/                                (legacy — strangler em curso)
├── scripts/                               # autostart, helpers
├── docs/
│   ├── architecture/
│   │   ├── architecture-proposal.md       # codex xhigh strangler
│   │   └── decisions/                     # ADRs MADR
│   ├── audit-graficos-2026-05-20.md
│   ├── design-system.md
│   └── historico/
│       ├── audits-codex-2026-05-26/       # 9 audits + FINAL
│       ├── audits-pre-strangler/          # waves passadas
│       ├── catalogo-erros.md
│       └── resolucoes-erros.md
├── .claude/
│   ├── RULES.md                           # R1-R19
│   ├── agents/                            # 5 agentes IA
│   └── skills/                            # 10 skills
├── docker-compose.yml                     # Postgres container
├── AGENTS.md                              # Este arquivo
├── README.md
└── RUNBOOK.md
```

## 4. Convenções

### 4.1 Auditoria automática (R4)

- Toda mutação API grava `audit.audit_log` via `withAudit({ctx, mutate, loadBefore?, loadAfter?})` em `apps/api/src/infra/audit.ts`.
- Todo evento ingerido grava em `ingestion_events` (queue + audit) antes de qualquer write final.
- Endpoint que muta sem auditar = bug. `tracker-qa` bloqueia PR.

### 4.2 Multi-user compat day-1 (R10)

- `user_id` obrigatório em todas tabelas com dado de cliente.
- Auth via JWT cookie httpOnly + CSRF guard.
- Queries sempre filtram `user_id`. RLS/orgs/roles esperam 2º user real.

### 4.3 Pricing inviolável sem ADR (R11)

`packages/domain/src/pricing.ts` é fonte canônica. Mudança = ADR + migration `pricing_snapshots` aditiva + skill `tracker-business-rules` updated.

### 4.4 Timestamps UTC storage / BRT boundaries (R12)

`TIMESTAMPTZ` UTC armazenado. Webhook aceita só ISO 8601 com offset. Boundaries de "hoje/mês" em `America/Sao_Paulo`. Display BRT.

### 4.5 Idempotência universal (R13)

`X-Idempotency-Key` obrigatório no webhook. Dedup via `ingestion_events.unique(user_id, source, idempotency_key)` + `token_entries.unique(ingestion_event_id)`.

### 4.6 Strangler, não rebuild (R15)

Substituição de módulo legacy preserva compat temp + flag + rollback plan + cutover por wave pequena. Big-bang rebuild = bug.

### 4.7 Unknown model fail-closed (R16)

`normalizeModel("unknown")` retorna `null` → `pricing_status='unknown'`, `cost_usd=0`. **Nunca default modelo billable**.

### 4.8 Custo server-side (R17)

Client nunca envia `cost_usd` confiável. Server calcula via `pricing.ts`.

### 4.9 Test fixtures obrigatórias (R18)

Pricing/TZ/dedup/idempotency têm fixture em `apps/api/test/fixtures/`. Mudança = atualiza fixture obrigatório.

### 4.10 Documentação de alterações (R2)

Mudança estrutural (rota nova, fila nova, migration, env var, contrato webhook, ADR) deve atualizar:

1. `apps/api/openapi.json` se contrato API.
2. `apps/api/README.md` se env/comando mudou.
3. Skill correspondente em `.claude/skills/`.
4. `docs/schema/schema.sql` se migration.
5. `docs/architecture/decisions/NNNN-titulo.md` se decisão fixada.

`tracker-documenter` é enforcer.

## 5. Time de agentes IA (5)

Carregados automaticamente conforme contexto. Em `.claude/agents/`:

| Agente | Modelo | Quando ativar |
|---|---|---|
| **`tracker-orchestrator`** | opus | Coordenador-mestre. Delegate-only. Wave grande / cross-cutting / qual agente invocar |
| **`tracker-cto`** | opus | Decisão arquitetural / trade-off / anti-overengineering / ADR |
| **`tracker-backend`** | sonnet | Express + Postgres + worker + queue + audit (cross-cutting backend) |
| **`tracker-qa`** | sonnet | Testes / CI / regression / smoke E2E / fixture canônica. 2º mais importante |
| **`tracker-documenter`** | sonnet | Enforcer R2 — sync OpenAPI / RULES / skills / ADRs / runbook |

Cortados (vs supply-mep-v2):
- `tracker-frontend` (Patrick toca direto, skill `stack-vite-react` basta).
- `tracker-ingestion` (cabe em `tracker-backend`, separar = over-eng).
- `tracker-mep-specialist`, `tracker-product-analyst` (sem stakeholder externo, sem domínio HVAC).

## 6. Skills disponíveis (10)

Carregadas automaticamente conforme contexto. Em `.claude/skills/`:

**Domínio (3 skills)**:
- **`tracker-business-rules`** — pricing + normalize + dedup + billing calc + timezone semantics + unknown fail-closed.
- **`tracker-domain`** — entidades canônicas (TokenEntry, IngestionEvent, PricingSnapshot, etc.) + enums + FK conventions.
- **`tracker-product-decisions`** — template ADR MADR + history.

**Ingestion + Stack técnica (3 skills)**:
- **`stack-express-pg-queue`** — Express 5 + Zod + Postgres queue caseira + worker pattern + retry/DLQ.
- **`tracker-ingestion-contract`** — webhook v1 schema + auth (token+HMAC) + idempotency + batch + versionamento.
- **`stack-vite-react`** — React 19 + React Query v5 + filters dinâmicos + invalidation matrix + TZ display.

**Cross-cutting (3 skills)**:
- **`tracker-postgres-security`** — query isolation user_id + SQL injection prevention + pool tuning + RLS roadmap day-2.
- **`tracker-observability`** — pino logs day-1 + métricas queue + heartbeat. OTel + Grafana LGTM day-2.
- **`tracker-testing-ci`** — Vitest + fixtures invariantes + GitHub Actions + regression matrix 88 findings.

**Visual (1 skill)**:
- **`stack-shadcn-tailwind`** — design system tokens + CVA variants + Recharts.

## 7. Convenções de código

- TypeScript estrito (`strict: true`) em todos packages.
- Arquivos `kebab-case` (`token-entry.ts`, não `TokenEntry.ts`).
- Comentários internos PT-BR, contrato API EN (OpenAPI strict).
- Schemas Zod compartilhados em `packages/domain` reusados em rota + worker + frontend.
- Workers idempotentes (chave de domínio = `idempotency_key`).
- Sem `any` salvo em integração com lib externa sem types.

## 8. Workflow desenvolvimento

```
Patrick + Claude Code (orchestrator)
  └─ delega pra agentes especializados
     ├─ tracker-cto (decisão arquitetural)
     ├─ tracker-backend (implementação)
     ├─ tracker-qa (validar antes merge)
     └─ tracker-documenter (sync docs pós-mudança)
```

Wave grande: orchestrator pode spawn codex-delegate workers paralelos (skill em `supply-mep-v2/tools/codex-delegate/`).

## 9. Troubleshooting rápido (planejado V2)

| Problema | Primeira ação | Onde olhar |
|---|---|---|
| Webhook responde 4xx | Schema Zod rejeitou | Logs pino + skill `tracker-ingestion-contract` |
| Webhook responde 401 | `X-Webhook-Token` errado | `users.webhook_token_hash` + collector config |
| Worker não consome | Queue bootstrap falhou (R7) | `apps/api/src/infra/queue-bootstrap.ts` logs |
| Worker em loop fail | DLQ depois max attempts | `SELECT * FROM ingestion_dead_letters` |
| Entry com cost wrong | Pricing snapshot ativo | `SELECT * FROM pricing_snapshots WHERE model_key=...` |
| Dashboard "hoje" zerado fim de dia | TZ boundary UTC vs BRT | F7 audit FINAL — query usa BRT? |
| Filter Dashboard model vazio | Input livre vs server exact match | F2 audit FINAL — usa NativeSelect /distinct |
| Filter Entries "Até" perde dia | Date inclusivo errado | F9 audit FINAL — anexa T23:59:59 BRT |
| Source dropdown sem `codex` | Hardcoded? | useEntriesDistinct dinâmico |
| `tracker-qa` bloqueando PR | R8/R13/R18 violado? | Listar gate violado e fix |

## 10. Infra (estado + alvo)

| Serviço | Hoje | Alvo V2 |
|---|---|---|
| API | localhost:3002 (server/ Express) | apps/api Docker container |
| Web | localhost:5173 (Vite dev) / static dist | apps/web Vite → nginx alpine |
| Postgres | `claude-token-tracker-db` container | mesmo, com migrations sequenciais ≥021 |
| Worker | inline no API process | apps/worker container separado |
| Reverse proxy | none | Traefik (day-2, multi-user) |
| Observability | console.log | pino + admin metrics endpoint (day-1) → OTel + Grafana LGTM (day-2) |
| Error tracking | none | GlitchTip (day-2) |
| CI | none | GitHub Actions (Wave 0) |
| Backup | manual `pg_dump` | scheduled cron + offsite (day-2) |

## 11. Como contribuir (Patrick)

1. **Plano**: leia `audit-FINAL.md` + ADRs relevantes. Pergunte `tracker-cto` se trade-off não óbvio.
2. **TDD**: peça `tracker-qa` escrever teste regression primeiro.
3. **Implement**: `tracker-backend` implementa (schema → service → rota → worker → teste).
4. **Validate**: `tracker-qa` valida (`pnpm typecheck && pnpm test && pnpm test:e2e`).
5. **Doc sync**: `tracker-documenter` atualiza OpenAPI / RULES / skills / ADR.
6. **Merge**: CI verde obrigatório.

## 12. Audit history

- **2026-05-26 (codex xhigh + 9 workers paralelos)**: 88 findings (0 P0, 22 P1, 43 P2, 23 P3). Em `docs/historico/audits-codex-2026-05-26/`. Architecture proposal Strangler Fig em `docs/architecture/architecture-proposal.md`.
- Próximo audit pós-Wave 4 (cutover legacy → V2 50%).
