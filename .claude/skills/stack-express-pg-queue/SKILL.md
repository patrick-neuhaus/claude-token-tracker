---
name: stack-express-pg-queue
description: Core técnico do claude-token-tracker. Padrões Express 5 + TypeScript + Postgres puro + queue caseira (FOR UPDATE SKIP LOCKED) + worker Node separado. Cobre rota Zod-validated, transações pool.connect(), enfileirar evento, worker consumer com retry exponencial, DLQ, heartbeat, idempotency, rate-limit por token. Ative ao criar/editar rota, worker, fila, retry policy, migration. Triggers PT: rota Express, worker, fila Postgres, DLQ, retry, idempotência, transação. EN: Express route, Postgres queue, FOR UPDATE SKIP LOCKED, worker pattern, DLQ, retry exponencial, idempotency.
---

# Express + Postgres queue + Worker

## ⚠️ Doc oficial (verificar antes de mudar contrato)

- Express 5: https://expressjs.com/en/5x/api.html
- node-postgres (`pg`): https://node-postgres.com/
- Postgres `FOR UPDATE SKIP LOCKED`: https://www.postgresql.org/docs/16/sql-select.html#SQL-FOR-UPDATE-SHARE
- Zod: https://zod.dev/
- Última verificação: 2026-05-26

Se diverge → doc oficial vence (R1).

## Por que não pgmq/Redis/BullMQ

Decisão fixada (ADR-001 planejado):

- **pgmq**: extensão Supabase. Tracker é Postgres puro Docker, exigiria trocar imagem. Não vale.
- **Redis/BullMQ**: adiciona container. Volume 5k/dia trivial pra Postgres direto.
- **Kafka/NATS**: absurdo pra esse contexto.

Queue caseira via `ingestion_events` table + `FOR UPDATE SKIP LOCKED` resolve. Migração futura pra pgmq quando virar Supabase (se virar).

## Estrutura monorepo planejada V2

```
claude-token-tracker/
├── apps/
│   ├── api/        # Express + rotas + auth + ingestion gateway
│   ├── web/        # Vite + React (frontend)
│   └── worker/     # Node + queue consumer
├── packages/
│   ├── api-client/ # Types gerados de Zod (consumido por web)
│   ├── domain/     # Regras: pricing, normalize, dedup, time
│   └── config/     # env loader, constants
├── infra/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── otel-collector/
│   └── grafana/
└── apps/api/migrations/  # SQL versionado
```

Monorepo: pnpm workspaces + turbo (igual supply-mep-v2).

## Padrão de rota nova (Express + Zod)

```typescript
// apps/api/src/routes/entries.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { withAudit } from "../infra/audit.js";
import { listEntries } from "../services/entriesService.js";
import { EntryFiltersSchema } from "@tracker/domain";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res, next) => {
  try {
    const filters = EntryFiltersSchema.parse(req.query);
    const result = await listEntries(req.user.id, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
```

Auth middleware injeta `req.user` via JWT cookie httpOnly. Mutações usam `withAudit`.

## Padrão de mutação (transaction + audit)

```typescript
// apps/api/src/infra/audit.ts
export async function withAudit<T>(opts: {
  ctx: RequestContext;
  entity: string;
  mutate: (tx: PoolClient) => Promise<T>;
  loadBefore?: (tx: PoolClient) => Promise<unknown>;
  loadAfter?: (tx: PoolClient, result: T) => Promise<unknown>;
}): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = opts.loadBefore ? await opts.loadBefore(client) : null;
    const result = await opts.mutate(client);
    const after = opts.loadAfter ? await opts.loadAfter(client, result) : null;
    await client.query(
      `INSERT INTO audit.audit_log (user_id, entity, action, before, after, request_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [opts.ctx.userId, opts.entity, opts.ctx.action, before, after, opts.ctx.requestId]
    );
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

Todo write multi-step roda em transaction. Corrige F6 audit FINAL (insertTokenEntry sem transaction).

## Schema queue (ingestion_events)

