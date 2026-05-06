import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PricingOverride {
  model_key: string;
  input_rate: number;
  output_rate: number;
  cache_read_rate: number;
  cache_write_rate: number;
  updated_at: string;
}

export interface PricingRates {
  input_rate: number;
  output_rate: number;
  cache_read_rate: number;
  cache_write_rate: number;
}

export function useCustomPricing() {
  return useQuery<{ overrides: PricingOverride[] }>({
    queryKey: ["pricing-overrides"],
    queryFn: () => api.get("/settings/pricing"),
    staleTime: 60_000,
  });
}

export function useUpsertPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ modelKey, rates }: { modelKey: string; rates: PricingRates }) =>
      api.put(`/settings/pricing/${encodeURIComponent(modelKey)}`, rates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-overrides"] });
    },
  });
}

export function useDeletePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (modelKey: string) =>
      api.delete(`/settings/pricing/${encodeURIComponent(modelKey)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-overrides"] });
    },
  });
}
