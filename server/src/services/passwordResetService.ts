import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool, query } from "../config/database.js";
import { env } from "../config/env.js";

/**
 * Password reset flow (Wave 8 P0 fix).
 *
 * Anti-enum: createResetToken returns null silently when email not found.
 * The route always responds 200 to /forgot so attackers can't probe email DB.
 *
 * Token: 48-char hex (crypto.randomBytes(24).toString('hex')) — 192 bits of
 * entropy. expires_at enforced at SQL level on consumeResetToken.
 *
 * Local email transport: sendResetLink logs the URL to stdout. Future:
 * swap to Resend/SendGrid call when RESEND_API_KEY is configured.
 */

const TOKEN_TTL_HOURS = 1;
const CLEANUP_AGE_DAYS = 7;

export interface ResetTokenRecord {
  token: string;
  expires_at: Date;
}

export async function createResetToken(
  email: string,
): Promise<ResetTokenRecord | null> {
  const userResult = await query(
    "SELECT id FROM users WHERE email = $1",
    [email],
  );
  if (userResult.rows.length === 0) {
    return null;
  }
  const userId: string = userResult.rows[0].id;

  const token = crypto.randomBytes(24).toString("hex");
  const expires_at = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await query(
    `INSERT INTO password_resets (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expires_at],
  );

  return { token, expires_at };
}

export async function consumeResetToken(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const resetResult = await client.query(
      `SELECT id, user_id
         FROM password_resets
        WHERE token = $1
          AND used_at IS NULL
          AND expires_at > now()
        FOR UPDATE`,
      [token],
    );
    if (resetResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "Token inválido ou expirado" };
    }

    const { id: resetId, user_id: userId } = resetResult.rows[0];
    const hash = await bcrypt.hash(newPassword, 12);

    await client.query(
      "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [hash, userId],
    );
    await client.query(
      "UPDATE password_resets SET used_at = now() WHERE id = $1",
      [resetId],
    );

    await client.query("COMMIT");
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function cleanupExpired(): Promise<number> {
  const result = await query(
    `DELETE FROM password_resets
      WHERE expires_at < now() - ($1 || ' days')::interval`,
    [String(CLEANUP_AGE_DAYS)],
  );
  return result.rowCount ?? 0;
}

/**
 * sendResetLink — local workaround. Logs the link to stdout so Patrick can
 * copy it manually for end-to-end testing. When RESEND_API_KEY is wired,
 * swap the console.log for an actual API call.
 */
export function sendResetLink(email: string, token: string): void {
  const baseUrl =
    process.env.APP_BASE_URL || `http://localhost:${env.PORT}`;
  const link = `${baseUrl}/?token=${token}`;
  console.log("\n========== PASSWORD RESET LINK ==========");
  console.log(`Email: ${email}`);
  console.log(`Link:  ${link}`);
  console.log(`Valido por ${TOKEN_TTL_HOURS} hora${TOKEN_TTL_HOURS > 1 ? "s" : ""}`);
  console.log("==========================================\n");
  // Future: Resend.emails.send({ to: email, ... })
}
