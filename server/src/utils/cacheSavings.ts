/**
 * Cache savings SQL helper. Single source of truth for cache_savings_usd math.
 *
 * Math: savings = cache_read_tokens × (input_price - cache_read_price) per 1M
 *
 * Source of prices: https://platform.claude.com/docs/en/about-claude/pricing
 * (verified 2026-04-29; aligned with `config/pricing.ts`).
 *
 * BUG-02 fix: previous version had only "opus / haiku / sonnet" buckets with
 * legacy Opus pricing ($15 input → savings 13.5). Current Opus 4.5+ is $5 input
 * → savings 4.5. Was over-reporting Opus savings ~3×.
 */

/**
 * Per-model savings rate (USD per 1M cache_read tokens).
 * Postgres ILIKE match — most specific first.
 */
export const CACHE_SAVINGS_CASE_SQL = `
  CASE
    WHEN model ILIKE '%opus-4-7%' OR model ILIKE '%opus-4-6%' OR model ILIKE '%opus-4-5%' THEN 4.5
    WHEN model ILIKE '%opus-4-1%' OR model ILIKE '%opus-4-0%' OR model ILIKE '%opus-3%' THEN 13.5
    WHEN model ILIKE '%opus%' THEN 4.5
    WHEN model ILIKE '%haiku-4-5%' THEN 0.9
    WHEN model ILIKE '%haiku-3-5%' THEN 0.72
    WHEN model ILIKE '%haiku-3%' THEN 0.22
    WHEN model ILIKE '%haiku%' THEN 0.9
    WHEN model ILIKE '%sonnet%' THEN 2.7
    ELSE 2.7
  END
`;

/** Drop-in SQL fragment producing cache_savings_usd as float. */
export const CACHE_SAVINGS_USD_SQL = `
  COALESCE(SUM(cache_read * (${CACHE_SAVINGS_CASE_SQL}) / 1000000.0), 0)::float
`;
