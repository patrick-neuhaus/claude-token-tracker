import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { PageHeader } from "@/components/shared/PageHeader";
import { TierProgressBar } from "@/components/achievements/TierProgressBar";
import { BadgeCategorySection } from "@/components/achievements/BadgeCategorySection";
import { useAchievements, type ServerBadge, type BadgeTier } from "@/hooks/useAchievements";
import { TIER_STYLES, TIER_LABEL } from "@/lib/badges";
import type { Badge } from "@/lib/badges";

const ALL_TIERS: BadgeTier[] = ["bronze", "silver", "gold", "diamond"];

/** Adapt ServerBadge → local Badge shape used by BadgeCard / BadgeCategorySection. */
function toLocalBadge(b: ServerBadge): Badge {
  return {
    id: b.id,
    icon: b.icon,
    label: b.label,
    description: b.description,
    unlocked: b.unlocked,
    progress: b.progress,
    progressLabel: b.progressLabel,
    tier: b.tier,
    category: b.category,
  };
}

export function AchievementsPage() {
  const { data, isLoading } = useAchievements();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-full" />
        <SkeletonGrid count={4} cols={1} itemHeight="h-48" />
      </div>
    );
  }

  const badges = data.badges.map(toLocalBadge);
  const totalUnlocked = data.totalUnlocked;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conquistas"
        subtitle={`${totalUnlocked} de ${badges.length} desbloqueadas`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {ALL_TIERS.map((tier) => {
              const t = data.byTier[tier];
              return (
                <div key={tier} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-gradient-to-br ${TIER_STYLES[tier]}`}>
                  <span className="font-medium tabular-nums">{t.unlocked}/{t.total}</span>
                  <span className="text-xs text-muted-foreground">{TIER_LABEL[tier]}</span>
                </div>
              );
            })}
          </div>
        }
      />

      <TierProgressBar unlocked={totalUnlocked} total={badges.length} />

      {data.categories.map((cat) => (
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
