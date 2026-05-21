import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || "10", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  application_name: "token-tracker-server",
});

// Onda 5 A2 P1-4: handle idle client errors. Sem isso, idle client error
// (TCP keepalive expirou, DB restart, etc) vira unhandled rejection → SIGTERM.
pool.on("error", (err) => {
  console.error("[pg pool] idle client error:", err.message);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
