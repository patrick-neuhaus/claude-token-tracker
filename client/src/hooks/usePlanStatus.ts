import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface PlanStatus {
  total_cost_usd: number;
  entry_count: number;
  session_count: number;
}

export function usePlanStatus() {
  return useQuery<PlanStatus>({
    queryKey: ["plan-status"],
    queryFn: () => api.get("/dashboard/summary?period=month"),
    refetchInterval: 60_000,
  });
}
