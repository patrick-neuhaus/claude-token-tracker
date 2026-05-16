import { query } from "../config/database.js";
import { isFresh } from "../utils/ttlCache.js";

export type SkillDecision = "allow" | "deny";

export interface RecordInvocationInput {
  user_id: string;
  skill_name: string;
  decision: SkillDecision;
  source?: string;
  session_id?: string;
  project_id?: string;
  timestamp?: Date;
}

export interface RecordInvocationResult {
  id: string;
  timestamp: string;
}

export interface SkillStatsInput {
  user_id: string;
  from?: Date;
  to?: Date;
  project_id?: string;
}

export interface TopSkillRow {
  skill_name: string;
  count: number;
}

export interface DailyCountRow {
  date: string;
  count: number;
  allow: number;
  deny: number;
}

export interface SkillStats {
  topSkills: TopSkillRow[];
  dailyCount: DailyCountRow[];
  deprecatedCount: number;
}

// Tiny in-memory TTL cache keyed by user+from+to+project_id.
// Stats endpoint reads hot — 30s window cuts most refresh chatter without hiding fresh writes too long.
const STATS_TTL_MS = 30_000;
const statsCache = new Map<string, { at: number; data: SkillStats }>();

function statsCacheKey(input: SkillStatsInput): string {
  return [
    input.user_id,
    input.from?.toISOString() ?? "",
    input.to?.toISOString() ?? "",
    input.project_id ?? "",
  ].join("|");
}

function invalidateStatsCacheForUser(userId: string): void {
  for (const key of statsCache.keys()) {
    if (key.startsWith(`${userId}|`)) statsCache.delete(key);
  }
}

/**
 * Record one skill invocation from the claude-code hook.
 * Throws on missing/invalid skill_name or decision so the route can 400.
 */
export async function recordInvocation(
  input: RecordInvocationInput
): Promise<RecordInvocationResult> {
  const skillName = input.skill_name?.trim();
  if (!skillName) throw new Error("skill_name is required");
  if (input.decision !== "allow" && input.decision !== "deny") {
    throw new Error("decision must be 'allow' or 'deny'");
  }

  const source = input.source?.trim() || "claude-code";
  const ts = input.timestamp ?? new Date();

  const result = await query<{ id: string; timestamp: Date }>(
    `INSERT INTO skill_invocations
       (user_id, skill_name, source, timestamp, session_id, decision, project_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, timestamp`,
    [
      input.user_id,
      skillName,
      source,
      ts,
      input.session_id ?? null,
      input.decision,
      input.project_id ?? null,
    ]
  );

  // New write — bust the user's stats cache so the next /stats reflects it.
  invalidateStatsCacheForUser(input.user_id);

  const row = result.rows[0];
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
  };
}

/**
 * Aggregate stats for the UsagePage. Three buckets in parallel:
 *  - topSkills: skill_name → count (desc), top 20
 *  - dailyCount: date (São Paulo) → count + allow + deny breakdown
 *  - deprecatedCount: invocations of any skill currently marked deprecated
 *
 * If from/to omitted, falls back to "all time" — Postgres still uses the index.
 */
export async function getStats(input: SkillStatsInput): Promise<SkillStats> {
  const cacheKey = statsCacheKey(input);
  const cached = statsCache.get(cacheKey);
  if (cached && isFresh(cached.at, STATS_TTL_MS)) return cached.data;

  const startTs = input.from?.toISOString() ?? "1970-01-01T00:00:00.000Z";
  const endTs = input.to?.toISOString() ?? new Date().toISOString();

  // Optional project_id filter — adds $4 param when present
  const projectFilter = input.project_id ? `AND project_id = $4` : "";
  const baseParams: unknown[] = [input.user_id, startTs, endTs];
  if (input.project_id) baseParams.push(input.project_id);

  const [topRes, dailyRes, deprecatedRes] = await Promise.all([
    query<{ skill_name: string; count: string }>(
      `SELECT skill_name, COUNT(*)::bigint AS count
       FROM skill_invocations
       WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3 ${projectFilter}
       GROUP BY skill_name
       ORDER BY count DESC, skill_name ASC
       LIMIT 20`,
      baseParams
    ),
    query<{ date: string; count: string; allow: string; deny: string }>(
      `SELECT
         to_char((timestamp AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS date,
         COUNT(*)::bigint AS count,
         COUNT(*) FILTER (WHERE decision = 'allow')::bigint AS allow,
         COUNT(*) FILTER (WHERE decision = 'deny')::bigint AS deny
       FROM skill_invocations
       WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3 ${projectFilter}
       GROUP BY date
       ORDER BY date ASC`,
      baseParams
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::bigint AS count
       FROM skill_invocations si
       JOIN skill_allowlist sa ON sa.skill_name = si.skill_name
       WHERE si.user_id = $1 AND si.timestamp >= $2 AND si.timestamp <= $3 ${projectFilter}
         AND sa.status = 'deprecated'`,
      baseParams
    ),
  ]);

  const data: SkillStats = {
    topSkills: topRes.rows.map((r) => ({
      skill_name: r.skill_name,
      count: Number(r.count),
    })),
    dailyCount: dailyRes.rows.map((r) => ({
      date: r.date,
      count: Number(r.count),
      allow: Number(r.allow),
      deny: Number(r.deny),
    })),
    deprecatedCount: Number(deprecatedRes.rows[0]?.count ?? 0),
  };

  statsCache.set(cacheKey, { at: Date.now(), data });
  return data;
}
