import { query } from "../config/database.js";

export async function getProjects(userId: string) {
  const result = await query(
    `SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
            COALESCE(SUM(s.total_cost_usd), 0)::float AS total_cost_usd,
            COALESCE(SUM(s.total_input), 0)::int AS total_input,
            COALESCE(SUM(s.total_output), 0)::int AS total_output,
            COUNT(s.id)::int AS session_count,
            MAX(s.last_seen) AS last_activity,
            (
              SELECT json_agg(json_build_object('day', d.day, 'cost', d.cost) ORDER BY d.day)
              FROM (
                SELECT (te.timestamp AT TIME ZONE 'America/Sao_Paulo')::date AS day,
                       COALESCE(SUM(te.cost_usd), 0)::float AS cost
                FROM token_entries te
                JOIN sessions s2 ON s2.session_id = te.session_id AND s2.user_id = te.user_id
                WHERE s2.project_id = p.id AND te.user_id = $1
                  AND te.timestamp >= NOW() - INTERVAL '7 days'
                GROUP BY day
              ) d
            ) AS sparkline
     FROM projects p
     LEFT JOIN sessions s ON s.project_id = p.id AND s.user_id = p.user_id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getProjectDetail(userId: string, projectId: string, from?: string, to?: string) {
  const projectResult = await query(
    `SELECT p.id, p.name, p.description, p.created_at, p.updated_at
     FROM projects p
     WHERE p.id = $1 AND p.user_id = $2`,
    [projectId, userId]
  );
  if (projectResult.rows.length === 0) return null;

  const sessionParams: unknown[] = [projectId, userId];
  const sessionConditions = ["s.project_id = $1", "s.user_id = $2"];
  if (from) { sessionConditions.push(`s.last_seen >= $${sessionParams.length + 1}`); sessionParams.push(from); }
  if (to) { sessionConditions.push(`s.last_seen <= $${sessionParams.length + 1}`); sessionParams.push(to); }
  const sessionWhere = sessionConditions.join(" AND ");

  const [sessionsResult, statsResult] = await Promise.all([
    query(
      `SELECT s.id, s.session_id, s.custom_name, s.source, s.first_seen, s.last_seen,
              s.total_cost_usd::float, s.total_input, s.total_output, s.entry_count
       FROM sessions s
       WHERE ${sessionWhere}
       ORDER BY s.last_seen DESC`,
      sessionParams
    ),
    query(
      `SELECT COALESCE(SUM(s.total_cost_usd), 0)::float AS total_cost_usd,
              COALESCE(SUM(s.total_input), 0)::int AS total_input,
              COALESCE(SUM(s.total_output), 0)::int AS total_output,
              COUNT(s.id)::int AS session_count
       FROM sessions s
       WHERE ${sessionWhere}`,
      sessionParams
    ),
  ]);

  return {
    ...projectResult.rows[0],
    ...statsResult.rows[0],
    sessions: sessionsResult.rows,
  };
}

export async function createProject(userId: string, name: string, description?: string) {
  const result = await query(
    `INSERT INTO projects (user_id, name, description) VALUES ($1, $2, $3)
     RETURNING id, name, description, created_at`,
    [userId, name, description || null]
  );
  return result.rows[0];
}

export async function updateProject(userId: string, projectId: string, updates: { name?: string; description?: string }) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 3;

  if (updates.name !== undefined) {
    sets.push(`name = $${idx++}`);
    vals.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${idx++}`);
    vals.push(updates.description);
  }
  if (sets.length === 0) return null;

  sets.push("updated_at = now()");

  const result = await query(
    `UPDATE projects SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2
     RETURNING id, name, description, updated_at`,
    [projectId, userId, ...vals]
  );
  return result.rows[0] || null;
}

export async function deleteProject(userId: string, projectId: string) {
  const result = await query(
    "DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id",
    [projectId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function assignSession(userId: string, sessionId: string, projectId: string) {
  const result = await query(
    `UPDATE sessions SET project_id = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, session_id, project_id`,
    [sessionId, userId, projectId]
  );
  return result.rows[0] || null;
}

export async function unassignSession(userId: string, sessionId: string) {
  const result = await query(
    `UPDATE sessions SET project_id = NULL
     WHERE id = $1 AND user_id = $2
     RETURNING id, session_id`,
    [sessionId, userId]
  );
  return result.rows[0] || null;
}

export async function getUnassignedSessions(userId: string) {
  const result = await query(
    `SELECT id, session_id, custom_name, source, last_seen, total_cost_usd::float, entry_count
     FROM sessions
     WHERE user_id = $1 AND project_id IS NULL
     ORDER BY last_seen DESC`,
    [userId]
  );
  return result.rows;
}
