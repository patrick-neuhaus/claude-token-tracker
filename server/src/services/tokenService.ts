import { query } from "../config/database.js";
import { calculateCost } from "../utils/costCalculator.js";
import type { TokenPayload } from "../types/index.js";

export async function insertTokenEntry(userId: string, payload: TokenPayload) {
  let costUsd = payload.cost_usd ?? 0;
  if (costUsd <= 0) {
    costUsd = calculateCost(
      payload.model,
      payload.input_tokens,
      payload.output_tokens,
      payload.cache_read,
      payload.cache_write
    );
  }

  const totalTokens =
    payload.total_tokens ||
    (payload.input_tokens ?? 0) + (payload.output_tokens ?? 0) + (payload.cache_read ?? 0) + (payload.cache_write ?? 0);

  const insertResult = await query(
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
      payload.input_tokens || 0,
      payload.output_tokens || 0,
      payload.cache_read || 0,
      payload.cache_write || 0,
      totalTokens,
      costUsd,
      payload.session_id || null,
      payload.conversation_url || null,
    ]
  );

  // Duplicata — não atualiza sessions nem retorna custo inflado
  if (insertResult.rowCount === 0) {
    return { cost_usd: 0, duplicate: true };
  }

  if (payload.session_id) {
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
        payload.input_tokens || 0,
        payload.output_tokens || 0,
        payload.auto_name || null,
        payload.session_name || null,
      ]
    );
  }

  return { cost_usd: costUsd };
}
