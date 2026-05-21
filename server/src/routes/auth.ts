import { Router, type CookieOptions } from "express";
import { z } from "zod";
import crypto from "crypto";
import {
  registerUser,
  loginUser,
  getMe,
  setOnboardingCompleted,
  BootstrapEmailMismatchError,
} from "../services/authService.js";
import {
  createResetToken,
  consumeResetToken,
  sendResetLink,
} from "../services/passwordResetService.js";
import { authMiddleware } from "../middleware/auth.js";
import { csrfProtection } from "../middleware/csrf.js";
import { authLimiter, forgotPasswordLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { maskEmail, describeError } from "../utils/security.js";
import { query } from "../config/database.js";
import { getUserId } from "../utils/routeHelpers.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

/**
 * SECURITY (Fase A A1): cookie config pra auth_token.
 * - httpOnly: JS no client não consegue ler (mitiga XSS exfil).
 * - signed: cookie-parser valida assinatura via JWT_SECRET (mitiga tamper).
 * - secure: somente HTTPS em prod (dev mantém HTTP via NODE_ENV check).
 * - sameSite "lax": permite top-level navigation (clicar em link auth)
 *   mas bloqueia cross-site POST/PUT/DELETE (CSRF baseline).
 * - maxAge 7d: alinhado com JWT expiry default (env.JWT_EXPIRES_IN).
 */
const AUTH_COOKIE_NAME = "auth_token";
const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  signed: true,
  path: "/",
};

// SECURITY: password policy (trident Area 1 P0-2).
// Enforce 12+ chars + uppercase + lowercase + digit to block weak passwords
// like "12345678". Applied to /register and /reset.
const passwordPolicy = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[a-z]/, "Password must contain lowercase letter")
  .regex(/\d/, "Password must contain digit");

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordPolicy,
  display_name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: passwordPolicy,
});

router.post("/register", authLimiter, async (req, res) => {
  console.log("[AUTH] Register attempt:", maskEmail(req.body?.email));
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ status: "error", message: firstIssue?.message ?? "Invalid input" });
    return;
  }

  try {
    const result = await registerUser(parsed.data.email, parsed.data.password, parsed.data.display_name);
    if (result.status === "pending") {
      res.status(201).json({
        status: "pending",
        message: "Account created. Waiting for admin approval.",
      });
    } else {
      // SECURITY (Fase A A1): set httpOnly cookie, omit token from response body.
      // Client lê user data direto do response + chama /api/auth/csrf-token
      // pra fazer próxima request state-changing.
      res.cookie(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS);
      res.status(201).json({
        status: "active",
        user: result.user,
      });
    }
  } catch (err: unknown) {
    console.error("[REGISTER ERROR]", describeError(err));
    if (err instanceof BootstrapEmailMismatchError) {
      res.status(403).json({ status: "error", message: err.message });
      return;
    }
    if ((err as { code?: string })?.code === "23505") {
      res.status(409).json({ status: "error", message: "Email already registered" });
      return;
    }
    res.status(500).json({ status: "error", message: "internal error" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", message: "Invalid credentials" });
    return;
  }

  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result) {
    res.status(401).json({ status: "error", message: "Invalid email or password" });
    return;
  }

  if (result.status === "pending") {
    res.status(403).json({
      status: "pending",
      message: "Account pending approval.",
    });
    return;
  }

  // SECURITY (Fase A A1): set httpOnly cookie, omit token from response body.
  res.cookie(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS);
  res.json({ status: "active", user: result.user });
});

/**
 * SECURITY (Fase A A1): logout limpa cookie httpOnly server-side.
 * Sem isso, client-side localStorage clear não invalida o token (e cookie
 * httpOnly nem é acessível por JS). Endpoint passa pelo CSRF guard global
 * (não está em CSRF_SKIP_AUTH_PATHS) — POST com cookie auth válido + token CSRF.
 */
router.post("/logout", (req, res) => {
  // clearCookie precisa replicar httpOnly/secure/sameSite/path do set original
  // pra browser efetivamente limpar (specs HTTP cookies exigem match).
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.json({ status: "ok" });
});

