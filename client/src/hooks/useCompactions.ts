import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompactionRow {
  id: string;
  session_id: string;
  project_id: string | null;
  before_tokens: number | null;
  after_tokens: number | null;
  reduction_pct: string | null;
  trigger: string | null;
  timestamp: string;
}

export interface SessionCompactionStats {
  compactions: CompactionRow[];
  avg_reduction_pct: number | null;
}

export interface InefficientSession {
  session_id: string;
  compaction_count: number;
  avg_reduction_pct: number | null;
}

export interface CompactionStats {
  bySession?: SessionCompactionStats;
  inefficientSessions?: InefficientSession[];
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Stats for a specific session (shows compaction list + avg reduction). */
export function useSessionCompactions(sessionId: string | undefined) {
  return useQuery<CompactionStats>({
    queryKey: qk.compactions.stats(sessionId),
    queryFn: () =>
      api.get<CompactionStats>(
        `/compactions/stats?session_id=${encodeURIComponent(sessionId!)}`
      ),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

/** Inefficient sessions list for Dashboard card (no session_id filter). */
export function useInefficientSessions() {
  return useQuery<CompactionStats>({
    queryKey: qk.compactions.inefficient(),
    queryFn: () => api.get<CompactionStats>("/compactions/stats"),
    staleTime: 60_000,
  });
}
