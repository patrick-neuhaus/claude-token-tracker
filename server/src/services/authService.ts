import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, query } from "../config/database.js";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/index.js";

export class BootstrapEmailMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapEmailMismatchError";
  }
}

export async function registerUser(email: string, password: string, displayName?: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Advisory lock (xact-scoped) to serialize first-user race without blocking
    // the whole users table. Namespace 42 = register flow. Released on COMMIT/ROLLBACK.
    await client.query("SELECT pg_advisory_xact_lock(42)");
    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM users"
    );
    const isFirst = countResult.rows[0].count === 0;

    // SECURITY: bootstrap super_admin gate (trident Area 1 P0-2).
    // First user to /register becomes super_admin. Without the env var gate,
    // any attacker beating Patrick to the endpoint on a fresh deploy gets it.
    let role: "super_admin" | "pending";
    if (isFirst) {
      const bootstrapEmail = env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
      if (bootstrapEmail) {
        if (email.toLowerCase() !== bootstrapEmail.toLowerCase()) {
          await client.query("ROLLBACK");
          throw new BootstrapEmailMismatchError(
            "First user must match BOOTSTRAP_SUPER_ADMIN_EMAIL"
          );
        }
        role = "super_admin";
      } else {
        console.warn(
          "[BOOTSTRAP] First user got super_admin without BOOTSTRAP_SUPER_ADMIN_EMAIL gate. UNSAFE in public deploys."
        );
        role = "super_admin";
      }
    } else {
      role = "pending";
    }

    const hash = await bcrypt.hash(password, env.BCRYPT_COST);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, webhook_token, created_at`,
      [email, hash, displayName || null]
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO user_settings (user_id, role) VALUES ($1, $2)`,
      [user.id, role]
    );

    await client.query("COMMIT");

    if (role !== "pending") {
      const token = signToken({ userId: user.id, email: user.email, role });
      return { user: { ...user, role }, token, status: "active" as const };
    }

    return { user: { ...user, role }, token: null, status: "pending" as const };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function loginUser(email: string, password: string) {
  const userResult = await query(
    "SELECT id, email, password_hash, display_name, webhook_token FROM users WHERE email = $1",
    [email]
  );
  if (userResult.rows.length === 0) {
    return null;
  }
  const user = userResult.rows[0];

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const settingsResult = await query(
    "SELECT role FROM user_settings WHERE user_id = $1",
    [user.id]
  );
  const role = settingsResult.rows[0]?.role || "pending";

  if (role === "pending") {
    return { status: "pending" as const, user: null, token: null };
  }

  const token = signToken({ userId: user.id, email: user.email, role });
  return {
    status: "active" as const,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      webhook_token: user.webhook_token,
      role,
    },
    token,
  };
}

export async function getMe(userId: string) {
  const result = await query(
    `SELECT u.id, u.email, u.display_name, u.webhook_token, u.created_at,
            us.role, us.brl_rate, us.plan_cost_usd,
            us.daily_budget_usd, us.session_budget_usd,
            us.plan_start_date, us.weekly_reset_dow, us.weekly_reset_hour
     FROM users u
     JOIN user_settings us ON us.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

function signToken(payload: AuthUser): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}
