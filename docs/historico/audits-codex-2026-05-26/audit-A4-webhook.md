# Audit A4 - Webhook Ingestion

Projeto: `claude-token-tracker`
Escopo: `server/src/routes/webhook.ts`, `server/src/services/tokenService.ts`, auth/CSRF, migrations, collectors, inserts em `token_entries`.

## Trident Review

**Assessment**: REQUEST_CHANGES
**Arquivos lidos**: webhook route, token service, webhook auth, CSRF, migrations `003/007/016/017/019/020`, collectors Claude/Codex, sample JSONL Codex.

### Findings

| ID | Sev | Conf | Categoria | Finding |
|---|---|---:|---|---|
| A4-1 | P1 | Alta | Data integrity | `model` aceita qualquer string não vazia. `test`/`healthcheck-bogus` entram no banco, `getEffectivePricing()` normaliza desconhecido para `gpt-5`, mas armazena o raw lixo. Deve rejeitar via allowlist/regex baseada em modelos suportados. |
| A4-2 | P1 | Alta | Dedup | `idx_unique_token_entry` inclui `session_id`, mas Postgres trata `NULL` como distinto. Entradas sem `session_id` não deduplicam mesmo com mesma tuple. Usar `NULLS NOT DISTINCT`, `COALESCE(session_id,'')` em índice expression, ou tornar `session_id` obrigatório por source. |
| A4-3 | P1 | Alta | Error path | Insert em `token_entries` e upsert em `sessions` não estão na mesma transação. Se o insert passar e a sessão falhar, retry vira duplicate e nunca repara agregados de sessão. |
| A4-4 | P2 | Alta | Validation | `timestamp` é só `z.string()`. Timestamp inválido passa no Zod e vira erro DB/500. Deve validar `datetime`/coerce date e responder 400. |
| A4-5 | P2 | Alta | Validation/spam | Payload mínimo com `timestamp`, `source`, `model` passa com todos tokens default `0`. Isso permite healthcheck/spam de linhas zero-cost. Deve exigir algum token positivo ou `total_tokens > 0`. |
| A4-6 | P2 | Alta | Rate limit | Webhook não tem rate limit. UNIQUE só mitiga replay exato, não spam com timestamps/modelos diferentes. Token válido comprometido pode inflar DB. |
| A4-7 | P2 | Média | Model normalization | Servidor normaliza modelo só para pricing, não para storage/dedup. Frontend usa `normalizeModelFamily()` separado. Isso cria drift entre preço, agrupamento visual e dedup. |
| A4-8 | P2 | Média | Auth/token handling | Auth usa hash lookup, o que evita comparação plaintext no app; `timingSafeEqual` não é o ponto principal. Mas o token plaintext ainda é retornado por Settings e mantido em `users.webhook_token`, contradizindo "returns once". |
| A4-9 | P3 | Alta | Source drift | Webhook/DB/coletor/constantes frontend aceitam `codex`, mas `server/src/routes/import.ts` ainda só aceita `claude-code` e `claude.ai`. Reimport/export com Codex falha. |

## Schema

Webhook usa Zod, não cast manual.

Defaults para `0`: `input_tokens`, `output_tokens`, `cache_read`, `cache_write`, `total_tokens`.

Opcionais que viram `null` no insert: `session_id`, `conversation_url`.
Opcionais usados só para sessão/projeto: `auto_name`, `session_name`, `project`, `cwd`.
Aliases aceitos: `cache_read_tokens`, `cache_write_tokens`.
`cost_brl` é aceito mas ignorado. `cost_usd` nem está no schema e é descartado pelo Zod.

## Source

Alinhamento principal está correto:

- Claude hook envia `source: "claude-code"`.
- Tampermonkey envia `source: "claude.ai"`.
- Codex collector envia `source: "codex"`.
- Webhook aceita enum `["claude-code", "claude.ai", "codex"]`.
- DB migration `007` adiciona `codex` no CHECK.
- Frontend `SOURCE_COLORS` já tem as 3 fontes.

## Model

Codex collector lê `turn_context.payload.model` e manda bruto, ex. `gpt-5.5`. O JSONL sample mostra `session_meta.source = "exec"` e eventos `token_count` sem model por evento; o collector resolve model no `turn_context`.

Servidor aceita raw model e só normaliza dentro do pricing. Recomendação: rejeitar modelo desconhecido antes do insert. Whitelist explícita dos `PRICING` keys + regex de raw conhecido (`gpt-*`, `claude-*`) é mais segura que fallback silencioso.

## Dedup

Existe `idx_unique_token_entry` em migration `017`, e `tokenService` usa:

`ON CONFLICT (user_id, session_id, model, input_tokens, output_tokens, cache_read, cache_write, "timestamp") DO NOTHING`

Também captura `23505`, então conflito real não vira 500. Problema restante: `session_id NULL` e raw model drift.

## Auth

`X-Webhook-Token` é obrigatório. O middleware calcula SHA-256 e busca `users.webhook_token_hash`. Não há comparação plaintext no app, então `timingSafeEqual` não é essencial aqui. Rotação existe em `/api/auth/rotate-webhook-token`, mas plaintext ainda fica disponível via Settings.

## Verificação

Não rodei testes; auditoria foi read-only por restrição do sandbox.
