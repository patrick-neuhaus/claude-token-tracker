import { Router, json } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getUserId } from "../utils/routeHelpers.js";
import { pool } from "../config/database.js";
import { getEffectivePricing } from "../services/pricingOverrideService.js";
import type { ModelPricing } from "../config/pricing.js";

const router = Router();

router.use(authMiddleware);
router.use(json({ limit: "5mb" }));

// Onda 5 A1 P2: bounded import. 5MB CSV ~ 50k rows era N inserts sequenciais
// fora de transação = event loop bloqueado por minutos + partial state em
// failure. Cap 5000 + batch INSERT 500/batch dentro de transação.
const MAX_CSV_ROWS = 5000;
const INSERT_BATCH_SIZE = 500;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

interface ParsedRow {
  rowNum: number; // 1-based para erro msg (= line + 1 contando header)
  timestamp: string;
  source: "claude-code" | "claude.ai";
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  sessionId: string | null;
  conversationUrl: string | null;
}

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const csvText: string = req.body.csv_text;

  if (!csvText || typeof csvText !== "string") {
    res.status(400).json({ status: "error", message: "csv_text is required" });
    return;
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    res
      .status(400)
      .json({ status: "error", message: "CSV must have a header and at least one data row" });
    return;
  }

  // Skip header
  const dataLines = lines.slice(1);

  // Onda 5 A1 P2: cap pra evitar event loop bloqueado por minutos.
  if (dataLines.length > MAX_CSV_ROWS) {
    res.status(413).json({
      status: "error",
      message: `CSV too large (max ${MAX_CSV_ROWS} rows, got ${dataLines.length})`,
    });
    return;
  }

  // Phase 1: parse + validate todas as rows em memória (sem touch DB).
  const parsed: ParsedRow[] = [];
  let errors = 0;
  const errorDetails: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    try {
      const line = dataLines[i];
      if (!line) continue; // sanity — já filtramos vazias acima
      const fields = parseCsvLine(line);

      // Expected columns:
      // 0: Timestamp, 1: Source, 2: Model, 3: Input Tokens, 4: Output Tokens,
      // 5: Cache Read, 6: Cache Write, 7: Total Tokens, 8: Cost (USD),
      // 9: Cost (BRL) [ignored], 10: Session ID, 11: Conversation URL
      if (fields.length < 9) {
        errors++;
        errorDetails.push(`Row ${i + 2}: not enough columns (${fields.length})`);
        continue;
      }

      const timestamp = fields[0];
      const source = fields[1] as "claude-code" | "claude.ai";
      const model = fields[2];

      if (!timestamp || !source || !model) {
        errors++;
        errorDetails.push(`Row ${i + 2}: missing timestamp, source, or model`);
        continue;
      }

      if (!["claude-code", "claude.ai"].includes(source)) {
        errors++;
        errorDetails.push(`Row ${i + 2}: invalid source "${source}"`);
        continue;
      }

      parsed.push({
        rowNum: i + 2,
        timestamp,
        source,
        model,
        inputTokens: parseInt(fields[3] ?? "", 10) || 0,
        outputTokens: parseInt(fields[4] ?? "", 10) || 0,
        cacheRead: parseInt(fields[5] ?? "", 10) || 0,
        cacheWrite: parseInt(fields[6] ?? "", 10) || 0,
        totalTokens: parseInt(fields[7] ?? "", 10) || 0,
        // fields[8] (cost_usd) e fields[9] (cost_brl) ignorados.
        // Server SEMPRE recomputa cost_usd via pricing override per-user
        // (Wave 4 A1 P1 security contract — client cost nunca é confiado).
        sessionId: fields[10] || null,
        conversationUrl: fields[11] || null,
      });
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      errorDetails.push(`Row ${i + 2}: ${msg}`);
    }
  }

  if (parsed.length === 0) {
    res.json({
      status: "ok",
      imported: 0,
      errors,
      total: dataLines.length,
      error_details: errorDetails.slice(0, 20),
    });
    return;
  }

  // Phase 2: resolver pricing UMA vez por modelo único (cache).
  // Antes era N queries de pricing dentro do loop, agora é K (K = modelos únicos).
  const pricingCache = new Map<string, ModelPricing>();
  const uniqueModels = Array.from(new Set(parsed.map((r) => r.model)));
  for (const m of uniqueModels) {
    pricingCache.set(m, await getEffectivePricing(userId, m));
  }

  // Pre-compute cost_usd + total_tokens corrigido (regra Wave 4 A1 P1).
  const computed = parsed.map((r) => {
    const pricing = pricingCache.get(r.model)!;
    const costUsd =
      (r.inputTokens * pricing.input +
        r.outputTokens * pricing.output +
        r.cacheRead * pricing.cache_read +
        r.cacheWrite * pricing.cache_write) /
      1_000_000;
    // CSV vem só de "claude-code" / "claude.ai" (validado acima).
    // Pra Claude sources, total_tokens = input + output (cache_read pode estar
    // dobrado no input_tokens da API Anthropic). Mantém contrato tokenService.
    const totalTokens = r.inputTokens + r.outputTokens;
    return { ...r, costUsd, totalTokens };
  });

  // Phase 3: transação + batch INSERT.
  const client = await pool.connect();
  let imported = 0;
  try {
    await client.query("BEGIN");

    // Batch INSERT token_entries em chunks de INSERT_BATCH_SIZE rows.
    // 12 colunas × 500 rows = 6000 placeholders, bem dentro do limite pg
    // (default ~65535 params por query).
    for (let start = 0; start < computed.length; start += INSERT_BATCH_SIZE) {
      const chunk = computed.slice(start, start + INSERT_BATCH_SIZE);
      const params: any[] = [];
      const valuesPlaceholders: string[] = [];

      for (let j = 0; j < chunk.length; j++) {
        const base = j * 12;
        valuesPlaceholders.push(
          `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12})`,
        );
        const r = chunk[j];
        if (!r) continue; // unreachable — j < chunk.length
        params.push(
          userId,
          r.timestamp,
          r.source,
          r.model,
          r.inputTokens,
          r.outputTokens,
          r.cacheRead,
          r.cacheWrite,
          r.totalTokens,
          r.costUsd,
          r.sessionId,
          r.conversationUrl,
        );
      }

      const result = await client.query(
        `INSERT INTO token_entries
           (user_id, timestamp, source, model, input_tokens, output_tokens,
            cache_read, cache_write, total_tokens, cost_usd, session_id, conversation_url)
         VALUES ${valuesPlaceholders.join(",")}
         ON CONFLICT (user_id, session_id, model, input_tokens, output_tokens, cache_read, cache_write, "timestamp") DO NOTHING`,
        params,
      );

      imported += result.rowCount ?? 0;
    }

    // Phase 4: aggregate por session_id + UPSERT sessions em batch.
    // Computed agora reflete o que foi enviado, mas duplicatas (ON CONFLICT
    // DO NOTHING) podem ter sido descartadas. Pra simplicidade caveman:
    // recomputar aggregates por session_id sobre o que FOI inserido.
    // Como não temos RETURNING (batch + DO NOTHING não retorna nada útil
    // determinístico), agregamos sobre o que foi enviado. Risco: sessions
    // com duplicatas ganham overcount em entry_count/sums. Mitigation:
    // recompute via SELECT pós-INSERT. Caveman optou por SELECT real do DB
    // pra eliminar drift.

    const sessionsTouched = new Set<string>();
    for (const r of computed) {
      if (r.sessionId) sessionsTouched.add(r.sessionId);
    }

    if (sessionsTouched.size > 0) {
      const sessionIds = Array.from(sessionsTouched);
      // Agrega métricas reais da tabela token_entries depois do INSERT,
      // evitando double-count com duplicatas.
      const aggResult = await client.query(
        `SELECT session_id, source,
                MIN(timestamp) AS first_seen,
                MAX(timestamp) AS last_seen,
                SUM(cost_usd)::float AS total_cost_usd,
                SUM(input_tokens)::bigint AS total_input,
                SUM(output_tokens)::bigint AS total_output,
                COUNT(*)::int AS entry_count
         FROM token_entries
         WHERE user_id = $1 AND session_id = ANY($2::text[])
         GROUP BY session_id, source`,
        [userId, sessionIds],
      );

      // UPSERT sessions row-a-row (no transação, no client) — N = sessions
      // únicas (normalmente << N entries). Custo desprezível.
      for (const row of aggResult.rows) {
        await client.query(
          `INSERT INTO sessions
             (user_id, session_id, source, first_seen, last_seen,
              total_cost_usd, total_input, total_output, entry_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (user_id, session_id) DO UPDATE SET
             first_seen = LEAST(sessions.first_seen, EXCLUDED.first_seen),
             last_seen = GREATEST(sessions.last_seen, EXCLUDED.last_seen),
             total_cost_usd = EXCLUDED.total_cost_usd,
             total_input = EXCLUDED.total_input,
             total_output = EXCLUDED.total_output,
             entry_count = EXCLUDED.entry_count`,
          [
            userId,
            row.session_id,
            row.source,
            row.first_seen,
            row.last_seen,
            row.total_cost_usd,
            row.total_input,
            row.total_output,
            row.entry_count,
          ],
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      status: "error",
      message: `Import failed (rolled back): ${msg}`,
    });
    return;
  } finally {
    client.release();
  }

  res.json({
    status: "ok",
    imported,
    errors,
    total: dataLines.length,
    error_details: errorDetails.slice(0, 20),
  });
});

export default router;
