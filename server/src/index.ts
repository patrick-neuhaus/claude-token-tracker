import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: ["http://localhost:3001", "http://localhost:3002", "http://localhost:5173"] }));
app.use(express.json({ limit: "16kb" }));

// Migrations idempotentes
const { pool } = await import("./config/database.js");
await pool.query(`
  ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS daily_budget_usd NUMERIC(10,4),
    ADD COLUMN IF NOT EXISTS session_budget_usd NUMERIC(10,4),
    ADD COLUMN IF NOT EXISTS plan_start_date DATE,
    ADD COLUMN IF NOT EXISTS weekly_reset_dow INT DEFAULT 2,
    ADD COLUMN IF NOT EXISTS weekly_reset_hour INT DEFAULT 15
`);
await pool.query(`
  ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS session_name TEXT
`);

// Mount API routes
const routeMap = [
  ["/api/auth", "./routes/auth.js"],
  ["/api/webhook", "./routes/webhook.js"],
  ["/api/dashboard", "./routes/dashboard.js"],
  ["/api/sessions", "./routes/sessions.js"],
  ["/api/entries", "./routes/entries.js"],
  ["/api/settings", "./routes/settings.js"],
  ["/api/projects", "./routes/projects.js"],
  ["/api/admin", "./routes/admin.js"],
  ["/api/import", "./routes/import.js"],
  ["/api/analytics", "./routes/analytics.js"],
  ["/api/skills", "./routes/skills.js"],
  ["/api/system-prompts", "./routes/systemPrompts.js"],
] as const;

for (const [prefix, modulePath] of routeMap) {
  const mod = await import(modulePath);
  app.use(prefix, mod.default);
}

// Serve static frontend in production
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Error handler
const { errorHandler } = await import("./middleware/errorHandler.js");
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
