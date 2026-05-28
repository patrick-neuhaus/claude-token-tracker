---
name: tracker-ingestion-contract
description: Contrato canônico de ingestão de eventos do claude-token-tracker. Cobre webhook v1 (single + batch), auth (X-Webhook-Token + HMAC X-Webhook-Signature), idempotency (X-Idempotency-Key), Zod schemas estritos, retry collectors, source adapters (claude-code/claude.ai/codex), versionamento de endpoint, compat legacy. Gatekeeper R14. Ative ao mudar webhook, adicionar collector, mudar schema payload, debugar 4xx ingestion. Triggers PT: webhook, ingestão, coletor, idempotency, contrato, payload, signature. EN: webhook contract, ingestion API, idempotency key, HMAC signature, source adapter, batch endpoint.
---

# tracker-ingestion-contract

Skill gatekeeper de R14. Define o contrato HTTP que collectors externos seguem para enfileirar eventos no tracker.

## ⚠️ Doc oficial (verificar antes de mudar contrato)

- HTTP Idempotency-Key header: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- Webhook security best practices: https://webhooks.fyi/security
- Última verificação: 2026-05-26

Quando draft IETF virar RFC final, atualizar skill.

## Endpoints canônicos V2

Base: `/api/webhook/v1/`

| Método | Path | Propósito | Auth |
|--------|------|-----------|------|
| POST | `/events` | Single event ingestion | `X-Webhook-Token` |
| POST | `/batch` | Multi-event ingestion (até 100 events) | `X-Webhook-Token` |
| GET | `/health` | Liveness check coletor (sem auth) | none |
| GET | `/version` | Contract version + supported event_types | `X-Webhook-Token` |

Endpoints legacy (compat até cutover):
- `POST /api/webhook/track-tokens` → roteia internamente pra `/v1/events` com `event_type='token_entry'`.
- `POST /api/compactions/track`, `/api/skill-invocations/track`, `/api/tool-invocations/track` → roteia pra `/v1/events` com `event_type` apropriado.

Path `/api/webhook/v1/*` está em `CSRF_SKIP_PREFIXES` (todos pulam CSRF, todos exigem `X-Webhook-Token`). Corrige F13 audit FINAL.

## Headers obrigatórios

| Header | Obrigatório? | Formato | Propósito |
|--------|--------------|---------|-----------|
| `X-Webhook-Token` | sim | Plaintext token (SHA-256 lookup server-side) | Auth |
| `X-Idempotency-Key` | sim novos coletores, opcional legacy (calc canônica) | `^[a-zA-Z0-9_-]{8,128}$` | Dedup (R13) |
| `X-Webhook-Timestamp` | sim se HMAC ativado | Unix epoch seconds | Replay protection |
| `X-Webhook-Signature` | opcional V2.1+ | `sha256=<hex>` | HMAC (HSM-style) |
| `Content-Type` | sim | `application/json` | — |

## Schema payload — single event (`POST /events`)

```typescript
import { z } from "zod";

const EventTypeSchema = z.enum([
  "token_entry",
  "skill_invocation",
  "tool_invocation",
  "compaction",
]);

const SourceSchema = z.enum(["claude-code", "claude.ai", "codex"]);

const BaseEventSchema = z.object({
  event_type: EventTypeSchema,
  source: SourceSchema,
  timestamp: z.string().datetime({ offset: true }), // ISO 8601 with Z or +HH:MM
  session_id: z.string().optional(),
  conversation_url: z.string().url().optional(),
  cwd: z.string().optional(),
  project: z.string().optional(),
  auto_name: z.string().max(200).optional(),
  session_name: z.string().max(200).optional(),
});

const TokenEntryPayload = BaseEventSchema.extend({
  event_type: z.literal("token_entry"),
  model: z.string().regex(/^(claude-|gpt-)/).max(100), // allowlist regex
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  cache_read: z.number().int().min(0).default(0),
  cache_write: z.number().int().min(0).default(0),
  total_tokens: z.number().int().min(0).optional(),
}).refine(
  (data) => data.input_tokens + data.output_tokens + data.cache_read + data.cache_write > 0,
  { message: "At least one token field must be > 0" }
);

// SkillInvocationPayload, ToolInvocationPayload, CompactionPayload: análogo
```

Server retorna **`202 Accepted`** (não 201):

```json
{
  "status": "accepted",
  "ingestion_event_id": "uuid",
  "idempotency_key": "echo-back",
  "duplicate": false
}
```

`duplicate: true` se idempotency_key já visto (mesmo user/source) → server retorna 202 idempotente.

## Schema payload — batch (`POST /batch`)

```typescript
const BatchSchema = z.object({
  events: z.array(BaseEventSchema).min(1).max(100),
  batch_id: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/), // idempotência do batch inteiro
});
```

Server enfileira N events com idempotency_key = `${batch_id}-${index}` se event sem própria key.

Response:

```json
{
  "status": "accepted",
  "batch_id": "echo-back",
  "accepted": 98,
  "rejected": 2,
  "errors": [
    { "index": 12, "code": "INVALID_TIMESTAMP", "message": "..." },
    { "index": 47, "code": "UNKNOWN_MODEL", "message": "..." }
  ]
}
```

