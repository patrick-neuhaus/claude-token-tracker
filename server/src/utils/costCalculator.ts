import { PRICING, DEFAULT_PRICING } from "../config/pricing.js";
import { normalizeModel } from "./modelNormalizer.js";

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheRead: number,
  cacheWrite: number
): number {
  const family = normalizeModel(model);
  const pricing = PRICING[family] || DEFAULT_PRICING;

  return (
    (inputTokens * pricing.input +
      outputTokens * pricing.output +
      cacheRead * pricing.cache_read +
      cacheWrite * pricing.cache_write) /
    1_000_000
  );
}
