import { Router } from "express";
import { z } from "zod";
import { registerUser, loginUser, getMe } from "../services/authService.js";
import {
  createResetToken,
  consumeResetToken,
  sendResetLink,
} from "../services/passwordResetService.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { maskEmail, describeError } from "../utils/security.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
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
  password: z.string().min(8),
});

router.post("/register", async (req, res) => {
  console.log("[AUTH] Register attempt:", maskEmail(req.body?.email));
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", message: parsed.error.issues[0].message });
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
      res.status(201).json({
        status: "active",
        token: result.token,
        user: result.user,
      });
    }
  } catch (err: unknown) {
    console.error("[REGISTER ERROR]", describeError(err));
    if ((err as { code?: string })?.code === "23505") {
      res.status(409).json({ status: "error", message: "Email already registered" });
      return;
    }
    res.status(500).json({ status: "error", message: "internal error" });
  }
});

router.post("/login", async (req, res) => {
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

  res.json({ status: "active", token: result.token, user: result.user });
});

// Password reset flow (Wave 8 P0 fix).
// /forgot — always returns 200 (anti-enum). createResetToken returns null if
// email not registered; we still respond with the generic success message.
router.post(
  "/forgot",
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
  asyncHandler(async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message =
        issue.path[0] === "password"
          ? "Senha precisa de no minimo 8 caracteres"
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
  const { getUserId } = await import("../utils/routeHelpers.js");
  const user = await getMe(getUserId(req));
  if (!user) {
    res.status(404).json({ status: "error", message: "User not found" });
    return;
  }
  res.json(user);
});

export default router;
