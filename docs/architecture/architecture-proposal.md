# Proposta de Arquitetura — claude-token-tracker

Codex gpt-5.5 reasoning xhigh, read-only.

Premissa a confrontar: para 60k linhas e +5k/dia, "microserviços" no sentido Kubernetes/Kafka/vários bancos é overkill. O target correto é **monólito modular + ingestion assíncrona + worker separado**, mantendo o Postgres atual. Isso dá 80% do ganho sem reconstruir.

## 1. Diagnóstico Atual

O acoplamento crítico está na ingestão.

`server/src/index.ts` monta tudo no mesmo processo: auth, dashboard, entries, settings, analytics, admin, import, skills, tool invocations, compactions, webhook, static frontend e cleanup de password reset. O mesmo Express atende UI, webhooks externos, consultas analíticas e jobs periódicos.

`server/src/routes/webhook.ts` mistura borda HTTP, validação, normalização parcial e chamada direta ao write path. O schema aceita `timestamp: z.string()`, `model: z.string().min(1)`, tokens default `0`, e não tem idempotency key.

`server/src/services/tokenService.ts` concentra responsabilidade demais: normaliza tokens Codex, resolve pricing, calcula custo, insere `token_entries`, deduplica, upserta `projects`, upserta `sessions` e atualiza `project_id`. Isso deveria ser pipeline transacional ou worker, não service único chamado direto pela rota.

`server/src/middleware/csrf.ts` só pula `/api/webhook/` e `/health`, mas há webhooks em `/api/compactions/track`, `/api/skill-invocations/track`, `/api/tool-invocations/track`. Como o CSRF roda antes dos routers em `index.ts`, esses endpoints são bloqueados antes do `webhookAuth`.

Schema atual confirma os riscos:
- `server/migrations/003_create_token_entries.sql`: `session_id` é nullable.
- `server/migrations/007_add_codex_source_and_openai_models.sql`: adiciona `codex` ao CHECK.
- `server/migrations/017_data_integrity_consolidation.sql`: cria unique index com `session_id`, mas Postgres trata `NULL` como distinto.
- `011_create_skill_invocations.sql`, `014_create_tool_invocations.sql`, `015_create_compactions.sql`: eventos sem chave idempotente.

Ponto único de falha: se o processo Express ou Postgres oscila durante `insertTokenEntry`, o token pode ser gravado sem sessão/agregado. Retry vira duplicate e não repara o agregado.

## 2. Arquitetura Target

Target incremental, sem big-bang:

```text
Collectors
  - Claude Code hook
  - Codex collector
  - claude.ai Tampermonkey / futura extensão
        |
        | HTTPS/local HTTP, JSON, X-Webhook-Token, Idempotency-Key
        v
+-------------------------+
| Ingestion Gateway       |
| Express route/module    |
| /api/webhook/v1/events  |
| Auth, schema, rate,     |
| idempotency reservation |
+-----------+-------------+
            |
            | INSERT ingestion_events
            v
+-------------------------+
| Postgres Queue          |
| ingestion_events        |
| ingestion_dead_letters  |
| idempotency_keys        |
+-----------+-------------+
            |
            | SELECT ... FOR UPDATE SKIP LOCKED
            v
+-------------------------+
| Ingestion Worker        |
| source adapters         |
| validation final        |
| pricing/model catalog   |
| transactional writes    |
+-----------+-------------+
            |
            v
+-------------------------+
| Current Postgres        |
| token_entries           |
| sessions                |
| projects                |
| skill_invocations       |
| tool_invocations        |
| compactions             |
| rollups/materialized    |
+-----------+-------------+
            ^
            |
+-----------+-------------+
| Query/API Monolith      |
| dashboard, entries,     |
| sessions, settings,     |
| auth, admin, frontend   |
+-------------------------+
```

O que fica monólito:
- UI API: dashboard, analytics, entries, sessions, projects, settings, admin.
- Auth JWT/cookie/CSRF.
- Pricing settings e model catalog.
- Frontend static serving.

O que quebra primeiro:
- **Ingestion Gateway** como módulo/rota isolada.
- **Ingestion Worker** como processo Node separado, no mesmo repo, usando o mesmo Postgres.
- Depois, se valer, gateway e worker viram containers separados.

Não criaria 6 microserviços agora. Criaria **duas unidades operacionais**: `api` e `ingestion-worker`.

## 3. Fila + Async

Tecnologia recomendada: **Postgres-backed queue própria**, não Kafka/NATS.

Motivo:
- Postgres já existe em `docker-compose.yml` com `postgres:16-alpine`.
- Volume é baixo: +5k/dia é trivial para Postgres.
- `pgmq` não vem no Postgres puro atual; usar exigiria trocar imagem/extensão.
- Redis/BullMQ adiciona container e operação sem necessidade imediata.
- Kafka é absurdo para esse contexto.

Tabela base:

```sql
ingestion_events (
  id uuid primary key,
  user_id uuid not null,
  source text not null,
  event_type text not null,
  idempotency_key text not null,
  payload jsonb not null,
  status text not null, -- queued, processing, done, failed, dead
  attempts int not null default 0,
  next_run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  error_code text,
  error_message text,
  created_at timestamptz default now(),
  processed_at timestamptz,
  unique (user_id, source, idempotency_key)
)
```

