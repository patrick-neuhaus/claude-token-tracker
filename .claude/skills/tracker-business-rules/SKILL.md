---
name: tracker-business-rules
description: Living document das regras de negócio do claude-token-tracker. Cobre pricing por modelo, normalização source/model, dedup tuple, billing calc, timezone semantics, unknown model fail-closed. Fonte canônica que server-side consulta antes de qualquer write em `token_entries`. Ative ao mudar pricing, adicionar modelo novo, ajustar dedup, debugar billing wrong, validar invariante. Triggers PT: pricing, billing, normalização modelo, dedup, custo, source, BRT, fuso horário, unknown model. EN: pricing model, billing calc, source whitelist, dedup tuple, unknown fail closed.
---

# tracker-business-rules

Source of truth para regras de negócio do tracker. Toda decisão de billing, normalização e dedup vive aqui antes de virar código.

## ⚠️ Doc oficial (verificar antes de mudar contrato)

- Anthropic pricing: https://www.anthropic.com/pricing
- OpenAI pricing: https://openai.com/api/pricing/
- Última verificação: 2026-05-26

Se preço oficial diverge do que está em `packages/domain/src/pricing.ts` → doc vence (R1). Atualizar via migration `pricing_snapshots` (R11).

## Invariantes (não negociáveis)

### Pricing

- **Fonte única**: `packages/domain/src/pricing.ts`. Tipado, importado por API + worker + frontend (via `api-client` gerado).
- **Snapshot histórico**: `pricing_snapshots` table preserva pricing por modelo + data efetiva. Mudança nunca apaga, sempre adiciona row.
- **Cálculo server-side**: client nunca envia `cost_usd` confiável (R17). Worker calcula no write final.
- **Cobertura por tipo de token**: input, output, cache_read, cache_write. Anthropic cobra cache_read 10% do input, cache_write 125% do input. OpenAI gpt-5+ cobra cache_read 25% do input.
- **USD primeiro**: `cost_usd` é canônico. `cost_brl` calculado on-the-fly via `USD_TO_BRL` constant (não armazenado).

### Source whitelist

DB check constraint + Zod enum + collector literal devem bater 3-way:

```typescript
type Source = "claude-code" | "claude.ai" | "codex";
```

- `claude-code`: collector script Patrick (hook Python em `~/.claude/hooks/`).
- `claude.ai`: Tampermonkey browser extension (futura: extensão própria).
- `codex`: Python collector (`skillforge-arsenal/codex/scripts/codex-token-collector.py`).

**Source desconhecido → webhook rejeita 400.** Sem fallback silencioso (R16).

### Model normalization

Modelo bruto vem do collector (ex: `claude-opus-4-7-20251001`, `gpt-5.5`). Server normaliza para chave de pricing:

```typescript
normalizeModel(rawModel: string): { key: string; family: ModelFamily } | null
```

Mapeamentos canônicos:

| Raw input | Normalized key | Family |
|-----------|----------------|--------|
| `claude-opus-4-7`, `claude-opus-4-7-20251001` | `opus-4-7` | `claude` |
| `claude-opus-4-6` | `opus-4-6` | `claude` |
| `claude-sonnet-4-6` | `sonnet-4-6` | `claude` |
| `claude-haiku-4-5-20251001` | `haiku-4-5` | `claude` |
| `gpt-5.5` | `gpt-5.5` | `openai` |
| `gpt-5.4-mini` | `gpt-5.4-mini` | `openai` |
| `gpt-5.3-codex` | `gpt-5.3-codex` | `openai` |

**Modelo bruto desconhecido → `normalizeModel` retorna `null`.** Server grava `pricing_status='unknown'`, `cost_usd=0`. Dashboard mostra em flag "modelos sem pricing" pro Patrick revisar.

**Nunca default pra modelo billable** (regressão F3 do audit FINAL — `normalizeModel("unknown")` retornando `gpt-5` cobrava errado).

### Dedup tuple

UNIQUE index `idx_unique_token_entry`:

```sql
UNIQUE NULLS NOT DISTINCT (user_id, session_id, model, input_tokens, output_tokens, cache_read, cache_write, timestamp)
```

- `NULLS NOT DISTINCT`: Postgres 15+ feature, trata NULL como igual (corrige bug F5 do audit FINAL).
- Tuple cobre replay exato. Dedup adicional via `ingestion_events.idempotency_key` (R13).
- Worker write final: `INSERT ... ON CONFLICT DO NOTHING RETURNING id`. Conflito = entry duplicada já existe, log info, descarta.

### Timezone semantics

Per R12:

- Storage: `TIMESTAMPTZ` UTC.
- Webhook: rejeita ISO sem offset.
- Boundaries (today/month/7d/30d): `America/Sao_Paulo`.
- Display: BRT via `formatters.formatDate`.
- CSV export: UTC ISO explícito.

