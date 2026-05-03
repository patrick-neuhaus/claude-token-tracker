import { query } from "../config/database.js";

const ALLOWED_SORT = [
  "last_seen",
  "first_seen",
  "total_cost_usd",
  "entry_count",
] as const;
export type SessionSortCol = (typeof ALLOWED_SORT)[number];

export interface ListSessionsFilters {
  page: number;
  limit: number;
  search?: string;
  projectId?: string;
  from?: string;
  to?: string;
  sortBy: SessionSortCol;
  sortDir: "ASC" | "DESC";
}

export function normalizeSortCol(raw: unknown): SessionSortCol {
  return ALLOWED_SORT.includes(raw as SessionSortCol)
    ? (raw as SessionSortCol)
    : "last_seen";
}

export function normalizeSortDir(raw: unknown): "ASC" | "DESC" {
  return raw === "asc" ? "ASC" : "DESC";
}

function buildSessionWhere(
  userId: string,
  filters: Pick<ListSessionsFilters, "search" | "projectId" | "from" | "to">,
): { where: string; params: any[] } {
  let where = "WHERE s.user_id = $1";
  const params: any[] = [userId];

  if (filters.search) {
    where += ` AND (s.custom_name ILIKE $${params.length + 1} OR s.session_id ILIKE $${params.length + 1})`;
    params.push(`%${filters.search}%`);
  }
  if (filters.projectId) {
    where += ` AND s.project_id = $${params.length + 1}::uuid`;
    params.push(filters.projectId);
  }
  if (filters.from) {
    where += ` AND s.last_seen >= $${params.length + 1}`;
    params.push(filters.from);
  }
  if (filters.to) {
    where += ` AND s.last_seen <= $${params.length + 1}`;
    params.push(filters.to);
  }

  return { where, params };
}

export async function listSessions(userId: string, filters: ListSessionsFilters) {
  const offset = (filters.page - 1) * filters.limit;
  const { where, params } = buildSessionWhere(userId, filters);

  const [rows, countResult, aggResult] = await Promise.all([
    query(
      `SELECT s.id, s.session_id, s.custom_name, s.source, s.first_seen, s.last_seen,
              s.total_cost_usd::float, s.total_input, s.total_output, s.entry_count,
              s.project_id, p.name AS project_name
       FROM sessions s
       LEFT JOIN projects p ON p.id = s.project_id
       ${where}
       ORDER BY s.${filters.sortBy} ${filters.sortDir}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, offset],
    ),
    query(`SELECT COUNT(*)::int AS total FROM sessions s ${where}`, params),
    query(
      `SELECT
         COALESCE(SUM(s.total_cost_usd), 0)::float AS total_cost_usd,
         COALESCE(SUM(s.entry_count), 0)::int AS total_entries,
         COALESCE(MAX(s.total_cost_usd), 0)::float AS max_session_cost,
         COALESCE(AVG(s.total_cost_usd), 0)::float AS avg_session_cost
       FROM sessions s ${where}`,
      params,
    ),
  ]);

  return {
    sessions: rows.rows,
    total: countResult.rows[0].total,
    page: filters.page,
    pages: Math.ceil(countResult.rows[0].total / filters.limit),
    aggregates: aggResult.rows[0],
  };
}

export async function getSessionDetail(userId: string, sessionDbId: string) {
  const sessionResult = await query(
    `SELECT s.id, s.session_id, s.custom_name, s.source, s.first_seen, s.last_seen,
            s.total_cost_usd::float, s.total_input, s.total_output, s.entry_count,
            s.project_id, p.name AS project_name
     FROM sessions s
     LEFT JOIN projects p ON p.id = s.project_id
     WHERE s.id = $1 AND s.user_id = $2`,
    [sessionDbId, userId],
  );

  if (sessionResult.rows.length === 0) return null;

  const session = sessionResult.rows[0];

  const [aggregates, timeline, byModel, entries] = await Promise.all([
    query(
      `SELECT
         COALESCE(SUM(cost_usd), 0)::float AS total_cost_usd,
         COALESCE(SUM(input_tokens), 0)::bigint AS total_input,
         COALESCE(SUM(output_tokens), 0)::bigint AS total_output,
         COALESCE(SUM(cache_read), 0)::bigint AS total_cache_read,
         COALESCE(SUM(cache_write), 0)::bigint AS total_cache_write,
         COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
         COUNT(*)::int AS entry_count,
         MIN(timestamp) AS first_ts,
         MAX(timestamp) AS last_ts
       FROM token_entries
       WHERE user_id = $1 AND session_id = $2`,
      [userId, session.session_id],
    ),
    query(
      `SELECT timestamp, cost_usd::float AS cost_usd, model
       FROM token_entries
       WHERE user_id = $1 AND session_id = $2
       ORDER BY timestamp ASC
       LIMIT 5000`,
      [userId, session.session_id],
    ),
    query(
      `SELECT model,
              COALESCE(SUM(cost_usd), 0)::float AS cost_usd,
              COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
              COUNT(*)::int AS entries
       FROM token_entries
       WHERE user_id = $1 AND session_id = $2
       GROUP BY model
       ORDER BY cost_usd DESC`,
      [userId, session.session_id],
    ),
    query(
      `SELECT id, timestamp, source, model, input_tokens, output_tokens,
              cache_read, cache_write, total_tokens, cost_usd::float, conversation_url
       FROM token_entries
       WHERE user_id = $1 AND session_id = $2
       ORDER BY timestamp DESC
       LIMIT 100`,
      [userId, session.session_id],
    ),
  ]);

  let cumulative = 0;
  const timelineCumulative = timeline.rows.map((row: any) => {
    cumulative += Number(row.cost_usd);
    return {
      timestamp: row.timestamp,
      cost_usd: Number(row.cost_usd),
      cumulative_cost: cumulative,
      model: row.model,
    };
  });

  return {
    session,
    aggregates: aggregates.rows[0],
    timeline: timelineCumulative,
    by_model: byModel.rows,
    entries: entries.rows,
  };
}

export async function getSessionEntries(userId: string, sessionDbId: string) {
  const result = await query(
    `SELECT id, timestamp, source, model, input_tokens, output_tokens,
            cache_read, cache_write, total_tokens, cost_usd::float, conversation_url
     FROM token_entries
     WHERE user_id = $1 AND session_id = (
       SELECT session_id FROM sessions WHERE id = $2 AND user_id = $1
     )
     ORDER BY timestamp DESC`,
    [userId, sessionDbId],
  );
  return result.rows;
}

export async function renameSession(
  userId: string,
  sessionDbId: string,
  customName: string,
) {
  const result = await query(
    `UPDATE sessions SET custom_name = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, session_id, custom_name`,
    [sessionDbId, userId, customName],
  );
  return result.rows[0] || null;
}
