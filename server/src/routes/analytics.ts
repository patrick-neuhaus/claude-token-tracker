import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getAnalytics, getProjectComparison, getAchievements } from "../services/analyticsService.js";
import { getUserId, getDateRange } from "../utils/routeHelpers.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { from, to } = getDateRange(req);
  const data = await getAnalytics(getUserId(req), from, to);
  res.json(data);
});

router.get("/achievements", async (req, res) => {
  const data = await getAchievements(getUserId(req));
  res.json(data);
});

router.get("/compare", async (req, res) => {
  const { from, to } = getDateRange(req);
  const projectIds = ((req.query.projects as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const data = await getProjectComparison(getUserId(req), projectIds, from, to);
  res.json(data);
});

export default router;