Worker consome com:

```sql
SELECT *
FROM ingestion_events
WHERE status IN ('queued','failed')
  AND next_run_at <= now()
ORDER BY created_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

Workloads async:
- token entries de Claude Code, Codex e claude.ai;
- skill invocations;
- tool invocations;
- compactions;
- session/project aggregate updates;
- recomputação de rollups diários/mensais;
- import CSV grande, no futuro.

Webhook deixa de fazer write final em `token_entries`. Ele valida, reserva idempotência, enfileira e retorna `202 Accepted`.

Retry:
- exponencial com jitter: 1s, 5s, 30s, 2m, 10m.
- máximo 5 tentativas.
- depois vai para DLQ com motivo sanitizado.

Idempotência:
- `ingestion_events.unique(user_id, source, idempotency_key)`.
- `token_entries` ganha `source_event_id` ou `ingestion_event_id` unique.
- fallback para dedup sem idempotency header: hash canônico de `source + session_id + timestamp + model + token tuple`.

## 4. Webhook Hardening

Como corrigir os findings:

- Model lixo: `server/src/routes/webhook.ts` deve usar allowlist/regex centralizada do `server/src/config/pricing.ts` + normalizador. `unknown`, `test`, `healthcheck-bogus` vão para `400` ou quarantine, nunca para billing.
- Billing wrong: `normalizeModel()` em `server/src/utils/modelNormalizer.ts` não pode retornar `gpt-5` para desconhecido. Retornar `null`/`unknown`; pricing desconhecido não cobra.
- Dedup `NULL session_id`: nova migration com `UNIQUE NULLS NOT DISTINCT` ou índice por `COALESCE(session_id,'')`. Melhor ainda: unique por `ingestion_event_id`.
- Sem transaction: worker processa cada evento com `BEGIN/COMMIT`, incluindo token, project, session e aggregate.
- Timestamps: Zod `z.string().datetime({ offset: true })`; timestamps sem offset são rejeitados.
- Zero-token spam: exigir `input + output + cache_read + cache_write + total_tokens > 0`.
- Rate limit: per webhook token, não global por IP. Exemplo local: burst 120/min e 10k/dia, configurável. Para collector, preferir batch endpoint e `Retry-After`.
- Idempotência faltando: `X-Idempotency-Key` obrigatório para novos collectors; fallback calculado para compat.
- CSRF: mover todos os webhooks para `/api/webhook/v1/*`; retirar `/track` espalhado de `compactions`, `skill-invocations`, `tool-invocations`.
- Token plaintext: `webhookAuth.ts` já usa hash, mas o plaintext ainda existe por Settings. Target: token mostrado só uma vez, `users.webhook_token_hash`, `webhook_tokens(label, hash, scope, revoked_at, last_used_at)`.
- Observabilidade: todo webhook loga `request_id`, `source`, `event_type`, `idempotency_key_hash`, status de validação, queue id e duração. Nunca logar payload bruto.

## 5. O Que Expor Externamente

Public/browser API:
- `/api/auth/*`
- `/api/dashboard/*`
- `/api/sessions/*`
- `/api/entries/*`
- `/api/settings/*`
- `/api/projects/*`
- `/api/analytics/*`
- `/api/admin/*`

Auth: cookie httpOnly assinado + CSRF para state-changing browser requests, como hoje em `auth.ts`/`csrf.ts`.

Collector/internal ingestion API:
- `/api/webhook/v1/events`
- `/api/webhook/v1/batch`
- opcional compat temporária: `/api/webhook/track-tokens`

Auth: `X-Webhook-Token`, depois `X-Webhook-Timestamp` + `X-Webhook-Signature` HMAC para clientes que conseguem guardar segredo. Tampermonkey não é bom lugar para segredo; para claude.ai, o target real é extensão/local companion.

Worker:
- sem endpoint público.
- lê Postgres queue.
- health interno via processo/log, ou `/internal/worker/health` só em loopback se necessário.

Metrics:
- `/metrics` restrito a localhost ou protegido.

## 6. Separação Ingestion vs Query

Hoje webhook e dashboard no mesmo Express. Eu separaria em duas etapas:

1. **Agora:** mesmo Express, mas webhook só enfileira. Isso já elimina acoplamento de latência e retry.
2. **Depois:** `api` e `ingestion-worker` como processos separados no mesmo repo.

Read replica: não vale agora. 60k linhas é pequeno. Antes disso:
- índices corretos;
- rollups diários por usuário/source/model;
- materialized views se analytics pesar;
- cache curto controlado.

CQRS: sim, mas leve. `token_entries`/eventos são write model; dashboard pode ler `daily_usage_rollups`, `sessions` e views agregadas. Não precisa event sourcing completo.

## 7. Observabilidade

Faltam quatro camadas:

Structured logs:
- trocar `console.log/error` por `pino`;
- campos: `request_id`, `user_id`, `source`, `event_type`, `queue_id`, `idempotency_key_hash`, `status`, `duration_ms`, `attempt`.
- não logar stack/payload bruto em produção.

Metrics:
- `webhook_requests_total{source,status}`
- `webhook_validation_failed_total{reason}`
- `ingestion_queue_depth`
- `ingestion_oldest_event_age_seconds`
- `ingestion_processed_total`
- `ingestion_failed_total`
- `ingestion_dlq_total`
- `duplicates_total`
- `db_query_duration_ms`
- `worker_processing_duration_ms`

Tracing:
- OpenTelemetry depois. Primeiro request_id propagado já resolve muito.

Alertas baratos:
- script/health local ou Uptime Kuma.
- alerta se DLQ > 0, queue age > 5 min, worker sem heartbeat, DB down, disco do Docker alto, 5xx webhook.

Upgrade path:
- local: logs JSON + health script + dashboard admin de DLQ.
- multi-user: Prometheus + Grafana + Sentry + OTel.

## 8. Migration Plan

Wave 0, hardening imediato, 0.5-1 dia:
- Zod strict no webhook.
- timestamp ISO com offset.
- token positivo obrigatório.
- model allowlist.
- corrigir CSRF dos 3 endpoints.
- corrigir `normalizeModel()` para não cobrar unknown.
Rollback: voltar schema de validação anterior, sem migration pesada.

Wave 1, integridade transacional, 0.5-1 dia:
- refatorar `insertTokenEntry` para usar `pool.connect()` + transaction.
- migration para dedup `NULLS NOT DISTINCT` ou `COALESCE`.
- upsert project/session no mesmo transaction.
Rollback: feature flag para caminho antigo; migration de índice reversível.

Wave 2, idempotência universal, 1 dia:
- criar `ingestion_events` e `ingestion_dead_letters`.
- adicionar `idempotency_key` para token, skill, tool, compaction.
- unique constraints nos eventos.
Rollback: tabelas novas não afetam fluxo antigo.

Wave 3, gateway async, 1-2 dias:
- `/api/webhook/v1/events` enfileira e retorna `202`.
- manter `/api/webhook/track-tokens` compat, internamente enfileirando.
- worker ainda pode rodar no mesmo processo atrás de flag.
Rollback: `INGESTION_ASYNC=false`.

Wave 4, worker separado, 1-2 dias:
- criar `server/src/worker.ts`.
- docker/script separado: `npm run worker`.
- worker com retry, DLQ, heartbeat.
Rollback: parar worker e voltar sync flag.

Wave 5, unificar webhooks, 1 dia:
- mover compactions/skill/tool para `/api/webhook/v1/events`.
- atualizar Claude hook, Codex collector e Tampermonkey.
- deixar endpoints antigos com warning/deprecation por uma versão.
Rollback: manter rotas antigas ativas.

Wave 6, observabilidade, 1 dia:
- pino logs.
- `/metrics`.
- admin DLQ simples.
- alerts locais.
Rollback: logs antigos continuam; metrics é additive.

Wave 7, scale/multi-user, sob demanda:
- webhook tokens com scopes.
- quotas por user.
- batch ingestion.
- rollups/materialized views.
- particionamento mensal de `token_entries` só quando tabela passar de milhões.

## 9. Trade-offs + Riscos

Ganha:
- webhook rápido e resiliente;
- retry real sem duplicar;
- sessões/projetos consistentes;
- dashboard menos afetado por ingestão;
- base pronta para multi-user.

Perde:
- dashboard fica eventualmente consistente por alguns segundos;
- mais um processo para operar;
- precisa monitorar fila e DLQ;
- debug exige seguir `request_id` + `queue_id`.

Risco principal: criar infraestrutura antes de corrigir invariantes. Se dedup, model validation e transaction não vierem primeiro, a fila só vai entregar bug com mais confiabilidade.

Onde Patrick deve dizer "não vale":
- Kafka, NATS, Kubernetes, API gateway, read replica agora.
- Separar auth/settings/dashboard em serviços próprios.
- Trocar Express por Nest/Fastify só por arquitetura.
- Introduzir Redis apenas por BullMQ antes de provar que Postgres queue não aguenta.

## 10. Anti-padrões a Evitar

- "Microserviço" por rota: um serviço para tokens, outro para sessions, outro para projects. Vai aumentar latência e bugs transacionais.
- In-memory queue. Perde evento no restart.
- `LISTEN/NOTIFY` como fila durável. Serve como wake-up, não como storage.
- Kafka para 5k eventos/dia.
- Webhook síncrono fazendo pricing, insert, aggregate e project upsert.
- Dedup baseado só em tuple de tokens.
- Fallback silencioso de modelo desconhecido para `gpt-5`.
- Vários endpoints webhook fora de `/api/webhook/*`.
- Rate limit removido por medo de quebrar collector. O certo é limiter por token + batch + `Retry-After`.
- Guardar token plaintext para conveniência da UI.
- Read replica antes de índices, rollups e query tuning.

Minha recomendação: **não vender isso como microserviços ainda**. Nomeie como "ingestion architecture v2": gateway + Postgres queue + worker. É a menor mudança que resolve os bugs reais apontados nos audits sem reconstruir o tracker.
