import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getUserId, getDateRange } from "../utils/routeHelpers.js";
import {
  listSessions,
  getSessionDetail,
  getSessionEntries,
  renameSession,
  normalizeSortCol,
  normalizeSortDir,
} from "../services/sessionsService.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { from, to } = getDateRange(req);
  const result = await listSessions(getUserId(req), {
    page: Math.max(1, parseInt(req.query.page as string) || 1),
    limit: 50,
    search: (req.query.search as string) || "",
    projectId: req.query.project_id as string | undefined,
    from,
    to,
    sortBy: normalizeSortCol(req.query.sort_by),
    sortDir: normalizeSortDir(req.query.sort_dir),
  });
  res.json(result);
});

router.get("/:id/detail", async (req, res) => {
  const detail = await getSessionDetail(getUserId(req), req.params.id);
  if (!detail) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }
  res.json(detail);
});

router.get("/:id/entries", async (req, res) => {
  const rows = await getSessionEntries(getUserId(req), req.params.id);
  res.json(rows);
});

router.patch("/:id", async (req, res) => {
  const { custom_name } = req.body;
  if (typeof custom_name !== "string") {
    res.status(400).json({ status: "error", message: "custom_name required" });
    return;
  }
  const updated = await renameSession(getUserId(req), req.params.id, custom_name);
  if (!updated) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }
  res.json(updated);
});

export default router;