Função canônica:

```typescript
function startOfDayBRT(date: Date): Date {
  // Returns UTC Date representing midnight BRT (Brazil/Sao_Paulo, UTC-3 default, UTC-2 DST)
}

function startOfMonthBRT(date: Date): Date { /* ... */ }
```

Implementação em `packages/domain/src/time.ts`. Testes em `apps/api/test/fixtures/timezone.fixtures.ts` (R18).

### Billing calc

```typescript
function calcCost(
  pricing: ModelPricing,
  tokens: { input: number; output: number; cache_read: number; cache_write: number }
): number {
  return (
    tokens.input * pricing.inputPerToken +
    tokens.output * pricing.outputPerToken +
    tokens.cache_read * pricing.cacheReadPerToken +
    tokens.cache_write * pricing.cacheWritePerToken
  );
}
```

- Precisão: `numeric(12,6)` no DB. `cost_usd` em USD, 6 casas decimais.
- Modelo unknown: `pricing` é `DEFAULT_UNKNOWN_PRICING` (todos zeros) → `cost_usd = 0`, `pricing_status = 'unknown'`.

### Zero-token spam

Webhook payload exige `input + output + cache_read + cache_write > 0`. Rejeita 400 senão. Mitiga F4 audit FINAL (healthcheck-bogus, manual-test).

## Bugs conhecidos / armadilhas (do legacy)

Documenta bugs do server legacy (`server/`) que V2 nasce sem:

1. **F1 audit FINAL — query coluna inexistente**: `analyticsService.ts:252` consulta `cache_read_tokens` (não existe), schema é `cache_read`. V2 fix: usar tipos gerados (Drizzle/Kysely) que falham em compile.
2. **F3 audit FINAL — billing unknown wrong**: `normalizeModel("unknown")` retornava `gpt-5`. V2 fix: retornar `null`, marcar `pricing_status='unknown'`.
3. **F4 audit FINAL — model lixo**: webhook `model: z.string().min(1)` aceitava `test`, `healthcheck-bogus`. V2 fix: regex `/^(claude-|gpt-)/` + lista canônica.
4. **F5 audit FINAL — dedup NULL session_id**: UNIQUE não dedupa quando session_id NULL. V2 fix: `NULLS NOT DISTINCT`.
5. **F7-F9 audit FINAL — TZ boundaries UTC**: "hoje", "mês" calculados em UTC, não BRT. V2 fix: `date_trunc('day', timestamp AT TIME ZONE 'America/Sao_Paulo')`.
6. **F15 audit FINAL — MonthNarrative hardcoded source**: dizia "claude.ai" pra qualquer fonte diferente de claude-code. V2 fix: `displayLabel(source)` dinâmico.

## Quando ativar outras skills

- Mudança em contrato webhook ingestão → `tracker-ingestion-contract`.
- Mudança em estrutura de tabela (`pricing_snapshots`, etc.) → `stack-express-pg-queue` + R6 migration aditiva.
- Decisão arquitetural fixada (ex: trocar provider pricing) → `tracker-product-decisions` (ADR).
- Multi-user RLS/policies → `tracker-postgres-security`.

## ⚠️ Sempre

- Antes de adicionar modelo novo, conferir pricing oficial (link doc oficial acima).
- Antes de mudar pricing, criar ADR (R11) + migration `pricing_snapshots` aditiva.
- Antes de mudar `normalizeModel` mapping, atualizar fixture `pricing.fixtures.ts` (R18).
- Antes de mudar dedup tuple, atualizar fixture `dedup.fixtures.ts` (R18).
- Custo é sempre USD primeiro (R17). BRL via constant on-the-fly.

## Knowledge persistente

- **`USD_TO_BRL` fixo em 5.50** (single-user Patrick, evita dependência de API exchange). Mudança = pedido explícito Patrick.
- **Webhook batch endpoint** planejado em V2 pra otimizar collector codex (atualmente faz 1 POST por event, 5k/dia).
- **Cache write é minoritário**: claude-code raramente reporta cache_write. Validar antes de assumir billing significativo.
- **Modelos atualmente em uso** (deletei lixo 2026-05-26): claude-haiku-4-5-20251001, claude-opus-4-6, claude-opus-4-7, claude-sonnet-4-6, gpt-5.4-mini, gpt-5.5.

## References / recipes / templates

- (planejado V2) `references/pricing-canonical.ts` — pricing oficial atualizado por data.
- (planejado V2) `references/normalize-model-test-cases.ts` — fixture canônica.
- (planejado V2) `recipes/migration-pricing-snapshot.sql` — template ADR + migration.
