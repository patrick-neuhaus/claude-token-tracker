-- Migration 016: hash webhook_token at rest + rotation support
-- Wave 1 hardening: webhook token armazenado hashed (SHA-256 hex).
-- Coluna plain `webhook_token` permanece TEMPORARIAMENTE (UI Settings ainda mostra
-- ate rota propria de rotation expor + sumir). TODO: drop em wave futura.

BEGIN;

-- Garantir extension pgcrypto pra digest() no backfill
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Adiciona hash column (nullable inicialmente pra backfill) + timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_token_hash CHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_token_rotated_at TIMESTAMPTZ;

-- Index sobre hash (lookup speed) — UNIQUE pra prevenir collision UUID v4 -> SHA256
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_webhook_token_hash
  ON users(webhook_token_hash)
  WHERE webhook_token_hash IS NOT NULL;

-- Backfill: hash existing webhook_token values com SHA-256 hex
UPDATE users
SET webhook_token_hash = encode(digest(webhook_token::text, 'sha256'), 'hex'),
    webhook_token_rotated_at = NOW()
WHERE webhook_token IS NOT NULL AND webhook_token_hash IS NULL;

COMMIT;
