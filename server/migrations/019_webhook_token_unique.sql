-- Migration 019: garantir UNIQUE em webhook_token (plain) por defesa em profundidade.
--
-- Contexto: users.webhook_token UUID DEFAULT gen_random_uuid() sem UNIQUE constraint.
-- UUID v4 collision negligible mas sem garantia DB. Wave 1 adicionou
-- webhook_token_hash UNIQUE em migration 016; mas plain webhook_token segue sem UNIQUE.
-- Defesa em profundidade — se um app/coletor consultar pela coluna plain, evita ambiguidade.
--
-- Idempotente: usa DO block + check em pg_constraint pra skip se já aplicada.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_webhook_token_unique' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_webhook_token_unique UNIQUE (webhook_token);
  END IF;
END $$;
