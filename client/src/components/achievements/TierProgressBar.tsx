import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  unlocked: number;
  total: number;
}

const MILESTONES = [25, 50, 75, 100] as const;

/**
 * TierProgressBar — overall achievement progress (Wave 6.7a polish).
 *
 * Bigger track (h-3) + milestone markers (25/50/75/100) + textCaption canonical
 * label "X% completo · N/M desbloqueadas".
 *
 * Markers render as vertical ticks above the track; passed milestones get
 * accent color, upcoming ones muted. Pure CSS, no JS animation.
 */
export function TierProgressBar({ unlocked, total }: Props) {
  const pct = total === 0 ? 0 : (unlocked / total) * 100;

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Milestone markers */}
        <div className="absolute inset-x-0 -top-1 flex" aria-hidden="true">
          {MILESTONES.map((m) => (
            <div
              key={m}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${m}%` }}
            >
              <div
                className={cn(
                  "h-2 w-px transition-colors",
                  pct >= m ? "bg-accent" : "bg-border",
                )}
              />
            </div>
          ))}
        </div>
        <Progress value={pct} className="h-3" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {unlocked} de {total} desbloqueadas
        </span>
        <span className="text-xs font-medium text-foreground tabular-nums">
          {pct.toFixed(0)}% completo
        </span>
      </div>
    </div>
  );
}
