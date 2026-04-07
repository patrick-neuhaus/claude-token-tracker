import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getSettings, updateSettings } from "../services/settingsService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const authReq = req as AuthRequest;
  const settings = await getSettings(authReq.user!.userId);
  if (!settings) {
    res.status(404).json({ status: "error", message: "Settings not found" });
    return;
  }
  res.json(settings);
});

router.patch("/", async (req, res) => {
  const authReq = req as AuthRequest;
  const { brl_rate, plan_cost_usd } = req.body;

  const updates: Record<string, number> = {};
  if (brl_rate !== undefined) {
    const n = Number(brl_rate);
    if (!Number.isFinite(n) || n <= 0) {
      res.status(400).json({ status: "error", message: "brl_rate must be a positive number" });
      return;
    }
    updates.brl_rate = n;
  }
  if (plan_cost_usd !== undefined) {
    const n = Number(plan_cost_usd);
    if (!Number.isFinite(n) || n < 0) {
      res.status(400).json({ status: "error", message: "plan_cost_usd must be a non-negative number" });
      return;
    }
    updates.plan_cost_usd = n;
  }

  const result = await updateSettings(authReq.user!.userId, updates);
  if (!result) {
    res.status(400).json({ status: "error", message: "No fields to update" });
    return;
  }

  res.json(result);
});

export default router;
