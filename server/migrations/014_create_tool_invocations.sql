-- Tool invocations tracking: record every tool call from claude-code PostToolUse hook.
-- Foundation for tool usage analytics (Top Tools chart, per-session breakdown).

CREATE TABLE IF NOT EXISTS tool_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_invocations_user_timestamp ON tool_invocations(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tool_invocations_session ON tool_invocations(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_invocations_tool ON tool_invocations(tool_name);
