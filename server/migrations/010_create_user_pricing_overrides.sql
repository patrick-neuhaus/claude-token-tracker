-- Wave 7.3 (F-NEW-8) — Custom pricing per-model per-user.
--
-- User overrides global PRICING (server/src/config/pricing.ts) for specific
-- model_key entries. Effective pricing = override IF exists ELSE global PRICING.
-- Apply ONLY to new entries (cost_usd recalc on insert), not retroactive.
--
-- Use case: enterprise contracts (Anthropic discounts), GPT internal rates,
-- user-specific pricing tiers. PricingDrawer UI in Settings page lets user
-- create/edit/delete overrides per model.

CREATE TABLE IF NOT EXISTS user_pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_key TEXT NOT NULL,
  input_rate NUMERIC(10, 4) NOT NULL CHECK (input_rate >= 0),
  output_rate NUMERIC(10, 4) NOT NULL CHECK (output_rate >= 0),
  cache_read_rate NUMERIC(10, 4) NOT NULL CHECK (cache_read_rate >= 0),
  cache_write_rate NUMERIC(10, 4) NOT NULL CHECK (cache_write_rate >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, model_key)
);

CREATE INDEX IF NOT EXISTS idx_user_pricing_overrides_lookup
  ON user_pricing_overrides (user_id, model_key);
