CREATE TABLE token_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  timestamp TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('claude-code','claude.ai')),
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read INTEGER NOT NULL DEFAULT 0,
  cache_write INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  session_id TEXT,
  conversation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_entries_user_ts ON token_entries (user_id, timestamp DESC);
CREATE INDEX idx_token_entries_source ON token_entries (source);
CREATE INDEX idx_token_entries_model ON token_entries (model);
CREATE INDEX idx_token_entries_session ON token_entries (session_id);
