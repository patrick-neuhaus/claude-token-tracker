import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getSettings, updateSettings } from "../services/settingsService.js";
import { getUserId } from "../utils/routeHelpers.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const settings = await getSettings(getUserId(req));
  if (!settings) {
    res.status(404).json({ status: "error", message: "Settings not found" });
    return;
  }
  res.json(settings);
});

router.patch("/", async (req, res) => {
  const {
    brl_rate, plan_cost_usd,
    daily_budget_usd, session_budget_usd,
    plan_start_date, weekly_reset_dow, weekly_reset_hour,
  } = req.body;

  const updates: {
    brl_rate?: number;
    plan_cost_usd?: number;
    daily_budget_usd?: number | null;
    session_budget_usd?: number | null;
    plan_start_date?: string | null;
    weekly_reset_dow?: number;
    weekly_reset_hour?: number;
  } = {};

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

  // Nullable budgets — null clears, number sets
  if (daily_budget_usd !== undefined) {
    if (daily_budget_usd === null || daily_budget_usd === "") {
      updates.daily_budget_usd = null;
    } else {
      const n = Number(daily_budget_usd);
      if (!Number.isFinite(n) || n < 0) {
        res.status(400).json({ status: "error", message: "daily_budget_usd must be non-negative or null" });
        return;
      }
      updates.daily_budget_usd = n;
    }
  }

  if (session_budget_usd !== undefined) {
    if (session_budget_usd === null || session_budget_usd === "") {
      updates.session_budget_usd = null;
    } else {
      const n = Number(session_budget_usd);
      if (!Number.isFinite(n) || n < 0) {
        res.status(400).json({ status: "error", message: "session_budget_usd must be non-negative or null" });
        return;
      }
      updates.session_budget_usd = n;
    }
  }

  if (plan_start_date !== undefined) {
    if (plan_start_date === null || plan_start_date === "") {
      updates.plan_start_date = null;
    } else if (typeof plan_start_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(plan_start_date)) {
      updates.plan_start_date = plan_start_date.slice(0, 10);
    } else {
      res.status(400).json({ status: "error", message: "plan_start_date must be YYYY-MM-DD or null" });
      return;
    }
  }

  if (weekly_reset_dow !== undefined) {
    const n = Number(weekly_reset_dow);
    if (!Number.isInteger(n) || n < 0 || n > 6) {
      res.status(400).json({ status: "error", message: "weekly_reset_dow must be 0-6" });
      return;
    }
    updates.weekly_reset_dow = n;
  }

  if (weekly_reset_hour !== undefined) {
    const n = Number(weekly_reset_hour);
    if (!Number.isInteger(n) || n < 0 || n > 23) {
      res.status(400).json({ status: "error", message: "weekly_reset_hour must be 0-23" });
      return;
    }
    updates.weekly_reset_hour = n;
  }

  const result = await updateSettings(getUserId(req), updates);
  if (!result) {
    res.status(400).json({ status: "error", message: "No fields to update" });
    return;
  }

  res.json(result);
});

export default router;
