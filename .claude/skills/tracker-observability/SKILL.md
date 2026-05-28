---
name: tracker-observability
description: Observabilidade do claude-token-tracker em fases. Day-1 mínimo: pino structured logs + request_id propagation + métricas básicas queue (depth, oldest age, DLQ count, worker heartbeat). Day-2 (multi-user ou problema): OpenTelemetry + Grafana LGTM + GlitchTip. Foco em correlação webhook→queue→worker→DB via request_id+ingestion_event_id. Ative ao instrumentar endpoint, debugar latência, configurar alerta, adicionar métrica. Triggers PT: observabilidade, logs estruturados, métricas, alertas, pino, OTel, Grafana, tracing, request_id. EN: observability, structured logs, metrics, OpenTelemetry, distributed tracing, queue metrics, alerting.
---

# Observabilidade — faseada

Codex anterior sugeriu copiar LGTM stack do supply-mep-v2 day-1. Vetado: tracker é single-user + 5k events/dia. Stack completo é custo operacional antes de invariantes. Faseado:

- **Day-1** (Wave 1-3 strangler): pino logs estruturados + métricas básicas queue + heartbeat.
- **Day-2** (Wave 4-5 ou se algo doer): OTel + Grafana LGTM + GlitchTip.
- **Day-3** (multi-user real): alerting AlertManager + SLO/SLI dashboards.

## ⚠️ Doc oficial

- pino: https://getpino.io/
- OpenTelemetry JS: https://opentelemetry.io/docs/instrumentation/js/
- Grafana LGTM stack: https://grafana.com/oss/lgtm-stack/
- GlitchTip: https://glitchtip.com/
- Última verificação: 2026-05-26

## Day-1 — Structured logs

`apps/api/src/infra/logger.ts`:

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "*.password", "*.token", "*.webhook_token", "*.authorization",
      "*.cookie", "*.jwt", "*.secret", "*.api_key",
      "req.headers.authorization", "req.headers.cookie", "req.headers['x-webhook-token']",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

Substituir `console.log/error` por `logger.info/error`. Cada call inclui `request_id`, `user_id`, contexto relevante.

### Request ID propagation

`apps/api/src/middleware/requestId.ts`:

```typescript
import { randomUUID } from "crypto";

export function requestIdMiddleware(req, res, next) {
  req.requestId = req.headers["x-request-id"] ?? randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  req.log = logger.child({ request_id: req.requestId });
  next();
}
```

Worker propaga via `ingestion_events.payload.request_id`:

```typescript
const ev = await getNextEvent();
const log = logger.child({
  request_id: ev.payload.request_id,
  ingestion_event_id: ev.id,
  user_id: ev.user_id,
  source: ev.source,
  event_type: ev.event_type,
});
log.info("processing event");
```

Correlação ponta-a-ponta: pesquisar log por `request_id` mostra webhook → queue → worker → DB.

### Campos canônicos por log

| Campo | Sempre? | Origem |
|-------|---------|--------|
| `request_id` | sim | header X-Request-Id ou UUID gerado |
| `user_id` | sim em rota auth, sim em worker | JWT cookie ou ingestion_events |
| `source` | sim webhook + worker | payload |
| `event_type` | sim webhook + worker | payload |
| `ingestion_event_id` | sim worker | row id |
| `idempotency_key_hash` | sim webhook + worker | sha256(idempotency_key)[:16] |
| `status` | sim worker | queued/processing/done/failed/dead |
| `duration_ms` | sim em handler/processo | benchmark |
| `attempt` | sim worker | ingestion_events.attempts |
| `error_code` | sim em falha | classifyError(err) |

**Nunca logar**: payload bruto, JWT, plaintext webhook_token, password, email completo (last 4 chars OK).

## Day-1 — Métricas básicas

`apps/api/src/infra/metrics.ts` (sem Prometheus ainda, expõe JSON em endpoint admin):

