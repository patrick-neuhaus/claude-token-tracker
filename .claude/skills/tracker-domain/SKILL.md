---
name: tracker-domain
description: Glossário + contratos canônicos do claude-token-tracker. Define entidades (TokenEntry, Session, Project, IngestionEvent, PricingSnapshot, etc), enum values (Source, EventType, PricingStatus), invariantes de relacionamento (user_id em tudo, FK ON DELETE CASCADE/SET NULL), naming conventions. Source of truth pra packages/domain. Ative ao criar entity nova, mudar relacionamento FK, definir enum, ajustar naming. Triggers PT: glossário, entity, contrato canônico, FK, enum, relação. EN: domain glossary, canonical entity, FK constraint, enum definition, type contract.
---

# Domain — glossário + contratos canônicos

Codex sugeriu manter skill separada SE for além de glossário — contratos canônicos. É isso aqui.

## Entidades core

### User

Usuário do tracker. Hoje só Patrick. Schema multi-user compatible (R10).

```typescript
type User = {
  id: UUID;
  email: string;
  role: "user" | "admin";
  webhook_token_hash: string; // sha256
  created_at: Timestamp;
};
```

### TokenEntry

Atomic unit de uso de tokens. Cada evento de `last_token_usage` (Codex) ou `assistant message` (Claude Code) vira 1 row.

```typescript
type TokenEntry = {
  id: UUID;
  user_id: UUID; // FK users ON DELETE CASCADE
  session_id: string | null; // FK sessions(session_id) lógico — nullable pra claude.ai
  ingestion_event_id: UUID; // FK ingestion_events ON DELETE RESTRICT
  source: Source;
  model: string; // raw model do collector (ex: "claude-opus-4-7-20251001")
  pricing_status: PricingStatus;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  total_tokens: number;
  cost_usd: number; // calculado server-side (R17)
  timestamp: Timestamp; // UTC storage, BRT display (R12)
  conversation_url: string | null;
  created_at: Timestamp;
};
```

UNIQUE `(user_id, session_id, model, input_tokens, output_tokens, cache_read, cache_write, timestamp)` com `NULLS NOT DISTINCT`. + UNIQUE `ingestion_event_id` (1-to-1 com event).

### Session

Sessão lógica de uso (1 sessão Codex = 1 file `rollout-*.jsonl`. 1 sessão Claude Code = 1 conversation).

```typescript
type Session = {
  id: UUID; // PK
  user_id: UUID;
  session_id: string; // ID do collector (Codex UUID, Claude Code conversation ID)
  source: Source;
  project_id: UUID | null; // FK projects ON DELETE SET NULL
  custom_name: string | null; // user-set
  auto_name: string | null; // collector-suggested
  cwd: string | null;
  first_seen: Timestamp;
  last_seen: Timestamp;
  total_cost_usd: number; // aggregate cached
  entries_count: number;
};
```

UNIQUE `(user_id, session_id, source)`.

### Project

Agrupamento user-defined de sessions.

```typescript
type Project = {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  cwd_pattern: string | null; // glob: matches session.cwd
  created_at: Timestamp;
};
```

UNIQUE `(user_id, name)`.

### IngestionEvent

Cada webhook POST vira 1 row. Worker consome.

```typescript
type IngestionEvent = {
  id: UUID;
  user_id: UUID;
  source: Source;
  event_type: EventType;
  idempotency_key: string;
  payload: object; // jsonb, original webhook body
  status: IngestionStatus;
  attempts: number;
  next_run_at: Timestamp;
  locked_at: Timestamp | null;
  locked_by: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Timestamp;
  processed_at: Timestamp | null;
};
```

UNIQUE `(user_id, source, idempotency_key)`.

### PricingSnapshot

Histórico de pricing por modelo (R11).

```typescript
type PricingSnapshot = {
  id: UUID;
  model_key: string; // normalized (ex: "opus-4-7", "gpt-5.5")
  family: ModelFamily;
  effective_from: Timestamp;
  input_per_token: number;
  output_per_token: number;
  cache_read_per_token: number;
  cache_write_per_token: number;
  source_url: string; // doc oficial onde achou
  notes: string | null;
};
```

UNIQUE `(model_key, effective_from)`.

### SkillInvocation / ToolInvocation / Compaction

Eventos secundários (não pagam tokens diretamente, mas correlacionam):

```typescript
type SkillInvocation = {
  id: UUID;
  user_id: UUID;
  session_id: string;
  skill_name: string;
  skill_source: string; // skillforge/omc/builtin
  invoked_at: Timestamp;
  duration_ms: number | null;
  status: "success" | "error" | "timeout";
  ingestion_event_id: UUID;
};

type ToolInvocation = {
  id: UUID;
  user_id: UUID;
  session_id: string;
  tool_name: string;
  invoked_at: Timestamp;
  duration_ms: number | null;
  status: "success" | "error" | "timeout";
  ingestion_event_id: UUID;
};

type Compaction = {
  id: UUID;
  user_id: UUID;
  session_id: string;
  compacted_at: Timestamp;
  tokens_before: number;
  tokens_after: number;
  ingestion_event_id: UUID;
};
```

## Enums canônicos

```typescript
type Source = "claude-code" | "claude.ai" | "codex";

type EventType = "token_entry" | "skill_invocation" | "tool_invocation" | "compaction" | "rollup_daily";

type ModelFamily = "claude" | "openai";

type PricingStatus = "priced" | "unknown" | "free";

type IngestionStatus = "queued" | "processing" | "done" | "failed" | "dead";

type UserRole = "user" | "admin";
```

Mudança em enum = migration aditiva + skill atualizada + ADR.

