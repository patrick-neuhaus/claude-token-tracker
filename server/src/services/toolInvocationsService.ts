import { query } from "../config/database.js";
import { isFresh } from "../utils/ttlCache.js";

export interface RecordToolUseInput {
  user_id: string;
  session_id?: string;
  project_name?: string;
  cwd?: string;
  tool_name: string;
  duration_ms?: number | null;
  success?: boolean;
  timestamp?: Date;
}

export interface RecordToolUseResult {
  id: string;
  timestamp: string;
}

export interface ToolStatsInput {
  user_id: string;
  from?: Date;
  to?: Date;
  session_id?: string;
  project_id?: string;
}

export interface TopToolRow {
  tool_name: string;
  count: number;
  total_duration_ms: number | null;
}

export interface BySessionRow {
  session_id: string;
  count: number;
}

export interface ByProjectRow {
  project_id: string;
  project_name: string;
  count: number;
}

export interface ToolStats {
  topTools: TopToolRow[];
  bySession: BySessionRow[];
  byProject: ByProjectRow[];
}

const STATS_TTL_MS = 30_000;
const statsCache = new Map<string, { at: number; data: ToolStats }>();

function statsCacheKey(input: ToolStatsInput): string {
  return [
    input.user_id,
    input.from?.toISOString() ?? "",
    input.to?.toISOString() ?? "",
    input.session_id ?? "",
    input.project_id ?? "",
  ].join("|");
}

function invalidateStatsCacheForUser(userId: string): void {
  for (const key of statsCache.keys()) {
    if (key.startsWith(`${userId}|`)) statsCache.delete(key);
  }
}

/**
 * Resolve or upsert project by name/cwd, returning project_id.
 * Returns null if project_name is empty/undefined.
 */
async function resolveProjectId(
  user_id: string,
  project_name?: string
): Promise<string | null> {
  if (!project_name?.trim()) return null;

  const name = project_name.trim();
  const existing = await query<{ id: string }>(
    `SELECT id FROM projects WHERE user_id = $1 AND name = $2 LIMIT 1`,
    [user_id, name]
  );
  if (existing.rows.length > 0) return existing.rows[0]?.id ?? null;

  const created = await query<{ id: string }>(
    `INSERT INTO projects (user_id, name) VALUES ($1, $2) RETURNING id`,
    [user_id, name]
  );
  return created.rows[0]?.id ?? null;
}

/**
 * Record one tool invocation from the claude-code PostToolUse hook.
 */
export async function recordToolUse(
  input: RecordToolUseInput
): Promise<RecordToolUseResult> {
  const toolName = input.tool_name?.trim();
  if (!toolName) throw new Error("tool_name is required");

  const projectId = await resolveProjectId(input.user_id, input.project_name);
  const ts = input.timestamp ?? new Date();
  const success = input.success ?? true;

  const result = await query<{ id: string; timestamp: Date }>(
    `INSERT INTO tool_invocations
       (user_id, session_id, project_id, tool_name, duration_ms, success, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, timestamp`,
    [
      input.user_id,
      input.session_id ?? null,
      projectId,
      toolName,
      input.duration_ms ?? null,
      success,
      ts,
    ]
  );

  invalidateStatsCacheForUser(input.user_id);

  const row = result.rows[0];
  if (!row) throw new Error("Failed to insert tool invocation");
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
  };
}

/**
 * Aggregate tool usage stats. Top 10 tools by count + breakdown by session + project.
 */
export async function getStats(input: ToolStatsInput): Promise<ToolStats> {
  const cacheKey = statsCacheKey(input);
  const cached = statsCache.get(cacheKey);
  if (cached && isFresh(cached.at, STATS_TTL_MS)) return cached.data;

  const startTs = input.from?.toISOString() ?? "1970-01-01T00:00:00.000Z";
  const endTs = input.to?.toISOString() ?? new Date().toISOString();

  const [topRes, bySessionRes, byProjectRes] = await Promise.all([
    query<{ tool_name: string; count: string; total_duration_ms: string | null }>(
      `SELECT tool_name,
              COUNT(*)::bigint AS count,
              SUM(duration_ms)::bigint AS total_duration_ms
       FROM tool_invocations
       WHERE user_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
       GROUP BY tool_name
       ORDER BY count DESC, tool_name ASC
       LIMIT 10`,
      [input.user_id, startTs, endTs]
    ),
    query<{ session_id: string; count: string }>(
      `SELECT session_id, COUNT(*)::bigint AS count
       FROM tool_invocations
       WHERE user_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
         AND session_id IS NOT NULL
       GROUP BY session_id
       ORDER BY count DESC
       LIMIT 20`,
      [input.user_id, startTs, endTs]
    ),
    query<{ project_id: string; project_name: string; count: string }>(
      `SELECT ti.project_id, p.name AS project_name, COUNT(*)::bigint AS count
       FROM tool_invocations ti
       JOIN projects p ON p.id = ti.project_id
       WHERE ti.user_id = $1
         AND ti.timestamp >= $2
         AND ti.timestamp <= $3
         AND ti.project_id IS NOT NULL
       GROUP BY ti.project_id, p.name
       ORDER BY count DESC
       LIMIT 10`,
      [input.user_id, startTs, endTs]
    ),
  ]);

  const data: ToolStats = {
    topTools: topRes.rows.map((r) => ({
      tool_name: r.tool_name,
      count: Number(r.count),
      total_duration_ms: r.total_duration_ms != null ? Number(r.total_duration_ms) : null,
    })),
    bySession: bySessionRes.rows.map((r) => ({
      session_id: r.session_id,
      count: Number(r.count),
    })),
    byProject: byProjectRes.rows.map((r) => ({
      project_id: r.project_id,
      project_name: r.project_name,
      count: Number(r.count),
    })),
  };

  statsCache.set(cacheKey, { at: Date.now(), data });
  return data;
}
