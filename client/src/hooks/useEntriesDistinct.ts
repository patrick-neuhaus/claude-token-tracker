import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

interface EntriesDistinctResponse {
  sources: string[];
  models: string[];
}

export function useEntriesDistinct() {
  return useQuery<EntriesDistinctResponse>({
    queryKey: qk.entries.distinct(),
    queryFn: () => api.get(`/entries/distinct`),
    staleTime: 5 * 60_000,
  });
}
