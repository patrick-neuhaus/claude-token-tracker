import { Router } from "express";
import { z } from "zod";
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

// Onda 6 A1 P1: cap em custom_name. Sem isso, payload aceitava empty string,
// megabyte, XSS payload. Min 1 (não-vazio), max 100, trim em whitespace.
const renameSchema = z.object({
  custom_name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name max 100 chars"),
});

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
  // Onda 5 A1 P2: paginated. Default 1000, hard cap 5000 (enforced no service).
  const limit = parseInt(req.query.limit as string) || 1000;
  const offset = parseInt(req.query.offset as string) || 0;
  const result = await getSessionEntries(
    getUserId(req),
    req.params.id,
    limit,
    offset,
  );
  res.setHeader("X-Total-Count", String(result.total));
  res.json(result.rows);
});

router.patch("/:id", async (req, res) => {
  const parsed = renameSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ status: "error", message: firstIssue?.message ?? "Invalid input" });
    return;
  }
  const updated = await renameSession(getUserId(req), req.params.id, parsed.data.custom_name);
  if (!updated) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }
  res.json(updated);
});

export default router;