```sql
CREATE TABLE IF NOT EXISTS ingestion_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source          text NOT NULL CHECK (source IN ('claude-code','claude.ai','codex')),
  event_type      text NOT NULL CHECK (event_type IN ('token_entry','skill_invocation','tool_invocation','compaction','rollup_daily')),
  idempotency_key text NOT NULL,
  payload         jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed','dead')),
  attempts        int NOT NULL DEFAULT 0,
  next_run_at     timestamptz NOT NULL DEFAULT now(),
  locked_at       timestamptz,
  locked_by       text,
  error_code      text,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  CONSTRAINT ingestion_events_idempotency_unique UNIQUE (user_id, source, idempotency_key)
);

CREATE INDEX idx_ingestion_events_consume ON ingestion_events (status, next_run_at) WHERE status IN ('queued','failed');
CREATE INDEX idx_ingestion_events_user ON ingestion_events (user_id, created_at DESC);
```

DLQ table:

```sql
CREATE TABLE IF NOT EXISTS ingestion_dead_letters (
  id              uuid PRIMARY KEY,
  original_event  jsonb NOT NULL,
  user_id         uuid NOT NULL,
  attempts        int NOT NULL,
  error_code      text NOT NULL,
  error_message   text NOT NULL,
  moved_at        timestamptz NOT NULL DEFAULT now()
);
```

Bootstrap (R7): `apps/api/src/infra/queue-bootstrap.ts` verifica ambas tabelas existem antes de qualquer worker subir. Aborta boot senão.

## Padrão worker consumer

```typescript
// apps/worker/src/consumer.ts
const WORKER_ID = `${os.hostname()}-${process.pid}`;

async function consume() {
  while (running) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT id, user_id, source, event_type, payload, attempts, idempotency_key
         FROM ingestion_events
         WHERE status IN ('queued','failed')
           AND next_run_at <= now()
         ORDER BY created_at
         LIMIT 1
         FOR UPDATE SKIP LOCKED`
      );

      if (rows.length === 0) {
        await client.query("ROLLBACK");
        await sleep(1000);
        continue;
      }

      const event = rows[0];
      await client.query(
        `UPDATE ingestion_events
         SET status='processing', locked_at=now(), locked_by=$2, attempts=attempts+1
         WHERE id=$1`,
        [event.id, WORKER_ID]
      );
      await client.query("COMMIT");

      // Processa fora da transação curta de lock (libera lock pro próximo)
      try {
        await processEvent(event);
        await markDone(event.id);
      } catch (err) {
        await handleFailure(event, err);
      }
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error({ err }, "consumer outer error");
      await sleep(5000);
    } finally {
      client.release();
    }
  }
}
```

`FOR UPDATE SKIP LOCKED`: múltiplos workers concorrem sem deadlock. Cada um pega 1 evento exclusivo.

## Retry exponencial

```typescript
const RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 120_000, 600_000]; // 1s, 5s, 30s, 2m, 10m
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

async function handleFailure(event, err) {
  if (event.attempts >= MAX_ATTEMPTS) {
    await moveToDLQ(event, err);
    return;
  }
  const jitter = Math.random() * 0.3 * RETRY_DELAYS_MS[event.attempts - 1];
  const nextRun = new Date(Date.now() + RETRY_DELAYS_MS[event.attempts - 1] + jitter);
  await pool.query(
    `UPDATE ingestion_events
     SET status='failed', next_run_at=$2, error_code=$3, error_message=$4, locked_at=NULL, locked_by=NULL
     WHERE id=$1`,
    [event.id, nextRun, classifyError(err), sanitize(err.message)]
  );
}
```

## Heartbeat

Worker grava liveness a cada 30s:

```sql
CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id  text PRIMARY KEY,
  last_seen  timestamptz NOT NULL,
  metadata   jsonb
);
```

```typescript
setInterval(async () => {
  await pool.query(
    `INSERT INTO worker_heartbeats (worker_id, last_seen, metadata)
     VALUES ($1, now(), $2)
     ON CONFLICT (worker_id) DO UPDATE SET last_seen=now(), metadata=$2`,
    [WORKER_ID, { queue_depth: await getQueueDepth() }]
  );
}, 30_000);
```

Alert (skill `tracker-observability`): worker sem heartbeat > 90s = down.

## Rate limit por webhook token

Usa `rate-limiter-flexible` OSS (postgres backend):

```typescript
import { RateLimiterPostgres } from "rate-limiter-flexible";

const burstLimiter = new RateLimiterPostgres({
  storeClient: pool,
  keyPrefix: "webhook_burst",
  points: 120, // 120 req
  duration: 60, // per 60s
});

