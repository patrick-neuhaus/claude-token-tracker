import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DashboardFilters {
  period?: string;
  model?: string;
  source?: string;
  project_id?: string;
  from?: string;
  to?: string;
}

function buildParams(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.model) params.set("model", filters.model);
  if (filters.source) params.set("source", filters.source);
  if (filters.project_id) params.set("project_id", filters.project_id);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

export function useSummary(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "summary", filters],
    queryFn: () => api.get(`/dashboard/summary?${buildParams(filters)}`),
  });
}

export function useCharts(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "charts", filters],
    queryFn: () => api.get(`/dashboard/charts?${buildParams(filters)}`),
  });
}
