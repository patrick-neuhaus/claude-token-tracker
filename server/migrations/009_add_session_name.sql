-- BUG-03 fix: codify inline ALTER from server/src/index.ts:24-27 as proper migration.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_name TEXT;
