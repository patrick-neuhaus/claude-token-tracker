import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

export interface AnalyticsFilters {
  from?: string;
  to?: string;
}

export interface CacheHitTrendRow {
  date: string;
  cache_read: string;
  input: string;
  hit_rate: string;
  total_tokens: string;
}

export interface ToolP95Row {
  tool_name: string;
  p95_ms: string;
  count: string;
  total_duration_ms: string;
}

export function useAnalytics(filters: AnalyticsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();

  return useQuery({
    queryKey: ["analytics", filters],
    queryFn: () => api.get(`/analytics${qs ? `?${qs}` : ""}`),
    staleTime: 60_000,
  });
}

export function useCacheHitTrend(days = 30) {
  return useQuery<CacheHitTrendRow[]>({
    queryKey: qk.analytics.cacheHitTrend(days),
    queryFn: () => api.get(`/analytics/cache-hit-trend?days=${days}`),
    staleTime: 120_000,
  });
}

export function useToolP95(days = 7) {
  return useQuery<ToolP95Row[]>({
    queryKey: qk.analytics.toolP95(days),
    queryFn: () => api.get(`/analytics/tool-p95?days=${days}`),
    staleTime: 120_000,
  });
}
