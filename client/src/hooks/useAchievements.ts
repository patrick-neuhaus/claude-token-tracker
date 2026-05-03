import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type BadgeTier = "bronze" | "silver" | "gold" | "diamond";

export interface ServerBadge {
  id: string;
  icon: string;
  label: string;
  description: string;
  tier: BadgeTier;
  category: string;
  unlocked: boolean;
  progress: number;
  progressLabel: string;
  target: number;
}

export interface BadgeCategory {
  key: string;
  label: string;
  icon: string;
}

export interface AchievementsResponse {
  badges: ServerBadge[];
  totalUnlocked: number;
  total: number;
  byTier: Record<BadgeTier, { unlocked: number; total: number }>;
  categories: BadgeCategory[];
  /** Raw stats — useful for debugging / future surfaces */
  stats: Record<string, number | boolean>;
}

/**
 * useAchievements — Wave B4.1 V001
 *
 * Server-side authoritative achievements catalog. Replaces local computeBadges
 * calls in AchievementsPage and AchievementNotifier.
 */
export function useAchievements() {
  return useQuery<AchievementsResponse>({
    queryKey: ["achievements"],
    queryFn: () => api.get("/achievements"),
    staleTime: 60_000,
  });
}
