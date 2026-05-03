import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getUserId } from "../utils/routeHelpers.js";
import {
  listEntries,
  listEntriesForExport,
  type EntryFilters,
} from "../services/entriesService.js";

const router = Router();

router.use(authMiddleware);

function readFilters(req: any): EntryFilters {
  return {
    model: req.query.model as string | undefined,
    source: req.query.source as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  };
}

router.get("/", async (req, res) => {
  const result = await listEntries(getUserId(req), {
    ...readFilters(req),
    page: Math.max(1, parseInt(req.query.page as string) || 1),
    limit: 50,
  });
  res.json(result);
});

router.get("/export", async (req, res) => {
  const rows = await listEntriesForExport(getUserId(req), readFilters(req));

  const headers = [
    "timestamp", "source", "model", "input_tokens", "output_tokens",
    "cache_read", "cache_write", "total_tokens", "cost_usd",
    "session_id", "session_name", "conversation_url",
  ];
  const csvRows = [headers.join(",")];
  for (const row of rows) {
    csvRows.push(headers.map((h) => {
      const v = (row as any)[h];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(","));
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="entries-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.send(csvRows.join("\n"));
});

export default router;
