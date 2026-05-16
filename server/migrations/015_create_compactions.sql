-- Feature 3: Compactions Tracking
-- Records PreCompact/PostCompact events from claude-code hooks.
-- One row per PreCompact; PostCompact UPDATE fills after_tokens + reduction_pct.

CREATE TABLE IF NOT EXISTS compactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  before_tokens INTEGER,
  after_tokens INTEGER,
  reduction_pct NUMERIC(5,2),
  trigger TEXT CHECK (trigger IN ('auto', 'manual')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compactions_user_timestamp ON compactions(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_compactions_session ON compactions(session_id);
