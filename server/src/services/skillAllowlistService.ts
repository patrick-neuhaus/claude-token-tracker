import { query } from "../config/database.js";

export type AllowlistStatus = "active" | "deprecated";

export interface AllowlistEntry {
  skill_name: string;
  status: AllowlistStatus;
  notes: string | null;
  updated_at: string;
}

export interface AllowlistStatusOnly {
  status: AllowlistStatus;
  notes: string | null;
}

/** Lookup a single skill. Returns null if not in allowlist. */
export async function getStatus(
  skill_name: string
): Promise<AllowlistStatusOnly | null> {
  const name = skill_name?.trim();
  if (!name) return null;

  const result = await query<{ status: AllowlistStatus; notes: string | null }>(
    `SELECT status, notes FROM skill_allowlist WHERE skill_name = $1`,
    [name]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { status: row.status, notes: row.notes };
}

/**
 * Upsert allowlist entry. status must be 'active' or 'deprecated'.
 * notes is optional (null preserves any prior value? — no, we overwrite to keep PATCH semantics simple).
 */
export async function setStatus(
  skill_name: string,
  status: AllowlistStatus,
  notes?: string | null
): Promise<AllowlistEntry> {
  const name = skill_name?.trim();
  if (!name) throw new Error("skill_name is required");
  if (status !== "active" && status !== "deprecated") {
    throw new Error("status must be 'active' or 'deprecated'");
  }

  const result = await query<{
    skill_name: string;
    status: AllowlistStatus;
    notes: string | null;
    updated_at: Date;
  }>(
    `INSERT INTO skill_allowlist (skill_name, status, notes, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (skill_name) DO UPDATE
       SET status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           updated_at = now()
     RETURNING skill_name, status, notes, updated_at`,
    [name, status, notes ?? null]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to upsert skill allowlist entry");
  return {
    skill_name: row.skill_name,
    status: row.status,
    notes: row.notes,
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Return all skill statuses as a Map<skill_name, status>.
 * Used by skillsService.listSkills() to enrich the response.
 * Cached via TTL by the caller (skillsService cache).
 */
export async function getAllStatuses(): Promise<Map<string, AllowlistStatus>> {
  const result = await query<{ skill_name: string; status: AllowlistStatus }>(
    `SELECT skill_name, status FROM skill_allowlist`
  );
  const map = new Map<string, AllowlistStatus>();
  for (const row of result.rows) {
    map.set(row.skill_name, row.status);
  }
  return map;
}

/** Full table dump for the admin allowlist UI. Sorted by skill_name. */
export async function listAll(): Promise<AllowlistEntry[]> {
  const result = await query<{
    skill_name: string;
    status: AllowlistStatus;
    notes: string | null;
    updated_at: Date;
  }>(
    `SELECT skill_name, status, notes, updated_at
     FROM skill_allowlist
     ORDER BY skill_name ASC`
  );

  return result.rows.map((r) => ({
    skill_name: r.skill_name,
    status: r.status,
    notes: r.notes,
    updated_at: r.updated_at.toISOString(),
  }));
}
