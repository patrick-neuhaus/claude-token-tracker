/**
 * Token pricing tables. USD per 1M tokens.
 *
 * Sources:
 * - Anthropic Claude: https://docs.anthropic.com/en/docs/about-claude/pricing
 * - OpenAI GPT: https://openai.com/api/pricing/
 *
 * Last updated: 2026-05-19
 *
 * Convenções:
 * - cache_read padrão Anthropic = 10% do input rate
 * - cache_write padrão Anthropic = 1.25× do input rate (5-min TTL; 1h TTL é 2×,
 *   tracker não diferencia hoje — default 5min)
 * - cache_read padrão OpenAI = 10% do input rate (gpt-5.x family)
 */

export interface ModelPricing {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
}

/**
 * Versioned pricing keys. Lookup is "tier-by-version" (most specific first):
 * 1. exact key (e.g. "opus-4-7")
 * 2. family fallback (e.g. "opus") — uses CURRENT generation pricing
 *
 * Why versioned keys: Opus 4.5/4.6/4.7 = $5/$25, but Opus 4.1/4 = $15/$75.
 * Older models cost 3× more — wrong family fallback under-bills 3×.
 */
export const PRICING: Record<string, ModelPricing> = {
  "gpt-5.5": { input: 5.0, output: 30.0, cache_read: 0.5, cache_write: 5.0 },
  // cache_read = 10% do input rate (padrao OpenAI gpt-5.x family)
  "gpt-5.5-pro": { input: 30.0, output: 180.0, cache_read: 3.0, cache_write: 30.0 },
  "gpt-5.4": { input: 2.5, output: 15.0, cache_read: 0.25, cache_write: 2.5 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5, cache_read: 0.075, cache_write: 0.75 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25, cache_read: 0.02, cache_write: 0.2 },
  "gpt-5.3-codex": { input: 1.75, output: 14.0, cache_read: 0.175, cache_write: 1.75 },

  // === Fable (tier acima do Opus) — $10 / $50 (2x Opus atual) ===
  "fable-5": { input: 10.0, output: 50.0, cache_read: 1.0, cache_write: 12.5 },

  // === Opus current generation (4.5+) — $5 / $25 ===
  "opus-4-8": { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  "opus-4-7": { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  "opus-4-6": { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  "opus-4-5": { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  // === Opus legacy (4.1, 4.0) — $15 / $75 ===
  "opus-4-1": { input: 15.0, output: 75.0, cache_read: 1.5, cache_write: 18.75 },
  "opus-4-0": { input: 15.0, output: 75.0, cache_read: 1.5, cache_write: 18.75 },
  "opus-3": { input: 15.0, output: 75.0, cache_read: 1.5, cache_write: 18.75 },

  // === Sonnet current (4.0+) — $3 / $15 ===
  "sonnet-4-6": { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
  "sonnet-4-5": { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
  "sonnet-4-0": { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
  "sonnet-3-7": { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },

  // === Haiku current (4.5) — $1 / $5 ===
  "haiku-4-5": { input: 1.0, output: 5.0, cache_read: 0.1, cache_write: 1.25 },
  // === Haiku legacy (3.5) — $0.80 / $4 ===
  "haiku-3-5": { input: 0.8, output: 4.0, cache_read: 0.08, cache_write: 1.0 },
  "haiku-3": { input: 0.25, output: 1.25, cache_read: 0.03, cache_write: 0.3 },

  // === Family fallback (current generation pricing) ===
  "gpt-5": { input: 5.0, output: 30.0, cache_read: 0.5, cache_write: 5.0 },
  fable: { input: 10.0, output: 50.0, cache_read: 1.0, cache_write: 12.5 },
  opus: { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  sonnet: { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
  haiku: { input: 1.0, output: 5.0, cache_read: 0.1, cache_write: 1.25 },
};

export const DEFAULT_PRICING: ModelPricing = { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 };