```typescript
export async function getMetrics() {
  const [queueDepth, oldestAge, dlqCount, workersAlive] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM ingestion_events WHERE status IN ('queued','failed')`),
    pool.query(`SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at))) as age FROM ingestion_events WHERE status IN ('queued','failed')`),
    pool.query(`SELECT COUNT(*) FROM ingestion_dead_letters WHERE moved_at > now() - interval '24 hours'`),
    pool.query(`SELECT COUNT(*) FROM worker_heartbeats WHERE last_seen > now() - interval '90 seconds'`),
  ]);
  return {
    queue_depth: Number(queueDepth.rows[0].count),
    oldest_event_age_seconds: Number(oldestAge.rows[0].age) || 0,
    dlq_24h: Number(dlqCount.rows[0].count),
    workers_alive: Number(workersAlive.rows[0].count),
  };
}
```

Endpoint `GET /api/admin/metrics` (auth admin role). Patrick vê no dashboard.

Métricas críticas day-1:

- `queue_depth`: alert > 1000
- `oldest_event_age_seconds`: alert > 300 (5 min)
- `dlq_24h`: alert > 0
- `workers_alive`: alert < expected (default 1)

## Day-1 — Alertas simples

Não AlertManager ainda. Opções low-cost:

1. **Cron health check**: script bash `curl /api/admin/metrics` a cada 5min, se thresholds violados → notify Patrick via Pushover/Telegram/email.
2. **Uptime Kuma**: container leve, ping `/health` + parse JSON metrics.
3. **GitHub Action scheduled**: `cron: '*/5 * * * *'`, fetch metrics, abre issue se threshold violado.

Patrick decide. Day-1 = Pushover script simples.

## Day-2 — OpenTelemetry + Grafana LGTM

Quando ativa:

- Tracker tiver > 10k events/dia OR
- Multi-user em uso OR
- Debugar latência distribuída fica frequente

Stack:

- **OTel SDK** em `apps/api` + `apps/worker` + `apps/web` (frontend trace browser).
- **OTel Collector** em `infra/otel-collector/` (gateway).
- **Loki** (logs) + **Tempo** (traces) + **Prometheus** (metrics) + **Grafana** (dashboards).
- Padrão supply-mep-v2 `infra/grafana/` + `infra/otel-collector/` referencia.

Spans canônicos:

- `webhook.ingest`: parse → validate → enqueue.
- `worker.process`: dequeue → adapter → calc → insert.
- `api.query`: rota → service → DB.

Atributos: `source`, `event_type`, `user_id`, `error.code`.

## Day-2 — Error tracking (GlitchTip)

Sentry-compatible OSS self-host. Captura exceptions API + worker + frontend.

`apps/api/src/infra/glitchtip.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.GLITCHTIP_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Redact PII
    if (event.request?.headers) {
      delete event.request.headers["x-webhook-token"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});
```

Worker: idem.

Frontend: `@sentry/react`.

## Day-3 — SLO/SLI (multi-user)

Quando ativar:

- Cliente externo paga
- Acordo de uptime (mesmo informal)

SLIs:

- Webhook latency p95 < 200ms.
- Webhook 2xx rate > 99.5%.
- Worker lag p95 < 60s.
- API GET dashboard < 1s.

Error budget burn rate alerts via AlertManager.

## Bugs conhecidos / armadilhas

- **console.log em prod**: NUNCA. Sempre `logger.info`.
- **PII em log**: redact path inclui token/password/jwt/cookie. Adicionar quando descobrir vazamento.
- **Trace overhead**: `tracesSampleRate: 0.1` (10%) padrão. Webhook hot path pode dropar pra 0.01 se latência sentida.
- **Log volume**: pino bench ~1M logs/s, mas disco enche. Rotate via logrotate ou ship pra Loki cedo.
- **Heartbeat false positive**: worker pode estar "alive" mas stuck em loop. Adicionar metric `worker_processed_total` cresce ao longo do tempo.

## Quando ativar outras skills

- Instrumentar nova rota → `stack-express-pg-queue` (middleware order).
- Métrica nova de business → `tracker-business-rules` (KPI canônico).
- Alert pricing wrong → `tracker-business-rules` (invariante).
- Webhook latency lenta → `tracker-ingestion-contract` (rate limit per token).

## ⚠️ Sempre

- Antes de log, redact PII no schema padrão.
- Antes de subir worker, heartbeat ativado.
- Antes de prod, `GET /api/admin/metrics` testado + alert configurado.
- Day-1 → Day-2: validar que invariantes (P1 audit FINAL) já estão resolvidos. Senão LGTM vira distração.

## Knowledge persistente

- **pino > winston**: faster, structured nativo, JSON output ready pra Loki.
- **Day-1 lean, Day-2 quando dói**: copiar LGTM stack do supply-mep cedo demais = governança antes de bugs.
- **Request_id propagation**: chave pra debug. Cliente → API → DB → Worker. Header `X-Request-Id`.
- **`workers_alive` métrica simples > complex health endpoint**: heartbeat rowcount basta.

## References / recipes / templates

- (planejado V2) `references/pino-config.ts` — base config.
- (planejado V2) `recipes/request-id-middleware.ts` — propagation.
- (planejado V2) `recipes/metrics-endpoint.ts` — admin JSON metrics.
- (planejado V2) `recipes/pushover-alerter.sh` — day-1 alert script.
- (planejado V2 day-2) `references/otel-spans-canonical.md` — span naming.
- (planejado V2 day-2) `references/grafana-dashboard-tracker.json` — import.
