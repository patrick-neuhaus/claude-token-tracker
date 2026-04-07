import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SessionListResponse } from "@/lib/types";

export interface SessionFilters {
  page: number;
  search: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  project_id?: string;
  from?: string;
  to?: string;
}

export function useSessions(filters: SessionFilters) {
  return useQuery<SessionListResponse>({
    queryKey: ["sessions", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(filters.page));
      params.set("search", filters.search);
      if (filters.sort_by) params.set("sort_by", filters.sort_by);
      if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
      if (filters.project_id) params.set("project_id", filters.project_id);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      return api.get(`/sessions?${params.toString()}`);
    },
  });
}

interface SessionEntry {
  id: string;
  timestamp: string;
  source: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  total_tokens: number;
  cost_usd: number;
  conversation_url: string | null;
}

export function useSessionEntries(sessionId: string | null) {
  return useQuery<SessionEntry[]>({
    queryKey: ["session-entries", sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/entries`),
    enabled: !!sessionId,
  });
}

export function useRenameSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, custom_name }: { id: string; custom_name: string }) =>
      api.patch(`/sessions/${id}`, { custom_name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}
