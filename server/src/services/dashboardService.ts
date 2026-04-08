import { query } from "../config/database.js";

export interface DashboardFilters {
  period?: { start: string; end: string };
  model?: string;
  source?: string;
  project_id?: string;
}

function buildFilters(userId: string, filters: DashboardFilters): { where: string; params: unknown[] } {
  const period = filters.period!;
  const params: unknown[] = [userId, period.start, period.end];
  const conditions: string[] = ["user_id = $1", "timestamp >= $2", "timestamp <= $3"];
  let idx = 4;

  if (filters.model) {
    conditions.push(`model ILIKE $${idx++}`);
    params.push(`%${filters.model}%`);
  }
  if (filters.source) {
    conditions.push(`source = $${idx++}`);
    params.push(filters.source);
  }
  if (filters.project_id) {
    conditions.push(`session_id IN (SELECT session_id FROM sessions WHERE project_id = $${idx++}::uuid AND user_id = $1)`);
    params.push(filters.project_id);
  }

  return { where: conditions.join(" AND "), params };
}

export async function getSummary(userId: string, filters: DashboardFilters) {
  const { where, params } = buildFilters(userId, filters);
  const result = await query(
    `SELECT
       COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
       COALESCE(SUM(input_tokens), 0)::bigint AS total_input,
       COALESCE(SUM(output_tokens), 0)::bigint AS total_output,
       COALESCE(SUM(cache_read), 0)::bigint AS total_cache_read,
       COALESCE(SUM(cache_write), 0)::bigint AS total_cache_write,
       COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
       COUNT(*)::int AS entry_count,
       COUNT(DISTINCT session_id)::int AS session_count,
       MIN(timestamp) AS first_entry,
       MAX(timestamp) AS last_entry,
       COALESCE(SUM(CASE WHEN timestamp >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC') THEN cost_usd END), 0)::float AS today_cost_usd,
       COALESCE(SUM(cache_read * (CASE
         WHEN model ILIKE '%opus%' THEN 13.5
         WHEN model ILIKE '%haiku%' THEN 0.72
         ELSE 2.7
       END) / 1000000.0), 0)::float AS cache_savings_usd
     FROM token_entries
     WHERE ${where}`,
    params
  );
  return result.rows[0];
}

export async function getCharts(userId: string, filters: DashboardFilters) {
  const { where, params } = buildFilters(userId, filters);

  const [byModel, bySource, daily] = await Promise.all([
    query(
      `SELECT model,
              COALESCE(SUM(cost_usd), 0)::float AS cost_usd,
              COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
              COUNT(*)::int AS entries
       FROM token_entries
       WHERE ${where}
       GROUP BY model
       ORDER BY cost_usd DESC`,
      params
    ),
    query(
      `SELECT source,
              COALESCE(SUM(cost_usd), 0)::float AS cost_usd,
              COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
              COUNT(*)::int AS entries
       FROM token_entries
       WHERE ${where}
       GROUP BY source
       ORDER BY cost_usd DESC`,
      params
    ),
    query(
      `SELECT
         (timestamp AT TIME ZONE 'America/Sao_Paulo')::date AS day,
         model,
         COALESCE(SUM(cost_usd), 0)::float AS cost_usd,
         COUNT(*)::int AS entries
       FROM token_entries
       WHERE ${where}
       GROUP BY day, model
       ORDER BY day`,
      params
    ),
  ]);

  return {
    by_model: byModel.rows,
    by_source: bySource.rows,
    daily: daily.rows,
  };
}
