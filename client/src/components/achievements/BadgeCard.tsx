import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { TIER_STYLES, type Badge } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface Props {
  badge: Badge;
}

/**
 * BadgeCard — single achievement tile (Wave 6.7a motion polish).
 *
 * Wave 3 spec #17 — ease-spring overshoot reveal animation:
 * - IntersectionObserver triggers on viewport entry
 * - cubic-bezier(0.34, 1.56, 0.64, 1) Material spring overshoot
 * - 600ms duration, scale 0.85 → 1.05 → 1, opacity 0 → 1
 * - Reduced motion fallback: instant fade no overshoot
 *
 * Surface canonical: rounded-xl + transition-colors hover (Wave 6.1).
 * Locked badges render lower opacity + grayscale icon.
 */
export function BadgeCard({ badge }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const b = badge;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "badge-card rounded-xl border p-3 transition-colors",
        b.unlocked
          ? `bg-gradient-to-br ${TIER_STYLES[b.tier]} hover:border-accent/40`
          : "border-border bg-card opacity-50 hover:opacity-70",
        revealed && "badge-card--revealed",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "text-2xl shrink-0 transition-transform",
            !b.unlocked && "grayscale",
          )}
          aria-hidden="true"
        >
          {b.icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">{b.label}</span>
          <span className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
            {b.description}
          </span>
        </div>
      </div>
      {!b.unlocked && b.progress !== undefined && (
        <div className="mt-2 space-y-1">
          <Progress value={b.progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground tabular-nums text-right">
            {b.progressLabel}
          </p>
        </div>
      )}
      {b.unlocked && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[10px] text-success-display font-medium">
            ✓ Desbloqueada
          </span>
        </div>
      )}
    </div>
  );
}
