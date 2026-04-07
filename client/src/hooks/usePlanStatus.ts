import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export function usePlanStatus() {
  return useQuery<DashboardSummary>({
    queryKey: ["plan-status"],
    queryFn: () => api.get("/dashboard/summary?period=month"),
    refetchInterval: 60_000,
  });
}
