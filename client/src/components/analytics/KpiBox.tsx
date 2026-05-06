import { useRef, type ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  /** Suffix string after value (e.g. "/h", "dias", "%"). */
  suffix?: string;
  /** Secondary line below value (existing API). */
  hint?: ReactNode;
  /** % change vs comparison period. Renders trend arrow + colored badge. */
  delta?: number | null;
  /** Free-text comparison label (e.g. "vs mês anterior"). Pairs with delta. */
  comparison?: string;
  /** Delta semantics: "cost" (up=bad) or "neutral" (up=good). Default: "cost". */
  metricType?: "cost" | "neutral";
  /** Count-up 0→value on viewport entry. Default true. */
  animate?: boolean;
}

/**
 * KpiBox — analytics KPI tile. Wave 6.3 lift to canonical anatomy:
 * - 28px value medium tabular-nums (canonical MetricCard pattern)
 * - Count-up via shared useCountUp hook (respects reduced-motion)
 * - Optional delta + comparison line (parity with anti-ai-design-system MetricCard)
 *
 * Distinct from StatCard: KpiBox accepts ReactNode icon (custom-colored)
 * + inline icon-label, no accent chip. Used in analytics streaks/period KPIs.
 */
export function KpiBox({
  icon,
  label,
  value,
  suffix,
  hint,
  delta,
  comparison,
  metricType = "cost",
  animate = true,
}: Props) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const display = useCountUp(valueRef, value);
  const finalValue = animate ? display : value;

  const hasDelta = delta != null && Number.isFinite(delta);
  const up = hasDelta && delta! >= 0;
  const DeltaIcon = !hasDelta ? null : delta === 0 ? Minus : up ? TrendingUp : TrendingDown;
  let deltaColor = "text-muted-foreground";
  if (hasDelta && delta !== 0) {
    if (metricType === "cost") {
      deltaColor = up ? "text-destructive" : "text-success-display";
    } else {
      deltaColor = up ? "text-success-display" : "text-muted-foreground";
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 transition-colors hover:border-accent/40">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          ref={valueRef}
          className="font-medium tabular-nums leading-none text-foreground tracking-tight"
          style={{ fontSize: 28 }}
        >
          {finalValue}
        </span>
        {suffix && (
          <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
        )}
      </div>
      {(hasDelta || comparison || hint) && (
        <div className="flex items-center gap-2 mt-2 text-xs min-w-0">
          {hasDelta && DeltaIcon && (
            <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", deltaColor)}>
              <DeltaIcon className="h-3 w-3" aria-hidden="true" />
              {Math.abs(delta!).toFixed(1)}%
            </span>
          )}
          {comparison && <span className="text-muted-foreground truncate">{comparison}</span>}
          {!comparison && hint && <span className="text-muted-foreground truncate">{hint}</span>}
        </div>
      )}
    </div>
  );
}
