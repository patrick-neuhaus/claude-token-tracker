import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getUserId } from "../utils/routeHelpers.js";
import {
  listEntries,
  listEntriesForExport,
  type EntryFilters,
} from "../services/entriesService.js";
import { serializeEntriesToCsv } from "../utils/csvExporter.js";

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
  const csv = serializeEntriesToCsv(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="entries-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.send(csv);
});

export default router;