## Invariantes de relacionamento

| FK | ON DELETE | Justificativa |
|----|-----------|---------------|
| `token_entries.user_id → users` | CASCADE | User deletado = dados vão junto (LGPD-ready) |
| `token_entries.ingestion_event_id → ingestion_events` | RESTRICT | Histórico evento preservado pra auditoria |
| `sessions.user_id → users` | CASCADE | idem |
| `sessions.project_id → projects` | SET NULL | Projeto deletado, session sobrevive (vira "sem projeto") |
| `projects.user_id → users` | CASCADE | idem |
| `ingestion_events.user_id → users` | CASCADE | idem |

## Naming conventions

- **Tabelas/colunas**: `snake_case` (Postgres convention).
- **TypeScript types**: `PascalCase` (TokenEntry, IngestionEvent).
- **Enum values**: `kebab-case` (claude-code, gpt-5.5). String enums em Postgres CHECK + Zod.
- **Files**: `kebab-case` (`token-entry.ts`, não `TokenEntry.ts`).
- **Variáveis JS/TS**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE` (DEFAULT_PRICING, MAX_ATTEMPTS).

## Domínio em PT-BR, contrato em EN

- Comentários internos: PT-BR (Patrick informal).
- Variáveis/funções: EN (`calcCost`, não `calcularCusto`).
- API contract (OpenAPI, REST): EN strict.
- UI labels: PT-BR (displayed via `displayLabel`).

## Schemas Zod compartilhados

`packages/domain/src/schemas/`:

```typescript
// packages/domain/src/schemas/token-entry.ts
import { z } from "zod";

export const SourceSchema = z.enum(["claude-code", "claude.ai", "codex"]);
export const EventTypeSchema = z.enum(["token_entry", "skill_invocation", "tool_invocation", "compaction", "rollup_daily"]);
export const PricingStatusSchema = z.enum(["priced", "unknown", "free"]);

export const TokenEntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_id: z.string().nullable(),
  ingestion_event_id: z.string().uuid(),
  source: SourceSchema,
  model: z.string().regex(/^(claude-|gpt-)/).max(100),
  pricing_status: PricingStatusSchema,
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  cache_read: z.number().int().min(0),
  cache_write: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
  cost_usd: z.number().min(0),
  timestamp: z.string().datetime({ offset: true }),
  conversation_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
});

export type TokenEntry = z.infer<typeof TokenEntrySchema>;
```

Reuso: API valida payload via Zod, server type = `z.infer<>`, client recebe via `@tracker/api-client` gerado.

## Glossário (terminologia)

| Termo | Significado |
|-------|-------------|
| **Entry** | TokenEntry, atomic unit billing |
| **Event** | IngestionEvent (enfileirado) OR webhook event |
| **Session** | Container lógico de entries (1 conversa Claude Code OR 1 sessão Codex) |
| **Project** | Agrupamento user-defined de sessions |
| **Source** | Origem do evento (claude-code, claude.ai, codex) |
| **Collector** | Script externo que envia eventos pro webhook (Python codex, Tampermonkey, hook PS) |
| **Pricing snapshot** | Row em pricing_snapshots, pricing por modelo a partir de data efetiva |
| **Idempotency key** | String única que dedupa replays (header X-Idempotency-Key) |
| **Worker** | Processo Node em `apps/worker/` que consome ingestion_events |
| **Gateway** | Rota Express em `apps/api/src/routes/webhook/*` que enfileira |
| **Boundary BRT** | Cálculo "hoje", "este mês" em America/Sao_Paulo (não UTC) |
| **Fail closed** | Default seguro (zero billing pra modelo unknown, rejeita payload inválido) |

## Bugs conhecidos / armadilhas

- **`session_id` é texto, não UUID** (legacy decisão — Codex envia próprio UUID, Claude Code envia conversation ID). Manter texto, indexar.
- **`source` enum drift**: 3-way diff DB check + Zod + collector literal. Validar (skill `tracker-business-rules`).
- **Model raw vs normalized**: `token_entries.model` armazena RAW (display via `displayModelName`, normalize via `normalizeModel` pra pricing lookup). Não armazenar normalized — raw preserva contexto.
- **`pricing_snapshots` immutable**: nunca UPDATE row existente. Sempre INSERT row nova com `effective_from`.

## Quando ativar outras skills

- Schema novo / migration → `stack-express-pg-queue` + R6 aditiva.
- Pricing entry novo → `tracker-business-rules` (cálculo) + ADR (R11).
- Endpoint API novo → `tracker-ingestion-contract` (se ingestion) ou `stack-express-pg-queue` (CRUD).
- Multi-user RLS → `tracker-postgres-security`.

## ⚠️ Sempre

- Antes de adicionar campo nullable, justificar (default value ou semantic null).
- Antes de mudar enum, atualizar Zod + Postgres CHECK + skill.
- Antes de FK nova, decidir ON DELETE (CASCADE vs RESTRICT vs SET NULL).
- Antes de mudar PK ou UNIQUE, validar não quebra dedup.

## Knowledge persistente

- **session_id é texto**: legacy, Codex envia UUID, Claude Code envia ID arbitrário, claude.ai envia sha256(url).
- **user_id em tudo**: R10 multi-user compat day 1.
- **pricing_snapshots immutable**: history matters.
- **Token entry é audit log**: nunca delete row de `token_entries`. Update raros (só pricing recompute via backfill aditivo).

## References / recipes / templates

- (planejado V2) `references/schemas-canonical.ts` — todos Zod schemas.
- (planejado V2) `references/erd.md` — entity-relationship diagram.
- (planejado V2) `references/glossary.md` — terminologia estendida.
