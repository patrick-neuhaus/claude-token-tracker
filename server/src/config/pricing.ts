/**
 * Anthropic Claude pricing (USD per 1M tokens).
 * Source: https://platform.claude.com/docs/en/about-claude/pricing
 * Last updated: 2026-04-29 (verified via WebFetch)
 *
 * Cache write rate = 5-minute TTL (1.25× input). 1-hour TTL is 2× input —
 * tracker doesn't differentiate by TTL today, so we default to 5min rate.
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
  // === Opus current generation (4.5+) — $5 / $25 ===
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
  opus: { input: 5.0, output: 25.0, cache_read: 0.5, cache_write: 6.25 },
  sonnet: { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
  haiku: { input: 1.0, output: 5.0, cache_read: 0.1, cache_write: 1.25 },
};

export const DEFAULT_PRICING = PRICING.sonnet;
