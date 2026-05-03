/**
 * Shared SQL WHERE-clause builders for token_entries and sessions.
 *
 * Both endpoints (entries list/export, sessions list) follow the same pattern:
 *   - userId is always param $1
 *   - subsequent filters append `AND <col> <op> $N` and push the value
 *
 * Centralized here so we don't drift between routes/services. Returns
 * `{ where, params, nextIdx }` so callers can keep appending (e.g. LIMIT/OFFSET).
 */

export interface EntryFilterParams {
  model?: string;
  source?: string;
  from?: string;
  to?: string;
}

export interface SessionFilterParams {
  search?: string;
  projectId?: string;
  from?: string;
  to?: string;
}

export interface BuiltFilter {
  where: string;
  params: any[];
  /** Next available $N index. Use this when appending LIMIT/OFFSET. */
  nextIdx: number;
}

/** Builds WHERE clause for token_entries queries (alias `e`). */
export function buildEntryFilters(
  userId: string,
  filters: EntryFilterParams,
  startIdx = 2,
): BuiltFilter {
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

/** Builds WHERE clause for sessions queries (alias `s`). */
export function buildSessionFilters(
  userId: string,
  filters: SessionFilterParams,
  startIdx = 2,
): BuiltFilter {
  const conditions: string[] = ["s.user_id = $1"];
  const params: any[] = [userId];
  let idx = startIdx;

  if (filters.search) {
    conditions.push(`(s.custom_name ILIKE $${idx} OR s.session_id ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }
  if (filters.projectId) {
    conditions.push(`s.project_id = $${idx++}::uuid`);
    params.push(filters.projectId);
  }
  if (filters.from) {
    conditions.push(`s.last_seen >= $${idx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`s.last_seen <= $${idx++}`);
    params.push(filters.to);
  }

  return {
    where: `WHERE ${conditions.join(" AND ")}`,
    params,
    nextIdx: idx,
  };
}
