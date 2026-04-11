import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  total_cost_usd: number;
  total_input: number;
  total_output: number;
  session_count: number;
  last_activity: string | null;
  sparkline?: Array<{ day: string; cost: number }>;
}

interface ProjectDetail extends Project {
  sessions: Array<{
    id: string;
    session_id: string;
    custom_name: string | null;
    source: string;
    first_seen: string;
    last_seen: string;
    total_cost_usd: number;
    total_input: number;
    total_output: number;
    entry_count: number;
  }>;
  daily?: Array<{ day: string; cost_usd: number; entries: number }>;
  by_model?: Array<{ model: string; cost_usd: number; total_tokens: string; entries: number }>;
}

interface UnassignedSession {
  id: string;
  session_id: string;
  custom_name: string | null;
  source: string;
  last_seen: string;
  total_cost_usd: number;
  entry_count: number;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects"),
  });
}

export function useProjectDetail(id: string | undefined, from?: string, to?: string) {
  return useQuery<ProjectDetail>({
    queryKey: ["project", id, from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      return api.get(`/projects/${id}${qs ? `?${qs}` : ""}`);
    },
    enabled: !!id,
  });
}

export function useUnassignedSessions() {
  return useQuery<UnassignedSession[]>({
    queryKey: ["unassigned-sessions"],
    queryFn: () => api.get("/projects/unassigned-sessions"),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post("/projects", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      api.patch(`/projects/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useAssignSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, sessionId }: { projectId: string; sessionId: string }) =>
      api.post(`/projects/${projectId}/sessions/${sessionId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["unassigned-sessions"] });
    },
  });
}

export function useUnassignSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, sessionId }: { projectId: string; sessionId: string }) =>
      api.delete(`/projects/${projectId}/sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["unassigned-sessions"] });
    },
  });
}
