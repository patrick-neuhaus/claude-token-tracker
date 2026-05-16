-- Skill invocations tracking: record every skill trigger (allow/deny) from claude-code hook.
-- Foundation for usage analytics dashboard + allowlist gate.

CREATE TABLE IF NOT EXISTS skill_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'claude-code',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_invocations_user_ts ON skill_invocations (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_skill ON skill_invocations (skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_decision ON skill_invocations (decision);
