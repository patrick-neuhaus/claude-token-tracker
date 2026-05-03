import { Progress } from "@/components/ui/progress";

interface Props {
  unlocked: number;
  total: number;
}

/**
 * TierProgressBar — overall progress bar (% of badges unlocked) + label.
 *
 * Extracted from AchievementsPage:219-222.
 */
export function TierProgressBar({ unlocked, total }: Props) {
  const pct = total === 0 ? 0 : (unlocked / total) * 100;
  return (
    <div className="space-y-1">
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground text-right tabular-nums">{pct.toFixed(0)}% completo</p>
    </div>
  );
}
