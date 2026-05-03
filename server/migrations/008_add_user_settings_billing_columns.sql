-- BUG-03 fix: codify inline ALTER from server/src/index.ts:14-23 as proper migration.
-- Idempotent (IF NOT EXISTS) for safe re-run on dbs that already received the inline ALTER.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS daily_budget_usd NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS session_budget_usd NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS plan_start_date DATE,
  ADD COLUMN IF NOT EXISTS weekly_reset_dow INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS weekly_reset_hour INT DEFAULT 15;
