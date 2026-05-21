-- Migration 017: data integrity wave
-- (a) Adicionar idx_unique_token_entry oficialmente (estava out-of-band)
-- (b) Promover INTEGER -> BIGINT em colunas de token (overflow defense)
-- (c) Adicionar ON DELETE CASCADE em FKs orfas

BEGIN;

-- (a) idx_unique_token_entry -- match com ON CONFLICT tuple do tokenService.ts:34
-- Se ja existir (out-of-band em prod Patrick), CREATE IF NOT EXISTS pula
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_token_entry
  ON token_entries (user_id, session_id, model, input_tokens, output_tokens, cache_read, cache_write, "timestamp");

-- (b) Token columns: INTEGER -> BIGINT
ALTER TABLE token_entries
  ALTER COLUMN input_tokens TYPE BIGINT,
  ALTER COLUMN output_tokens TYPE BIGINT,
  ALTER COLUMN cache_read TYPE BIGINT,
  ALTER COLUMN cache_write TYPE BIGINT,
  ALTER COLUMN total_tokens TYPE BIGINT;

ALTER TABLE sessions
  ALTER COLUMN total_input TYPE BIGINT,
  ALTER COLUMN total_output TYPE BIGINT;

-- compactions table: before/after tokens
ALTER TABLE compactions
  ALTER COLUMN before_tokens TYPE BIGINT,
  ALTER COLUMN after_tokens TYPE BIGINT;

-- (c) FK cascade -- drop + recreate
ALTER TABLE token_entries
  DROP CONSTRAINT IF EXISTS token_entries_user_id_fkey;
ALTER TABLE token_entries
  ADD CONSTRAINT token_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
