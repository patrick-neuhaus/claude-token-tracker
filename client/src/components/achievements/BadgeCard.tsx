import { Progress } from "@/components/ui/progress";
import { TIER_STYLES, type Badge } from "@/lib/badges";

interface Props {
  badge: Badge;
}

/**
 * BadgeCard — atom for a single achievement tile. Locked badges render
 * grayscale with progress bar; unlocked render with tier gradient.
 *
 * Extracted from AchievementsPage:236-264.
 */
export function BadgeCard({ badge }: Props) {
  const b = badge;

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        b.unlocked
          ? `bg-gradient-to-br ${TIER_STYLES[b.tier]} hover:bg-card/80`
          : "opacity-40 hover:opacity-60"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xl ${b.unlocked ? "" : "grayscale"}`}>{b.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">{b.label}</span>
          <span className="text-[11px] text-muted-foreground">{b.description}</span>
        </div>
      </div>
      {!b.unlocked && b.progress !== undefined && (
        <div className="mt-2 space-y-1">
          <Progress value={b.progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground tabular-nums text-right">{b.progressLabel}</p>
        </div>
      )}
      {b.unlocked && (
        <div className="mt-1">
          <span className="text-[10px] text-muted-foreground">✓ Desbloqueada</span>
        </div>
      )}
    </div>
  );
}
