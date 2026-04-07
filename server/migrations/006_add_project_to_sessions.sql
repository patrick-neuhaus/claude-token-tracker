ALTER TABLE sessions ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_sessions_project_id ON sessions (project_id);
