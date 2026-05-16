import { query } from "../config/database.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordPreCompactInput {
  user_id: string;
  session_id: string;
  before_tokens: number;
  trigger?: "auto" | "manual";
  project_id?: string;
  timestamp?: Date;
}

export interface RecordPostCompactInput {
  user_id: string;
  session_id: string;
  after_tokens: number;
  timestamp?: Date;
}

export interface CompactionRow {
  id: string;
  session_id: string;
  project_id: string | null;
  before_tokens: number | null;
  after_tokens: number | null;
  reduction_pct: string | null;
  trigger: string | null;
  timestamp: string;
}

export interface SessionCompactionStats {
  compactions: CompactionRow[];
  avg_reduction_pct: number | null;
}

export interface InefficientSession {
  session_id: string;
  compaction_count: number;
  avg_reduction_pct: number | null;
}

export interface CompactionStats {
  bySession?: SessionCompactionStats;
  inefficientSessions?: InefficientSession[];
}

// ---------------------------------------------------------------------------
// recordPreCompact
// ---------------------------------------------------------------------------

/**
 * Called on PreCompact event. Inserts a new row with before_tokens + trigger.
 * after_tokens remains NULL until the matching PostCompact arrives.
 */
export async function recordPreCompact(
  input: RecordPreCompactInput
): Promise<{ id: string }> {
  const ts = input.timestamp ?? new Date();
  const trigger = input.trigger ?? "auto";

  const result = await query<{ id: string }>(
    `INSERT INTO compactions
       (user_id, session_id, project_id, before_tokens, trigger, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.user_id,
      input.session_id,
      input.project_id ?? null,
      input.before_tokens,
      trigger,
      ts,
    ]
  );

  return { id: result.rows[0].id };
}

// ---------------------------------------------------------------------------
// recordPostCompact
// ---------------------------------------------------------------------------

/**
 * Called on PostCompact event.
 * Finds the most recent row for this session where after_tokens IS NULL,
 * fills after_tokens, and computes reduction_pct = (before - after) * 100 / before.
 */
export async function recordPostCompact(
  input: RecordPostCompactInput
): Promise<{ updated: boolean }> {
  const result = await query<{ id: string }>(
    `UPDATE compactions
     SET
       after_tokens = $1,
       reduction_pct = CASE
         WHEN before_tokens IS NOT NULL AND before_tokens > 0
         THEN ROUND(((before_tokens - $1::numeric) * 100.0) / before_tokens, 2)
         ELSE NULL
       END
     WHERE id = (
       SELECT id FROM compactions
       WHERE user_id = $2
         AND session_id = $3
         AND after_tokens IS NULL
       ORDER BY timestamp DESC
       LIMIT 1
     )
     RETURNING id`,
    [input.after_tokens, input.user_id, input.session_id]
  );

  return { updated: result.rows.length > 0 };
}

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

/**
 * Returns compaction stats for a user.
 * - bySession(session_id): list + avg reduction for that session
 * - inefficientSessions(): sessions with >3 compactions OR avg reduction < 30%
 */
export async function getStats(
  user_id: string,
  opts: { session_id?: string } = {}
): Promise<CompactionStats> {
  if (opts.session_id) {
    const rows = await query<CompactionRow>(
      `SELECT
         id, session_id, project_id,
         before_tokens, after_tokens, reduction_pct::text, trigger,
         timestamp
       FROM compactions
       WHERE user_id = $1 AND session_id = $2
       ORDER BY timestamp ASC`,
      [user_id, opts.session_id]
    );

    const avgResult = await query<{ avg: string | null }>(
      `SELECT ROUND(AVG(reduction_pct), 2)::text AS avg
       FROM compactions
       WHERE user_id = $1 AND session_id = $2 AND reduction_pct IS NOT NULL`,
      [user_id, opts.session_id]
    );

    return {
      bySession: {
        compactions: rows.rows,
        avg_reduction_pct: avgResult.rows[0]?.avg
          ? Number(avgResult.rows[0].avg)
          : null,
      },
    };
  }

  // inefficientSessions: >3 compactions OR avg reduction_pct < 30
  const result = await query<{
    session_id: string;
    compaction_count: string;
    avg_reduction_pct: string | null;
  }>(
    `SELECT
       session_id,
       COUNT(*)::text AS compaction_count,
       ROUND(AVG(reduction_pct), 2)::text AS avg_reduction_pct
     FROM compactions
     WHERE user_id = $1
     GROUP BY session_id
     HAVING COUNT(*) > 3 OR AVG(reduction_pct) < 30
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [user_id]
  );

  return {
    inefficientSessions: result.rows.map((r) => ({
      session_id: r.session_id,
      compaction_count: Number(r.compaction_count),
      avg_reduction_pct: r.avg_reduction_pct ? Number(r.avg_reduction_pct) : null,
    })),
  };
}
