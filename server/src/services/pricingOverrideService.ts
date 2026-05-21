import { query } from "../config/database.js";
import { PRICING, DEFAULT_PRICING, type ModelPricing } from "../config/pricing.js";
import { normalizeModel } from "../utils/modelNormalizer.js";

/**
 * Wave 7.3 (F-NEW-8) — Custom pricing per-model per-user.
 *
 * Effective pricing for a webhook insert:
 *   1. Check user_pricing_overrides for (user_id, normalizeModel(model)).
 *   2. Fallback to global PRICING (config/pricing.ts).
 *
 * NOT retroactive — old entries keep their original cost_usd. Only future
 * webhook inserts pick up new overrides.
 */

export interface PricingOverride {
  model_key: string;
  input_rate: number;
  output_rate: number;
  cache_read_rate: number;
  cache_write_rate: number;
  updated_at: string;
}

export async function listOverrides(userId: string): Promise<PricingOverride[]> {
  const result = await query(
    `SELECT model_key, input_rate::float, output_rate::float,
            cache_read_rate::float, cache_write_rate::float, updated_at
     FROM user_pricing_overrides
     WHERE user_id = $1
     ORDER BY model_key`,
    [userId],
  );
  return result.rows;
}

export async function upsertOverride(
  userId: string,
  modelKey: string,
  rates: {
    input_rate: number;
    output_rate: number;
    cache_read_rate: number;
    cache_write_rate: number;
  },
): Promise<PricingOverride> {
  const result = await query(
    `INSERT INTO user_pricing_overrides
       (user_id, model_key, input_rate, output_rate, cache_read_rate, cache_write_rate)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, model_key) DO UPDATE SET
       input_rate = EXCLUDED.input_rate,
       output_rate = EXCLUDED.output_rate,
       cache_read_rate = EXCLUDED.cache_read_rate,
       cache_write_rate = EXCLUDED.cache_write_rate,
       updated_at = NOW()
     RETURNING model_key, input_rate::float, output_rate::float,
               cache_read_rate::float, cache_write_rate::float, updated_at`,
    [userId, modelKey, rates.input_rate, rates.output_rate, rates.cache_read_rate, rates.cache_write_rate],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Failed to upsert pricing override");
  return row;
}

export async function deleteOverride(userId: string, modelKey: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM user_pricing_overrides WHERE user_id = $1 AND model_key = $2`,
    [userId, modelKey],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Resolve effective pricing for a user + model. Checks override first,
 * falls back to global PRICING with version → family → DEFAULT cascade.
 */
export async function getEffectivePricing(
  userId: string,
  rawModel: string,
): Promise<ModelPricing> {
  const key = normalizeModel(rawModel);

  // 1. Check exact override (key OR family fallback)
  const overrideResult = await query(
    `SELECT input_rate::float, output_rate::float,
            cache_read_rate::float AS cache_read, cache_write_rate::float AS cache_write
     FROM user_pricing_overrides
     WHERE user_id = $1 AND model_key = $2
     LIMIT 1`,
    [userId, key],
  );
  if (overrideResult.rows[0]) {
    const r = overrideResult.rows[0];
    return {
      input: r.input_rate,
      output: r.output_rate,
      cache_read: r.cache_read,
      cache_write: r.cache_write,
    };
  }

  // 2. Fallback: exact key in PRICING → family → DEFAULT
  const exact = PRICING[key];
  if (exact) return exact;
  const family = key.split("-")[0];
  if (family) {
    const familyPricing = PRICING[family];
    if (familyPricing) return familyPricing;
  }
  return DEFAULT_PRICING;
}
