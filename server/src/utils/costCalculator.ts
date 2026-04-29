import { PRICING, DEFAULT_PRICING, type ModelPricing } from "../config/pricing.js";
import { normalizeModel } from "./modelNormalizer.js";

/** Resolve pricing with version fallback: "opus-4-7" → "opus" → DEFAULT. */
export function resolvePricing(model: string): ModelPricing {
  const key = normalizeModel(model);
  if (PRICING[key]) return PRICING[key];
  // Strip version: "opus-4-99" → "opus"
  const family = key.split("-")[0];
  if (PRICING[family]) return PRICING[family];
  return DEFAULT_PRICING;
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheRead: number,
  cacheWrite: number
): number {
  const pricing = resolvePricing(model);

  return (
    (inputTokens * pricing.input +
      outputTokens * pricing.output +
      cacheRead * pricing.cache_read +
      cacheWrite * pricing.cache_write) /
    1_000_000
  );
}