/**
 * SECURITY (Fase A A1): /csrf-token endpoint.
 * csrfProtection middleware (1) gera ou reusa o cookie httpOnly _csrf
 * (token secret), (2) expõe req.csrfToken() pra retornar o token sincronizado
 * que o client envia em X-CSRF-Token header em próximos POST/PUT/PATCH/DELETE.
 *
 * Esse path está em CSRF_SKIP_AUTH_PATHS do guard global, então csurf é
 * aplicado AQUI per-route (GET idempotente — safe sem validar request anterior).
 */
router.get("/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Password reset flow (Wave 8 P0 fix).
// /forgot — always returns 200 (anti-enum). createResetToken returns null if
// email not registered; we still respond with the generic success message.
router.post(
  "/forgot",
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ status: "error", message: "Email obrigatorio" });
      return;
    }

    console.log("[AUTH] Forgot-password attempt:", maskEmail(parsed.data.email));

    try {
      const result = await createResetToken(parsed.data.email);
      if (result) {
        await sendResetLink(parsed.data.email, result.token);
      }
    } catch (err) {
      console.error("[FORGOT ERROR]", describeError(err));
      // Don't leak — still return generic success.
    }

    res.json({
      status: "ok",
      message: "Se o email estiver cadastrado, um link foi enviado.",
    });
  }),
);

// /reset — consume token + set new password.
router.post(
  "/reset",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message =
        issue?.path[0] === "password"
          ? issue.message
          : "Token e senha obrigatorios";
      res.status(400).json({ status: "error", message });
      return;
    }

    try {
      const result = await consumeResetToken(parsed.data.token, parsed.data.password);
      if (!result.ok) {
        res
          .status(400)
          .json({ status: "error", message: result.error ?? "Token invalido" });
        return;
      }
      res.json({
        status: "ok",
        message: "Senha redefinida com sucesso. Faca login.",
      });
    } catch (err) {
      console.error("[RESET ERROR]", describeError(err));
      res
        .status(500)
        .json({ status: "error", message: "internal error" });
    }
  }),
);

router.get("/me", authMiddleware, async (req, res) => {
  const user = await getMe(getUserId(req));
  if (!user) {
    res.status(404).json({ status: "error", message: "User not found" });
    return;
  }
  res.json(user);
});

/**
 * Worker RR: persist onboarding flag to user_settings. Body `{ completed: bool }`.
 * Default true (used by wizard "Já configurei" / "Pular"); false re-opens the
 * tour from Settings → "Refazer tour".
 */
const onboardingSchema = z.object({ completed: z.boolean().optional() });

router.patch(
  "/me/onboarding",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = onboardingSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ status: "error", message: "Invalid payload" });
      return;
    }
    const completed = parsed.data.completed ?? true;
    const row = await setOnboardingCompleted(getUserId(req), completed);
    if (!row) {
      res.status(404).json({ status: "error", message: "User not found" });
      return;
    }
    res.json({
      status: "ok",
      onboarding_completed: row.onboarding_completed,
      onboarding_completed_at: row.onboarding_completed_at,
    });
  }),
);

/**
 * Wave 1 hardening: rotate webhook token.
 * Returns the new plaintext token EXACTLY ONCE — client must store it.
 * Stored hashed in DB; plain column kept temporarily for UI Settings view.
 */
router.post(
  "/rotate-webhook-token",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = getUserId(req);
    const newToken = crypto.randomUUID();
    const newHash = crypto.createHash("sha256").update(newToken).digest("hex");

    // TODO Onda 10+: depois que UI Settings migrar pra exibir só preview hash truncado
    // (não o token plain inteiro), podemos NULLAR webhook_token plain aqui pra reduzir
    // exposição. Hash continua válido pra autenticação. Por ora mantém plain pra UI legacy.
    const result = await query(
      `UPDATE users
         SET webhook_token = $1::uuid,
             webhook_token_hash = $2,
             webhook_token_rotated_at = NOW()
       WHERE id = $3
       RETURNING webhook_token_rotated_at`,
      [newToken, newHash, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ status: "error", message: "User not found" });
      return;
    }

    res.json({
      status: "ok",
      webhook_token: newToken,
      rotated_at: result.rows[0].webhook_token_rotated_at,
      warning: "Store this token now — server will not return plaintext again.",
    });
  }),
);

export default router;
