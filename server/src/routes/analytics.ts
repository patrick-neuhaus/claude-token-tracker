import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getAnalytics, getProjectComparison, getAchievements } from "../services/analyticsService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const authReq = req as AuthRequest;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const data = await getAnalytics(authReq.user!.userId, from, to);
  res.json(data);
});

router.get("/achievements", async (req, res) => {
  const authReq = req as AuthRequest;
  const data = await getAchievements(authReq.user!.userId);
  res.json(data);
});

router.get("/compare", async (req, res) => {
  const authReq = req as AuthRequest;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const projectIds = ((req.query.projects as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const data = await getProjectComparison(authReq.user!.userId, projectIds, from, to);
  res.json(data);
});

export default router;
