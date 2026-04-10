import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SessionTimeRow } from "@/lib/types";

export function useSessionTime(gap: number, from?: string, to?: string) {
  return useQuery<SessionTimeRow[]>({
    queryKey: ["analytics", "session-time", gap, from, to],
    queryFn: () => {
      const qs = new URLSearchParams({ gap: String(gap) });
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      return api.get(`/analytics/session-time?${qs.toString()}`);
    },
    staleTime: 30_000,
  });
}
