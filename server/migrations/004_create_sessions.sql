CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  custom_name TEXT,
  source TEXT NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  total_cost_usd NUMERIC(12,6) DEFAULT 0,
  total_input INTEGER DEFAULT 0,
  total_output INTEGER DEFAULT 0,
  entry_count INTEGER DEFAULT 0,
  UNIQUE(user_id, session_id)
);

CREATE INDEX idx_sessions_last_seen ON sessions (last_seen DESC);
