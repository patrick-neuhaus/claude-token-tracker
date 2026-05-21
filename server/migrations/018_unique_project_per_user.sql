-- Migration 018: UNIQUE (user_id, name) em projects
-- Onda 6 A1 P3: fix race em SELECT-then-INSERT no tokenService.ts. Sem
-- constraint, 2 entries paralelas com mesmo (user_id, project_name) podem
-- inserir 2 projects duplicados. Constraint + ON CONFLICT garante single
-- roundtrip atômico.

BEGIN;

-- Deduplica primeiro (idempotente): se já existem dups, mantém o mais antigo
-- e re-aponta sessions pra ele antes de criar a constraint.
WITH ranked AS (
  SELECT id, user_id, name,
         ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC, id ASC) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY user_id, name ORDER BY created_at ASC, id ASC) AS keep_id
  FROM projects
),
remap AS (
  UPDATE sessions s
  SET project_id = r.keep_id
  FROM ranked r
  WHERE s.project_id = r.id AND r.rn > 1
  RETURNING s.id
)
DELETE FROM projects
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_project_per_user
  ON projects (user_id, name);

COMMIT;
