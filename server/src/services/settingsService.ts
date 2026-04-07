import { query } from "../config/database.js";

export async function getSettings(userId: string) {
  const result = await query(
    `SELECT us.role, us.brl_rate, us.plan_cost_usd, us.daily_budget_usd, us.session_budget_usd, us.updated_at,
            u.webhook_token
     FROM user_settings us
     JOIN users u ON u.id = us.user_id
     WHERE us.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function updateSettings(
  userId: string,
  updates: { brl_rate?: number; plan_cost_usd?: number; daily_budget_usd?: number | null; session_budget_usd?: number | null }
) {
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 2;

  if (updates.brl_rate !== undefined) {
    sets.push(`brl_rate = $${idx++}`);
    vals.push(updates.brl_rate);
  }
  if (updates.plan_cost_usd !== undefined) {
    sets.push(`plan_cost_usd = $${idx++}`);
    vals.push(updates.plan_cost_usd);
  }
  if ("daily_budget_usd" in updates) {
    sets.push(`daily_budget_usd = $${idx++}`);
    vals.push(updates.daily_budget_usd ?? null);
  }
  if ("session_budget_usd" in updates) {
    sets.push(`session_budget_usd = $${idx++}`);
    vals.push(updates.session_budget_usd ?? null);
  }

  if (sets.length === 0) return null;

  sets.push(`updated_at = now()`);

  const result = await query(
    `UPDATE user_settings SET ${sets.join(", ")} WHERE user_id = $1
     RETURNING role, brl_rate, plan_cost_usd, daily_budget_usd, session_budget_usd, updated_at`,
    [userId, ...vals]
  );
  return result.rows[0];
}

export async function listUsers() {
  const result = await query(
    `SELECT u.id, u.email, u.display_name, u.created_at,
            us.role
     FROM users u
     JOIN user_settings us ON us.user_id = u.id
     ORDER BY u.created_at`
  );
  return result.rows;
}

export async function updateUserRole(targetUserId: string, role: string) {
  const result = await query(
    `UPDATE user_settings SET role = $2, updated_at = now()
     WHERE user_id = $1
     RETURNING user_id, role`,
    [targetUserId, role]
  );
  return result.rows[0] || null;
}