Partial success OK. Errors não bloqueiam batch inteiro.

## HMAC signature (V2.1 opcional)

Quando ativado (collector confiável, não Tampermonkey):

```
signature = HMAC-SHA256(secret, timestamp + "\n" + body_raw)
header: X-Webhook-Signature: sha256=<hex>
```

Replay protection: server rejeita se `|now - X-Webhook-Timestamp| > 300s`.

Por que opcional: Tampermonkey (browser) não guarda secret seguro. Codex collector (Python local) sim. HMAC pra collectors server-side, X-Webhook-Token pra browser-side.

## Versionamento

`/api/webhook/v1/` é estável. Mudança quebra contract:

- PATCH (validation tighter, log fix): mesma URL.
- MINOR (campo opcional novo, event_type novo): mesma URL, doc atualizada.
- MAJOR (campo obrigatório novo, tipo trocado): `/api/webhook/v2/`. Mantém `/v1/` por 90 dias com header `Sunset:`.

`GET /version` retorna:

```json
{
  "contract_version": "1.3.0",
  "supported_event_types": ["token_entry", "skill_invocation", "tool_invocation", "compaction"],
  "supported_sources": ["claude-code", "claude.ai", "codex"],
  "max_batch_size": 100,
  "sunset_date": null
}
```

## Rate limit (por webhook_token)

- 120 req/min burst.
- 10.000 req/dia.
- Header `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- 429 retorna `Retry-After` header.

Per token (não per IP) — single-user Patrick com múltiplas máquinas dropa global IP cap. Collector codex burst (~5k/dia) fica abaixo.

## Source adapters

`apps/api/src/ingestion/adapters/`:

| Adapter | Detecta via | Normaliza |
|---------|-------------|-----------|
| `claudeCodeAdapter` | `source = 'claude-code'` | Extrai `session_id` de cwd OR auto-name OR conversation URL |
| `claudeAiAdapter` | `source = 'claude.ai'` | Tampermonkey envia `conversation_url`; session_id = sha256(url) |
| `codexAdapter` | `source = 'codex'` | session_id = UUID Codex (do `session_meta.payload.id`) |

Adapter retorna `NormalizedEvent` (formato interno worker). Adicionar source novo = novo adapter + entry em enum + skill atualizada + ADR.

## Bugs conhecidos / armadilhas (do legacy)

1. **F10 audit FINAL — timestamp aceita lixo**: `z.string()` sem `.datetime()`. V2 fix: `.datetime({ offset: true })`.
2. **F13 audit FINAL — CSRF bloqueia webhooks fora `/api/webhook/`**: 3 endpoints (compactions/skill/tool) presos. V2 fix: unifica em `/api/webhook/v1/events`.
3. **A4-2 audit — dedup NULL**: idempotency key obrigatória resolve. Cobertura adicional via `NULLS NOT DISTINCT` em `token_entries`.
4. **A4-5 audit — zero-token spam**: Zod refine `> 0` total.
5. **Webhook token plaintext em Settings**: legacy expõe via UI. V2: hash-only, mostra plaintext só 1x na criação (`webhook_tokens` table com label, scope, revoked_at).

## Quando ativar outras skills

- Implementar endpoint novo → `stack-express-pg-queue` (rota + queue + worker).
- Mudar regra de pricing/dedup/normalize → `tracker-business-rules`.
- Adicionar source novo → este SKILL + adapter + `tracker-business-rules` (entry no glossário).
- Testes contract → `tracker-testing-ci` (fixtures payload + replay + idempotency).

## ⚠️ Sempre

- Antes de mudar `WebhookPayloadSchema`, bumpar `contract_version`.
- Antes de adicionar `event_type`, atualizar enum + adapter + fixture.
- Antes de mudar allowlist model regex, validar não quebra collectors existentes.
- Antes de remover endpoint legacy, header `Sunset:` por 90 dias + ADR.
- Logar `request_id`, `source`, `event_type`, `idempotency_key_hash`, nunca payload bruto.

## Knowledge persistente

- **`X-Webhook-Token` plaintext hoje, HMAC futuro**: simples primeiro, hardening V2.1.
- **Batch endpoint planejado**: collector codex acumular ~5min e enviar batch de 50-100. Reduz overhead HTTP × 50.
- **`session_id` opcional**: claude.ai via Tampermonkey nem sempre tem; calc canônica = sha256(conversation_url).
- **`pricing_status` campo novo**: `'priced' | 'unknown' | 'free'`. Default `'priced'` legacy; novos collectors enviam explícito.

## References / recipes / templates

- (planejado V2) `references/openapi-webhook-v1.yaml` — OpenAPI spec endpoint v1.
- (planejado V2) `recipes/zod-schema-template.ts` — schema base.
- (planejado V2) `recipes/codex-collector-batch.py` — batch endpoint adapter.
- (planejado V2) `recipes/hmac-signature-node.ts` — HMAC sign/verify helper.
