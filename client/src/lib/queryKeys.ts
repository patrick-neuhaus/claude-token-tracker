/**
 * Centralized React Query keys factory.
 *
 * Wave B6.6 (V017 + P3.2): typo-safe query keys + invalidation. Hooks
 * consume `qk.*` so a typo in a string is a TS error, and invalidation
 * by namespace is just `qc.invalidateQueries({ queryKey: qk.projects.all() })`.
 *
 * Convention:
 * - `all()` returns the namespace prefix (used for blanket invalidation).
 * - Specific entries narrow the prefix and append parameters.
 * - Always use `as const` so React Query infers a tuple, not a generic array.
 */

import type { DashboardFilters } from "@/hooks/useDashboard";
import type { SessionFilters } from "@/hooks/useSessions";
import type { SkillSource } from "@/hooks/useSkills";

interface EntriesFilters {
  page: number;
  model?: string;
  source?: string;
  from?: string;
  to?: string;
}

interface AnalyticsFilters {
  from?: string;
  to?: string;
}

export const qk = {
  dashboard: {
    all: () => ["dashboard"] as const,
    summary: (filters: DashboardFilters) =>
      ["dashboard", "summary", filters] as const,
    charts: (filters: DashboardFilters) =>
      ["dashboard", "charts", filters] as const,
  },
  analytics: {
    all: () => ["analytics"] as const,
    overview: (filters: AnalyticsFilters) => ["analytics", filters] as const,
    achievements: () => ["analytics", "achievements"] as const,
    sessionTime: (gap: number, from?: string, to?: string) =>
      ["analytics", "session-time", gap, from, to] as const,
    compare: (selected: string[], dateRange: { from?: string; to?: string }) =>
      ["analytics", "compare", selected, dateRange] as const,
  },
  sessions: {
    all: () => ["sessions"] as const,
    list: (filters: SessionFilters) => ["sessions", filters] as const,
    detail: (id: string | undefined) => ["sessions", "detail", id] as const,
    entries: (sessionId: string | null) =>
      ["session-entries", sessionId] as const,
  },
  entries: {
    all: () => ["entries"] as const,
    list: (filters: EntriesFilters) => ["entries", filters] as const,
  },
  projects: {
    all: () => ["projects"] as const,
    list: () => ["projects"] as const,
    detail: (id: string | undefined, from?: string, to?: string) =>
      ["project", id, from, to] as const,
    detailNamespace: () => ["project"] as const,
    unassigned: () => ["unassigned-sessions"] as const,
  },
  skills: {
    all: () => ["skills"] as const,
    list: () => ["skills", "list"] as const,
    detail: (name: string | undefined, source?: SkillSource) =>
      ["skills", "detail", name, source ?? "auto"] as const,
    file: (
      name: string | undefined,
      filePath: string | null,
      source?: SkillSource,
    ) => ["skills", "file", name, filePath, source ?? "auto"] as const,
  },
  systemPrompts: {
    all: () => ["systemPrompts"] as const,
    list: () => ["systemPrompts", "list"] as const,
    detail: (id: string | undefined) =>
      ["systemPrompts", "detail", id] as const,
  },
  settings: () => ["settings"] as const,
  achievements: () => ["achievements"] as const,
  planStatus: () => ["plan-status"] as const,
  adminUsers: () => ["admin-users"] as const,
} as const;
