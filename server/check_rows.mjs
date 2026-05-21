import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const r1 = await client.query(`
  SELECT COUNT(*)::int AS count, source
  FROM token_entries
  WHERE source = 'codex' AND cache_read > 0
  GROUP BY source
`);
console.log("Rows codex w/ cache_read > 0:", JSON.stringify(r1.rows));

const r2 = await client.query(`
  SELECT COUNT(*)::int AS count
  FROM token_entries
  WHERE source = 'codex' AND cache_read > 0 AND input_tokens > cache_read
`);
console.log("Rows that WILL be backfilled (input_tokens > cache_read):", JSON.stringify(r2.rows));

const r2b = await client.query(`
  SELECT COUNT(*)::int AS count
  FROM token_entries
  WHERE source = 'codex' AND cache_read > 0 AND input_tokens <= cache_read
`);
console.log("Rows skipped (input_tokens <= cache_read, would underflow):", JSON.stringify(r2b.rows));

const r3 = await client.query(`
  SELECT
    date_trunc('day', timestamp AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    SUM(cache_read)::bigint AS cache_sum,
    SUM(input_tokens)::bigint AS input_sum,
    ROUND((SUM(cache_read)::float / NULLIF(SUM(cache_read) + SUM(input_tokens), 0) * 100)::numeric, 1) AS hit_rate_current,
    ROUND((SUM(cache_read)::float / NULLIF(SUM(GREATEST(input_tokens, cache_read))::float, 0) * 100)::numeric, 1) AS hit_rate_after_normalize
  FROM token_entries
  WHERE source = 'codex'
  GROUP BY dia
  ORDER BY dia DESC
  LIMIT 7
`);
console.log("Hit rate BEFORE vs AFTER (last 7 days codex):");
console.log(JSON.stringify(r3.rows, null, 2));

await client.end();
