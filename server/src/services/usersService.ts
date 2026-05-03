import { query } from "../config/database.js";

/** Returns the user's role (`super_admin`, `admin`, `user`, `pending`) or null if not found. */
export async function getUserRole(userId: string): Promise<string | null> {
  const result = await query(
    "SELECT role FROM user_settings WHERE user_id = $1",
    [userId],
  );
  return result.rows[0]?.role ?? null;
}

/** True when the target user is super_admin (immutable role — cannot be demoted). */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return (await getUserRole(userId)) === "super_admin";
}
