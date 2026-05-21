import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read version from server/package.json once at import time. Falls back to
// "unknown" if file missing/malformed — never crash boot just for /health.
let cachedVersion = "unknown";
try {
  // From dist/routes/ to server/package.json: up 2 dirs.
  // From src/routes/ (dev tsx) to server/package.json: up 2 dirs.
  const pkgPath = path.resolve(__dirname, "../../package.json");
  const pkgRaw = fs.readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(pkgRaw) as { version?: string };
  if (typeof pkg.version === "string") cachedVersion = pkg.version;
} catch {
  // swallow — version stays "unknown"
}

// Health endpoint. NO auth, NO rate limit — monitoring tools/uptime checks
// need free access. Returns 200 when DB reachable, 503 when DB down.
router.get("/", async (_req, res) => {
  const start = Date.now();
  let dbStatus: "ok" | "error" = "ok";
  let dbLatency = 0;
  let dbError: string | undefined;

  try {
    await pool.query("SELECT 1");
    dbLatency = Date.now() - start;
  } catch (err) {
    dbStatus = "error";
    dbError = err instanceof Error ? err.message : String(err);
    dbLatency = Date.now() - start;
  }

  const ok = dbStatus === "ok";
  const body: Record<string, unknown> = {
    ok,
    uptime_seconds: Math.floor(process.uptime()),
    db: dbError
      ? { status: dbStatus, latency_ms: dbLatency, error: dbError }
      : { status: dbStatus, latency_ms: dbLatency },
    version: cachedVersion,
    timestamp: new Date().toISOString(),
  };

  res.status(ok ? 200 : 503).json(body);
});

export default router;
