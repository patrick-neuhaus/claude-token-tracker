import type { SkillSource } from "@/hooks/useSkills";

/**
 * Tailwind class strings for the Skill source badge.
 * Renamed from local `SOURCE_COLOR` (SkillsPage / SkillDetailPage) to
 * `SKILL_SOURCE_BADGE_CLS` so it doesn't collide with the unrelated
 * `SOURCE_COLORS` map in `lib/constants.ts` (which holds hex values for
 * Recharts series of token entry sources).
 */
export const SKILL_SOURCE_BADGE_CLS: Record<SkillSource, string> = {
  skillforge: "border-info/40 bg-info/10 text-info",
  omc: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  builtin: "border-border bg-muted/30 text-muted-foreground",
};

export const SKILL_SOURCE_LABEL: Record<SkillSource, string> = {
  skillforge: "skillforge",
  omc: "omc",
  builtin: "built-in",
};