const dailyLimiter = new RateLimiterPostgres({
  storeClient: pool,
  keyPrefix: "webhook_daily",
  points: 10_000,
  duration: 86_400,
});

// Middleware
app.use("/api/webhook/v1", async (req, res, next) => {
  const tokenHash = sha256(req.headers["x-webhook-token"]);
  try {
    await Promise.all([
      burstLimiter.consume(tokenHash),
      dailyLimiter.consume(tokenHash),
    ]);
    next();
  } catch (rateLimited) {
    res.set("Retry-After", String(Math.ceil(rateLimited.msBeforeNext / 1000)));
    res.status(429).json({ error: "rate_limited" });
  }
});
```

## Idempotency

Webhook gateway:

1. Recebe payload + `X-Idempotency-Key`.
2. `INSERT INTO ingestion_events (user_id, source, idempotency_key, payload) ... ON CONFLICT (user_id, source, idempotency_key) DO NOTHING RETURNING id`.
3. Se RETURNING vazio = duplicate. Retorna `202 { duplicate: true, ingestion_event_id: <existing> }`.

Worker write final em `token_entries` referencia `ingestion_event_id` (FK + UNIQUE). Doublé proteção.

## Bugs conhecidos / armadilhas

- **F5 audit FINAL — UNIQUE NULL session_id**: `NULLS NOT DISTINCT` em PG 15+. Migration aditiva: `DROP INDEX` + `CREATE UNIQUE INDEX ... NULLS NOT DISTINCT`.
- **F6 audit FINAL — insertTokenEntry sem transaction**: wrappar em `withAudit({ mutate: async (tx) => { ... } })`.
- **Connection leak**: sempre `try/finally { client.release(); }`. `pool.query()` libera auto. `pool.connect()` exige release explícito.
- **LISTEN/NOTIFY como fila**: NÃO. Serve só como wake-up otimização (worker polling pode dormir mais se nenhum NOTIFY). Storage = tabela.
- **In-memory queue**: NÃO. Perde evento no restart.
- **VT (visibility timeout) caseiro**: lock via `locked_at` + `locked_by`. Cleanup job: `UPDATE SET status='failed', locked_at=NULL WHERE status='processing' AND locked_at < now() - interval '5 min'`.
- **Long-running transaction**: lock + commit rápido, processa fora. Transação curta no SELECT FOR UPDATE.
- **Worker pool**: `apps/worker/src/index.ts` spawna N consumers (env `WORKER_CONCURRENCY=4`). Cada um chama `consume()` em paralelo.

## Quando ativar outras skills

- Migração schema → `tracker-postgres-security` (RLS futuro) + R6 R19 (aditivas + rollback).
- Adicionar event_type novo → `tracker-ingestion-contract` (schema Zod) + worker handler.
- Logs/metrics worker → `tracker-observability` (pino + DLQ metric + heartbeat).
- Testes worker → `tracker-testing-ci` (fixture queue + replay).

## ⚠️ Sempre

- Antes de criar tabela, migration aditiva sequencial (R6).
- Antes de subir worker, queue-bootstrap valida tabelas (R7).
- Antes de declarar feature pronta, `pnpm typecheck && pnpm test` (R8).
- Worker consumer NUNCA processa fora de retry + DLQ. Failure non-retriable (validation) vai direto pra DLQ.
- Sempre `FOR UPDATE SKIP LOCKED`, nunca `FOR UPDATE` cru (deadlock).

## Knowledge persistente

- **Express 5 (não 4)**: async error handling nativo (sem express-async-errors).
- **Migrations sequenciais**: `apps/api/migrations/021_*.sql` continua após legacy `server/migrations/020`.
- **Worker concurrency padrão**: 2 (single-user). Multi-user: 4-8.
- **Polling interval**: 1s vazio, 100ms quando tem trabalho. Sem LISTEN/NOTIFY day 1 (otimização futura).
- **Cleanup job**: roda no boot + crontab interno (1x/hora) limpa locks órfãos.

## References / recipes / templates

- (planejado V2) `references/migration-ingestion-events.sql` — schema queue.
- (planejado V2) `references/migration-dlq.sql` — DLQ table.
- (planejado V2) `recipes/worker-consumer-template.ts` — esqueleto.
- (planejado V2) `recipes/rate-limit-postgres.ts` — rate-limiter-flexible setup.
- (planejado V2) `recipes/queue-bootstrap.ts` — pre-flight check R7.
