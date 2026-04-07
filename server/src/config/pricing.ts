export interface ModelPricing {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
}

export const PRICING: Record<string, ModelPricing> = {
  opus: { input: 15.0, output: 75.0, cache_read: 1.5, cache_write: 18.75 },
  sonnet: { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
  haiku: { input: 0.8, output: 4.0, cache_read: 0.08, cache_write: 1.0 },
};

export const DEFAULT_PRICING = PRICING.sonnet;
