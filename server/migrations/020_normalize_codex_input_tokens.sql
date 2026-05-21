-- Migration 020: normalize codex input_tokens (remove cache_read double-count)
-- OpenAI API retorna input_tokens INCLUINDO cache_read. Anthropic não.
-- Worker II Onda 9: descontar cache_read na inserção. Esta migration backfilla histórico.
-- Idempotente: condicional `input_tokens > cache_read` previne dupla aplicação.

BEGIN;

UPDATE token_entries
SET input_tokens = GREATEST(0, input_tokens - cache_read)
WHERE source = 'codex'
  AND cache_read > 0
  AND input_tokens > cache_read;

-- Refresh sessions aggregates pra refletir input_tokens corrigido
UPDATE sessions s
SET total_input = sub.input_sum
FROM (
  SELECT session_id, user_id, SUM(input_tokens) as input_sum
  FROM token_entries
  WHERE source = 'codex'
  GROUP BY session_id, user_id
) sub
WHERE s.session_id = sub.session_id
  AND s.user_id = sub.user_id;

COMMIT;
