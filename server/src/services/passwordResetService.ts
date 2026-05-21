import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool, query } from "../config/database.js";
import { env } from "../config/env.js";
import { sendResetEmail } from "./emailService.js";

/**
 * Password reset flow (Wave 8 P0 fix).
 *
 * Anti-enum: createResetToken returns null silently when email not found.
 * The route always responds 200 to /forgot so attackers can't probe email DB.
 *
 * Token: 48-char hex (crypto.randomBytes(24).toString('hex')) — 192 bits of
 * entropy. expires_at enforced at SQL level on consumeResetToken.
 *
 * Email transport: sendResetLink calls sendResetEmail (Brevo SMTP via
 * nodemailer). Falls back to console log of the URL if SMTP_* env vars
 * are missing — keeps dev mode working without credentials.
 */

const TOKEN_TTL_HOURS = 1;
const CLEANUP_AGE_DAYS = 7;

// Wave 4 A1 P1: per-email throttle independente do rate-limit-por-IP.
// IPs rotativos podem furar o limit por IP (3/h em rateLimit.ts). Sem cap
// por user_id, atacante mantém /forgot pra mesmo email infinitamente,
// gerando rows em password_resets + custo SMTP. Limita a MAX_RESETS_PER_HOUR
// tokens válidos (não usados, não expirados, criados na última hora) por user.
const MAX_RESETS_PER_HOUR = 3;

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

  // Wave 4 A1 P1: per-email throttle. Conta tokens ainda-válidos criados
  // na última hora pro mesmo user. Se >= MAX_RESETS_PER_HOUR, retorna null
  // silenciosamente — caller (auth.ts /forgot) já responde 200 genérico
  // sempre, anti-enum mantido. Atacante com IPs rotativos não consegue
  // multiplicar emails de reset, nem inflar password_resets, nem queimar SMTP.
  const throttleResult = await query(
    `SELECT COUNT(*)::int AS count
       FROM password_resets
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > now()
        AND created_at > now() - INTERVAL '1 hour'`,
    [userId],
  );
  if (throttleResult.rows[0].count >= MAX_RESETS_PER_HOUR) {
    return null;
  }

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
    const hash = await bcrypt.hash(newPassword, env.BCRYPT_COST);

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
 * sendResetLink — dispatch reset email via Brevo SMTP (nodemailer).
 *
 * If SMTP_* env vars are missing, emailService falls back to a console log
 * of the email envelope. In that case we ALSO log the raw link here so
 * Patrick can copy it manually for end-to-end testing without SMTP.
 */
export async function sendResetLink(
  email: string,
  token: string,
): Promise<void> {
  const baseUrl =
    process.env.APP_BASE_URL || `http://localhost:${env.PORT}`;
  const link = `${baseUrl}/?token=${token}`;

  const result = await sendResetEmail(email, link);

  if (result.via === "console") {
    // Fallback (dev): preserve old log so Patrick can copy the link manually.
    console.log("\n========== PASSWORD RESET LINK (fallback console) ==========");
    console.log(`Email: ${email}`);
    console.log(`Link:  ${link}`);
    console.log(
      `Valido por ${TOKEN_TTL_HOURS} hora${TOKEN_TTL_HOURS > 1 ? "s" : ""}`,
    );
    console.log("=============================================================\n");
  }
}
