import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

export interface TopSkill {
  skill_name: string;
  count: number;
}

export interface DailyCount {
  date: string;
  count: number;
  allow: number;
  deny: number;
}

export interface SkillUsageStats {
  topSkills: TopSkill[];
  dailyCount: DailyCount[];
  deprecatedCount: number;
}

export interface SkillAllowlistEntry {
  skill_name: string;
  status: "active" | "deprecated";
  notes: string | null;
  updated_at: string;
}

function buildStatsPath(from?: string, to?: string): string {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const q = qs.toString();
  return q ? `/skill-invocations/stats?${q}` : "/skill-invocations/stats";
}

export function useSkillUsageStats(from?: string, to?: string) {
  return useQuery<SkillUsageStats>({
    queryKey: qk.skillInvocations.stats(from, to),
    queryFn: () => api.get<SkillUsageStats>(buildStatsPath(from, to)),
    staleTime: 30_000,
  });
}

export function useSkillAllowlistAll() {
  return useQuery<SkillAllowlistEntry[]>({
    queryKey: qk.skillAllowlist.all(),
    queryFn: () => api.get<SkillAllowlistEntry[]>("/skill-allowlist"),
    staleTime: 60_000,
  });
}

export function useSkillAllowlist(name: string | undefined) {
  return useQuery<SkillAllowlistEntry>({
    queryKey: qk.skillAllowlist.detail(name),
    queryFn: () =>
      api.get<SkillAllowlistEntry>(`/skill-allowlist/${encodeURIComponent(name!)}`),
    enabled: !!name,
    staleTime: 30_000,
  });
}

export interface ToggleSkillAllowlistArgs {
  name: string;
  status: "active" | "deprecated";
  notes?: string;
}

export function useToggleSkillAllowlist() {
  const qc = useQueryClient();
  return useMutation<SkillAllowlistEntry, Error, ToggleSkillAllowlistArgs>({
    mutationFn: ({ name, status, notes }) =>
      api.patch<SkillAllowlistEntry>(
        `/skill-allowlist/${encodeURIComponent(name)}`,
        { status, notes },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.skillAllowlist.all() });
      qc.invalidateQueries({ queryKey: qk.skillAllowlist.detail(vars.name) });
    },
  });
}
