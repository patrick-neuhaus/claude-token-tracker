import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

export interface TopToolRow {
  tool_name: string;
  count: number;
  total_duration_ms: number | null;
}

export interface BySessionRow {
  session_id: string;
  count: number;
}

export interface ByProjectRow {
  project_id: string;
  project_name: string;
  count: number;
}

export interface ToolStats {
  topTools: TopToolRow[];
  bySession: BySessionRow[];
  byProject: ByProjectRow[];
}

function buildStatsPath(from?: string, to?: string): string {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const q = qs.toString();
  return q ? `/tool-invocations/stats?${q}` : "/tool-invocations/stats";
}

export function useToolStats(from?: string, to?: string) {
  return useQuery<ToolStats>({
    queryKey: qk.toolInvocations.stats(from, to),
    queryFn: () => api.get<ToolStats>(buildStatsPath(from, to)),
    staleTime: 30_000,
  });
}
