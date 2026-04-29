import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SystemPromptSummary {
  id: string;
  label: string;
  path: string;
  exists: boolean;
  lineCount: number;
  lastModified: string | null;
  bytes: number;
}

export interface SystemPromptDetail extends SystemPromptSummary {
  body: string;
}

export function useSystemPromptsList() {
  return useQuery<SystemPromptSummary[]>({
    queryKey: ["systemPrompts", "list"],
    queryFn: () => api.get("/system-prompts"),
    staleTime: 60_000,
  });
}

export function useSystemPromptDetail(id: string | undefined) {
  return useQuery<SystemPromptDetail>({
    queryKey: ["systemPrompts", "detail", id],
    queryFn: () => api.get(`/system-prompts/${id}`),
    staleTime: 60_000,
    enabled: !!id,
  });
}
