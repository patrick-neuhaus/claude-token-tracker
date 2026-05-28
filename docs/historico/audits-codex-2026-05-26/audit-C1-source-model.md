# Audit W-C1 — Source/Model 3-way diff

## DB
- check constraint inicial: `server/migrations/003_create_token_entries.sql:5`
  - `source IN ('claude-code','claude.ai')`
- check constraint final: `server/migrations/007_add_codex_source_and_openai_models.sql:5-6`
  - `token_entries_source_check`
  - `source IN ('claude-code','claude.ai','codex')`
- migration de normalizacao Codex: `server/migrations/020_normalize_codex_input_tokens.sql`
  - backfill em `token_entries` onde `source = 'codex'`
- valores reais via DB: nao verificado
  - comandos de query read-only via `node -e` e `docker exec psql` foram rejeitados pela policy da sessao.

## Server
- `server/src/services/webhookService.ts`: nao existe.
- webhook accept: `server/src/routes/webhook.ts:12`
  - `z.enum(["claude-code", "claude.ai", "codex"])`
  - rejeita qualquer outro `source` antes de chegar no DB.
- model accept: `server/src/routes/webhook.ts:13`
  - `model: z.string().min(1)`
  - salva literal recebido.
- insert: `server/src/services/tokenService.ts:68-69`
  - grava `payload.source` e `payload.model` literalmente em `token_entries`.
- normalizer server:
  - pricing usa `normalizeModel(rawModel)` em `server/src/services/pricingOverrideService.ts:82`.
  - `server/src/utils/modelNormalizer.ts` normaliza GPT para keys tipo `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.3-codex`.
  - Claude vira `opus-*`, `sonnet-*`, `haiku-*`.
  - modelo sem familia reconhecida vira `gpt-5`.

## Collectors
- Codex collector: `C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/codex/scripts/codex-token-collector.py`
  - docstring declara `source="codex"` na linha 4.
  - payload literal: `"source": "codex"` na linha 178.
  - model vem bruto de `turn_context.payload.model`: linhas 100, 114, 179.
  - fallback de model: `"unknown"`.
- Claude Code hook: `scripts/claude_code_hook.py`
  - payload literal: `'source': 'claude-code'` na linha 422.
  - model vem de `model` / `activeModel` / `message.model`: linhas 294-307.
  - fallback de model: `'unknown'` na linha 423.
- outros hooks pesquisados em `~/.claude/hooks`:
  - `skill-invocation-gate.ps1` usa `source = 'claude-code'`, mas para skill invocations, nao `token_entries`.
  - `tool-use-tracker.ps1`, compaction trackers e plan capture nao enviam `track-tokens`.

## Client
- dropdown sources:
  - `useEntriesDistinct`: `client/src/hooks/useEntriesDistinct.ts`
  - API: `server/src/routes/entries.ts:/distinct`
  - SQL: `server/src/services/entriesService.ts` usa `SELECT DISTINCT source FROM token_entries`.
  - `EntriesPage`: dinamico via `distinct.sources`, label com `displayLabel`.
  - `DashboardFilters`: dinamico via `distinct.sources`, label com `displayLabel`.
- dropdown models:
  - `EntriesPage`: dinamico via `distinct.models`, label com `displayModelName`.
  - `DashboardFilters`: nao e dropdown; e `Input` livre.
- displayLabel:
  - `client/src/lib/constants.ts:64`
  - `claude-code` -> `Claude Code`
  - `claude.ai` -> `Claude.ai`
  - `codex` -> `Codex`
- displayModelName:
  - `client/src/lib/constants.ts:81`
  - remove suffix de data Anthropic `-\d{8}`
  - junta numeros consecutivos: `claude-opus-4-7` -> `Claude Opus 4.7`
  - GPT fica title-case generico: `gpt-5.5` -> `Gpt 5.5`
- normalizeModelFamily:
  - `client/src/lib/constants.ts:47`
  - mapeia por substring: `gpt`, `opus`, `sonnet`, `haiku`; resto vira `outro`.

## Drifts

P1 [filter correctness]: `DashboardFilters` usa `Input` livre para model, mas `dashboardService` filtra `model = $N` exact-match. Digitar `gpt` ou `opus` parece filtro valido, mas retorna vazio. Fix: trocar por `NativeSelect` com `distinct.models` + `displayModelName`, ou mudar server para `ILIKE` se a UX desejada for busca parcial.

P1 [billing correctness]: collectors podem enviar `model = "unknown"`; server aceita e salva literal, mas `normalizeModel("unknown")` retorna `gpt-5`, cobrando com pricing GPT por default. Fix: `normalizeModel` deve retornar sentinel/`unknown` para desconhecidos e cair em `DEFAULT_PRICING` explicito, ou webhook deve rejeitar/registrar modelo desconhecido antes de calcular custo.

P2 [source display drift]: `EntriesTable` renderiza source cru em pill (`codex`, `claude-code`), enquanto filtros e chart usam `displayLabel` (`Codex`, `Claude Code`). Fix: usar `displayLabel(v)` na coluna Fonte.

P2 [model display drift]: `EntriesTable` renderiza model cru, enquanto filtros/charts usam `displayModelName`. Fix: renderizar `displayModelName(v)` com `title={v}` para manter raw acessivel.

P2 [adjacent source drift]: `server/src/routes/import.ts` ainda valida CSV com apenas `["claude-code", "claude.ai"]`, embora DB e webhook aceitem `codex`. Fora do escopo principal do webhook, mas e drift real de entrada. Fix: incluir `codex` ou documentar que import CSV nao suporta Codex.

P3 [label polish]: `displayModelName("gpt-5.5")` vira `Gpt 5.5`; server util `modelDisplayName` usa `GPT-5.5`. Fix: tratar prefixo `gpt` como uppercase no frontend.

P3 [unverified DB drift]: nao foi possivel listar `SELECT DISTINCT model/source` nem calcular modelos reais que cairiam em `outro` por bloqueio da sandbox. Pelo codigo, `gpt-5.5`, `gpt-5.4-mini`, `gpt-5.3-codex`, `claude-opus-*`, `claude-sonnet-*`, `claude-haiku-*` mapeiam corretamente; `unknown` cairia em `outro` no frontend.
