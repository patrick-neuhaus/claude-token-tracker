import { query } from "../config/database.js";
import {
  buildEntryFilters,
  type EntryFilterParams,
} from "../utils/filterBuilders.js";

// Re-export for legacy callers (route still imports this name).
export type EntryFilters = EntryFilterParams;

interface ListEntriesArgs extends EntryFilterParams {
  page: number;
  limit: number;
}

export async function listEntries(userId: string, args: ListEntriesArgs) {
  const offset = (args.page - 1) * args.limit;
  const { where, params, nextIdx } = buildEntryFilters(userId, args);

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
  filters: EntryFilterParams,
  limit = 50_000,
) {
  const { where, params } = buildEntryFilters(userId, filters);

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
