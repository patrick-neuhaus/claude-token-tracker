import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { PageHeader } from "@/components/shared/PageHeader";
import { TierProgressBar } from "@/components/achievements/TierProgressBar";
import { BadgeCategorySection } from "@/components/achievements/BadgeCategorySection";
import {
  computeBadges,
  BADGE_CATEGORIES,
  TIER_STYLES,
  TIER_LABEL,
  type BadgeTier,
} from "@/lib/badges";

const ALL_TIERS: BadgeTier[] = ["bronze", "silver", "gold", "diamond"];

export function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "achievements"],
    queryFn: () => api.get("/analytics/achievements"),
    staleTime: 120_000,
  });

  const badges = computeBadges(data as Parameters<typeof computeBadges>[0]);
  const totalUnlocked = badges.filter((b) => b.unlocked).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-full" />
        <SkeletonGrid count={4} cols={1} itemHeight="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conquistas"
        subtitle={`${totalUnlocked} de ${badges.length} desbloqueadas`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {ALL_TIERS.map((tier) => {
              const count = badges.filter((b) => b.tier === tier && b.unlocked).length;
              const total = badges.filter((b) => b.tier === tier).length;
              return (
                <div key={tier} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-gradient-to-br ${TIER_STYLES[tier]}`}>
                  <span className="font-medium tabular-nums">{count}/{total}</span>
                  <span className="text-xs text-muted-foreground">{TIER_LABEL[tier]}</span>
                </div>
              );
            })}
          </div>
        }
      />

      <TierProgressBar unlocked={totalUnlocked} total={badges.length} />

      {BADGE_CATEGORIES.map((cat) => (
        <BadgeCategorySection
          key={cat.key}
          icon={cat.icon}
          label={cat.label}
          badges={badges.filter((b) => b.category === cat.key)}
        />
      ))}
    </div>
  );
}
