import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getSummary, getCharts, type DashboardFilters } from "../services/dashboardService.js";
import { getUserId, getDateRange, parsePeriod } from "../utils/routeHelpers.js";
import { getSettings } from "../services/settingsService.js";

const router = Router();

router.use(authMiddleware);

function extractFilters(req: any): DashboardFilters {
  const { from, to } = getDateRange(req);
  const period = parsePeriod(req.query.period as string | undefined, from, to);
  const filters: DashboardFilters = { period };
  if (req.query.model) filters.model = req.query.model as string;
  if (req.query.source) filters.source = req.query.source as string;
  if (req.query.project_id) filters.project_id = req.query.project_id as string;
  return filters;
}

router.get("/summary", async (req, res) => {
  const userId = getUserId(req);
  const filters = extractFilters(req);
  const [summary, settings] = await Promise.all([
    getSummary(userId, filters),
    getSettings(userId),
  ]);
  res.json({ ...summary, settings });
});

router.get("/charts", async (req, res) => {
  const filters = extractFilters(req);
  const charts = await getCharts(getUserId(req), filters);
  res.json(charts);
});

export default router;
