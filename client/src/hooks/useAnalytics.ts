import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AnalyticsFilters {
  from?: string;
  to?: string;
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
