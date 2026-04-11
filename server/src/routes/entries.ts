import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/database.js";
import { getUserId } from "../utils/routeHelpers.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = ["e.user_id = $1"];
  const params: any[] = [userId];
  let idx = 2;

  if (req.query.model) {
    conditions.push(`e.model ILIKE $${idx++}`);
    params.push(`%${req.query.model}%`);
  }
  if (req.query.source) {
    conditions.push(`e.source = $${idx++}`);
    params.push(req.query.source);
  }
  if (req.query.from) {
    conditions.push(`e.timestamp >= $${idx++}`);
    params.push(req.query.from);
  }
  if (req.query.to) {
    conditions.push(`e.timestamp <= $${idx++}`);
    params.push(req.query.to);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const [rows, countResult] = await Promise.all([
    query(
      `SELECT e.id, e.timestamp, e.source, e.model, e.input_tokens, e.output_tokens,
              e.cache_read, e.cache_write, e.total_tokens, e.cost_usd::float,
              e.session_id, e.conversation_url,
              s.custom_name AS session_name, s.id AS session_db_id
       FROM token_entries e
       LEFT JOIN sessions s ON s.session_id = e.session_id AND s.user_id = e.user_id
       ${where}
       ORDER BY e.timestamp DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*)::int AS total FROM token_entries e ${where}`, params),
  ]);

  res.json({
    entries: rows.rows,
    total: countResult.rows[0].total,
    page,
    pages: Math.ceil(countResult.rows[0].total / limit),
  });
});

router.get("/export", async (req, res) => {
  const conditions: string[] = ["e.user_id = $1"];
  const params: any[] = [getUserId(req)];
  let idx = 2;

  if (req.query.model) { conditions.push(`e.model ILIKE $${idx++}`); params.push(`%${req.query.model}%`); }
  if (req.query.source) { conditions.push(`e.source = $${idx++}`); params.push(req.query.source); }
  if (req.query.from) { conditions.push(`e.timestamp >= $${idx++}`); params.push(req.query.from); }
  if (req.query.to) { conditions.push(`e.timestamp <= $${idx++}`); params.push(req.query.to); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = await query(
    `SELECT e.timestamp, e.source, e.model, e.input_tokens, e.output_tokens,
            e.cache_read, e.cache_write, e.total_tokens, e.cost_usd::float,
            e.session_id, s.custom_name AS session_name, e.conversation_url
     FROM token_entries e
     LEFT JOIN sessions s ON s.session_id = e.session_id AND s.user_id = e.user_id
     ${where}
     ORDER BY e.timestamp DESC
     LIMIT 50000`,
    params
  );

  const headers = ["timestamp", "source", "model", "input_tokens", "output_tokens", "cache_read", "cache_write", "total_tokens", "cost_usd", "session_id", "session_name", "conversation_url"];
  const csvRows = [headers.join(",")];
  for (const row of rows.rows) {
    csvRows.push(headers.map((h) => {
      const v = (row as any)[h];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="entries-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvRows.join("\n"));
});

export default router;
