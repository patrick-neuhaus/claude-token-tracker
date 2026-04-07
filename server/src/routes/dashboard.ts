import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { parsePeriod, getSummary, getCharts, type DashboardFilters } from "../services/dashboardService.js";
import type { AuthRequest } from "../types/index.js";
import { getSettings } from "../services/settingsService.js";

const router = Router();

router.use(authMiddleware);

function extractFilters(req: any): DashboardFilters {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const period = parsePeriod(req.query.period as string | undefined, from, to);
  const filters: DashboardFilters = { period };
  if (req.query.model) filters.model = req.query.model as string;
  if (req.query.source) filters.source = req.query.source as string;
  if (req.query.project_id) filters.project_id = req.query.project_id as string;
  return filters;
}

router.get("/summary", async (req, res) => {
  const authReq = req as AuthRequest;
  const filters = extractFilters(req);
  const [summary, settings] = await Promise.all([
    getSummary(authReq.user!.userId, filters),
    getSettings(authReq.user!.userId),
  ]);
  res.json({ ...summary, settings });
});

router.get("/charts", async (req, res) => {
  const authReq = req as AuthRequest;
  const filters = extractFilters(req);
  const charts = await getCharts(authReq.user!.userId, filters);
  res.json(charts);
});

export default router;
