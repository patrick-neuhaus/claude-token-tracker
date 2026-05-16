-- Persistent allowlist of active/deprecated skills. Surface in UI + drive hook gate.
-- Seed: 6 active + 42 deprecated matching current Wave H state.

CREATE TABLE IF NOT EXISTS skill_allowlist (
  skill_name TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('active', 'deprecated')),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed: 6 active
INSERT INTO skill_allowlist (skill_name, status) VALUES
  ('course-capture', 'active'),
  ('trident', 'active'),
  ('motion-design', 'active'),
  ('wave-closure-report', 'active'),
  ('research-brief-factory', 'active'),
  ('skill-builder', 'active')
ON CONFLICT (skill_name) DO NOTHING;

-- Seed: 42 deprecated
INSERT INTO skill_allowlist (skill_name, status) VALUES
  ('ai-seo', 'deprecated'),
  ('architecture-guard', 'deprecated'),
  ('cli-skill-wrapper', 'deprecated'),
  ('competitor-alternatives', 'deprecated'),
  ('comunicacao-clientes', 'deprecated'),
  ('design-system-audit', 'deprecated'),
  ('docx', 'deprecated'),
  ('free-tool-strategy', 'deprecated'),
  ('lovable-knowledge', 'deprecated'),
  ('pdf', 'deprecated'),
  ('pptx', 'deprecated'),
  ('product-discovery-prd', 'deprecated'),
  ('project-slide-maker', 'deprecated'),
  ('reference-finder', 'deprecated'),
  ('sales-enablement', 'deprecated'),
  ('schedule', 'deprecated'),
  ('seo', 'deprecated'),
  ('site-architecture', 'deprecated'),
  ('test-lab-architect', 'deprecated'),
  ('vps-infra-audit', 'deprecated'),
  ('xlsx', 'deprecated'),
  ('geo-optimizer', 'deprecated'),
  ('sdd', 'deprecated'),
  ('n8n-architect', 'deprecated'),
  ('component-architect', 'deprecated'),
  ('tech-lead-pm', 'deprecated'),
  ('prompt-engineer', 'deprecated'),
  ('launch-strategy', 'deprecated'),
  ('ui-design-system', 'deprecated'),
  ('product-marketing-context', 'deprecated'),
  ('react-patterns', 'deprecated'),
  ('pattern-importer', 'deprecated'),
  ('context-guardian', 'deprecated'),
  ('context-tree', 'deprecated'),
  ('lovable-router', 'deprecated'),
  ('maestro', 'deprecated'),
  ('security-audit', 'deprecated'),
  ('supabase-db-architect', 'deprecated'),
  ('copy', 'deprecated'),
  ('meeting-sync', 'deprecated'),
  ('ux-audit', 'deprecated'),
  ('patrick-voice', 'deprecated')
ON CONFLICT (skill_name) DO NOTHING;
