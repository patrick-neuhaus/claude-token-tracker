import { query } from "../config/database.js";

export interface EntryFilters {
  model?: string;
  source?: string;
  from?: string;
  to?: string;
}

interface ListEntriesArgs extends EntryFilters {
  page: number;
  limit: number;
}

function buildEntryWhere(
  userId: string,
  filters: EntryFilters,
  startIdx = 2,
): { where: string; params: any[]; nextIdx: number } {
  const conditions: string[] = ["e.user_id = $1"];
  const params: any[] = [userId];
  let idx = startIdx;

  if (filters.model) {
    conditions.push(`e.model ILIKE $${idx++}`);
    params.push(`%${filters.model}%`);
  }
  if (filters.source) {
    conditions.push(`e.source = $${idx++}`);
    params.push(filters.source);
  }
  if (filters.from) {
    conditions.push(`e.timestamp >= $${idx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`e.timestamp <= $${idx++}`);
    params.push(filters.to);
  }

  return {
    where: `WHERE ${conditions.join(" AND ")}`,
    params,
    nextIdx: idx,
  };
}

export async function listEntries(userId: string, args: ListEntriesArgs) {
  const offset = (args.page - 1) * args.limit;
  const { where, params, nextIdx } = buildEntryWhere(userId, args);

  const [rows, countResult] = await Promise.all([
    query(
      `SELECT e.id, e.timestamp, e.source, e.model, e.input_tokens, e.output_tokens,
              e.cache_read, e.cache_write, e.total_tokens, e.cost_usd::float,
              e.session_id, e.conversation_url,
              s.custom_name AS session_name, s.id AS session_db_id
       FROM token_entries e
       LEFT JOIN sessions s ON s.session_id = e.session_id AND s.user_id = e.user_id
       ${where}
       ORDER BY e.timestamp DESC
       LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
      [...params, args.limit, offset],
    ),
    query(`SELECT COUNT(*)::int AS total FROM token_entries e ${where}`, params),
  ]);

  return {
    entries: rows.rows,
    total: countResult.rows[0].total,
    page: args.page,
    pages: Math.ceil(countResult.rows[0].total / args.limit),
  };
}

export async function listEntriesForExport(
  userId: string,
  filters: EntryFilters,
  limit = 50_000,
) {
  const { where, params } = buildEntryWhere(userId, filters);

  const result = await query(
    `SELECT e.timestamp, e.source, e.model, e.input_tokens, e.output_tokens,
            e.cache_read, e.cache_write, e.total_tokens, e.cost_usd::float,
            e.session_id, s.custom_name AS session_name, e.conversation_url
     FROM token_entries e
     LEFT JOIN sessions s ON s.session_id = e.session_id AND s.user_id = e.user_id
     ${where}
     ORDER BY e.timestamp DESC
     LIMIT ${limit}`,
    params,
  );
  return result.rows;
}
