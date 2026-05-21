import { query } from "../config/database.js";
import { getEffectivePricing } from "./pricingOverrideService.js";
import type { TokenPayload } from "../types/index.js";

export async function insertTokenEntry(userId: string, payload: TokenPayload) {
  // SECURITY (Wave 4 A1 P1): NEVER trust client-supplied cost_usd. Always
  // compute server-side from pricing tables — client could falsify cost
  // values to underreport/overreport spend. payload.cost_usd is ignored even
  // if present (type kept optional in TokenPayload for back-compat).
  // Wave 7.3: pricing usa override per-user antes de fallback global PRICING.

  // Onda 9 (cache hit rate fix): OpenAI's Responses API returns input_tokens
  // INCLUDING cache_read_input_tokens — they're a subset, not disjoint. Storing
  // them as-is double-counts cache reads in the hit-rate formula
  //   cache_read / (cache_read + input_tokens)
  // because input_tokens already contains cache_read.
  // Anthropic returns input_tokens DISJOINT from cache_read, so no normalize.
  // Fix: descontar cache_read de input_tokens em codex SÓ NA INSERÇÃO. Storage
  // passa a refletir "fresh input tokens" (input - cache) em ambos sources,
  // mantendo a fórmula de hit rate consistente. Cost computation also benefits:
  // OpenAI's fresh-input price applies to (input - cache), not full input.
  const rawInput = payload.input_tokens || 0;
  const cacheRead = payload.cache_read || 0;
  const normalizedInputTokens =
    payload.source === "codex" && cacheRead > 0
      ? Math.max(0, rawInput - cacheRead)
      : rawInput;

  const pricing = await getEffectivePricing(userId, payload.model);
  const costUsd =
    (normalizedInputTokens * pricing.input +
      (payload.output_tokens || 0) * pricing.output +
      cacheRead * pricing.cache_read +
      (payload.cache_write || 0) * pricing.cache_write) /
    1_000_000;

  // total_tokens contract (Wave 4 A1 P1 math drift fix):
  // - codex: API exposes a reliable total_tokens; trust if provided.
  // - claude-code / claude.ai: Anthropic API may include cache_read inside
  //   input_tokens, so summing input+output+cache double-counts. Use only
  //   input + output here. cache_read/cache_write stay in their own columns
  //   for analytics, never folded into total_tokens for Claude sources.
  // Onda 9: usa normalizedInputTokens no fallback (codex post-dedupe). Total
  // from API ainda é truth-source quando disponível pra codex.
  let totalTokens: number;
  if (payload.source === "codex" && typeof payload.total_tokens === "number" && payload.total_tokens > 0) {
    totalTokens = payload.total_tokens;
  } else {
    totalTokens = normalizedInputTokens + (payload.output_tokens ?? 0);
  }

  // Fix log spam: catch unique_violation (23505) directly. The ON CONFLICT column
  // tuple no longer matches the actual `idx_unique_token_entry` index in the DB
  // (added out-of-band, columns differ from what's spec'd here), so postgres
  // raises the violation instead of silently skipping. Catching 23505 is also
  // resilient to future index reshape.
  let insertResult;
  try {
    insertResult = await query(
      `INSERT INTO token_entries
         (user_id, timestamp, source, model, input_tokens, output_tokens,
          cache_read, cache_write, total_tokens, cost_usd, session_id, conversation_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (user_id, session_id, model, input_tokens, output_tokens, cache_read, cache_write, "timestamp") DO NOTHING`,
      [
        userId,
        payload.timestamp,
        payload.source,
        payload.model,
        normalizedInputTokens,
        payload.output_tokens || 0,
        payload.cache_read || 0,
        payload.cache_write || 0,
        totalTokens,
        costUsd,
        payload.session_id || null,
        payload.conversation_url || null,
      ]
    );
  } catch (err: any) {
    // Postgres unique_violation = '23505'. Expected: collector re-sends entries
    // already stored. Treat as duplicate, return silently — no logging.
    if (err?.code === "23505") {
      return { cost_usd: 0, duplicate: true };
    }
    throw err;
  }

  // Duplicata — não atualiza sessions nem retorna custo inflado
  if (insertResult.rowCount === 0) {
    return { cost_usd: 0, duplicate: true };
  }

  if (payload.session_id) {
    // Resolve project_id from project name if provided.
    // Onda 6 A1 P3: single roundtrip ON CONFLICT. Antes: SELECT-then-INSERT
    // não-atômico — 2 entries paralelas mesmo project ambas miss SELECT,
    // ambas INSERT, 2ª falha em unique constraint (ou pior, duplica sem
    // constraint). Migration 018 garante UNIQUE (user_id, name); a cláusula
    // ON CONFLICT DO UPDATE retorna o id existente em qualquer caso.
    let projectId: string | null = null;
    if (payload.project) {
      const upserted = await query(
        `INSERT INTO projects (user_id, name)
         VALUES ($1, $2)
         ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [userId, payload.project]
      );
      projectId = upserted.rows[0].id;
    }

    await query(
      `INSERT INTO sessions
         (user_id, session_id, source, first_seen, last_seen, total_cost_usd, total_input, total_output, entry_count, custom_name, session_name)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,1,$8,$9)
       ON CONFLICT (user_id, session_id) DO UPDATE SET
         first_seen = LEAST(sessions.first_seen, EXCLUDED.first_seen),
         last_seen = GREATEST(sessions.last_seen, EXCLUDED.last_seen),
         total_cost_usd = sessions.total_cost_usd + EXCLUDED.total_cost_usd,
         total_input = sessions.total_input + EXCLUDED.total_input,
         total_output = sessions.total_output + EXCLUDED.total_output,
         entry_count = sessions.entry_count + 1,
         session_name = COALESCE(sessions.session_name, EXCLUDED.session_name)`,
      [
        userId,
        payload.session_id,
        payload.source,
        payload.timestamp,
        costUsd,
        normalizedInputTokens,
        payload.output_tokens || 0,
        payload.auto_name || null,
        payload.session_name || null,
      ]
    );

    // Update project_id on session only if not already set (COALESCE semantics)
    if (projectId) {
      await query(
        `UPDATE sessions SET project_id = COALESCE(project_id, $2) WHERE session_id = $1 AND user_id = $3`,
        [payload.session_id, projectId, userId]
      );
    }
  }

  return { cost_usd: costUsd };
}
