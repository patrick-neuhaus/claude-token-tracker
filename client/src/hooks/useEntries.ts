import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface EntryFilters {
  page: number;
  model?: string;
  source?: string;
  from?: string;
  to?: string;
}

export function useEntries(filters: EntryFilters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  if (filters.model) params.set("model", filters.model);
  if (filters.source) params.set("source", filters.source);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  return useQuery({
    queryKey: ["entries", filters],
    queryFn: () => api.get(`/entries?${params.toString()}`),
  });
}
