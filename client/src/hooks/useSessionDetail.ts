import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SessionDetailResponse } from "@/lib/types";

export function useSessionDetail(id: string | undefined) {
  return useQuery<SessionDetailResponse>({
    queryKey: ["sessions", "detail", id],
    queryFn: () => api.get(`/sessions/${id}/detail`),
    enabled: !!id,
    staleTime: 30_000,
  });
}
