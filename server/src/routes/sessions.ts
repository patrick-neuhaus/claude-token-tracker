import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/database.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

router.use(authMiddleware);

const ALLOWED_SORT = ["last_seen", "first_seen", "total_cost_usd", "entry_count"] as const;
type SortCol = typeof ALLOWED_SORT[number];

router.get("/", async (req, res) => {
  const authReq = req as AuthRequest;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";
  const rawSort = req.query.sort_by as string;
  const sortBy: SortCol = ALLOWED_SORT.includes(rawSort as SortCol) ? (rawSort as SortCol) : "last_seen";
  const sortDir = req.query.sort_dir === "asc" ? "ASC" : "DESC";
  const projectId = req.query.project_id as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  let where = "WHERE s.user_id = $1";
  const params: any[] = [authReq.user!.userId];

  if (search) {
    where += ` AND (s.custom_name ILIKE $${params.length + 1} OR s.session_id ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }
  if (projectId) {
    where += ` AND s.project_id = $${params.length + 1}::uuid`;
    params.push(projectId);
  }
  if (from) {
    where += ` AND s.last_seen >= $${params.length + 1}`;
    params.push(from);
  }
  if (to) {
    where += ` AND s.last_seen <= $${params.length + 1}`;
    params.push(to);
  }

  const [rows, countResult] = await Promise.all([
    query(
      `SELECT s.id, s.session_id, s.custom_name, s.source, s.first_seen, s.last_seen,
              s.total_cost_usd::float, s.total_input, s.total_output, s.entry_count,
              s.project_id, p.name AS project_name
       FROM sessions s
       LEFT JOIN projects p ON p.id = s.project_id
       ${where}
       ORDER BY s.${sortBy} ${sortDir}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*)::int AS total FROM sessions s ${where}`, params),
  ]);

  res.json({
    sessions: rows.rows,
    total: countResult.rows[0].total,
    page,
    pages: Math.ceil(countResult.rows[0].total / limit),
  });
});

router.get("/:id/entries", async (req, res) => {
  const authReq = req as AuthRequest;
  const result = await query(
    `SELECT id, timestamp, source, model, input_tokens, output_tokens,
            cache_read, cache_write, total_tokens, cost_usd::float, conversation_url
     FROM token_entries
     WHERE user_id = $1 AND session_id = (
       SELECT session_id FROM sessions WHERE id = $2 AND user_id = $1
     )
     ORDER BY timestamp DESC`,
    [authReq.user!.userId, req.params.id]
  );
  res.json(result.rows);
});

router.patch("/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const { custom_name } = req.body;
  if (typeof custom_name !== "string") {
    res.status(400).json({ status: "error", message: "custom_name required" });
    return;
  }

  const result = await query(
    `UPDATE sessions SET custom_name = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, session_id, custom_name`,
    [req.params.id, authReq.user!.userId, custom_name]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }

  res.json(result.rows[0]);
});

export default router;
