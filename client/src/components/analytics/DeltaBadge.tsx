import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  last: number;
  metricType?: "cost" | "neutral";
  /** Custom comparison label. Default: "vs mês anterior". */
  comparisonLabel?: string;
}

function delta(current: number, last: number) {
  if (last === 0) return null;
  return ((current - last) / last) * 100;
}

/**
 * DeltaBadge — % change vs previous period (Wave 6.3 lift to canonical tokens).
 *
 * Wave 6.3 fix: drift on `text-red-400`/`text-green-400` (Tailwind palette
 * direto) → canonical `text-destructive`/`text-success-display`. Aligns with
 * dark+light theme tokens + brand Artemis.
 *
 * - metricType="cost": up = bad (destructive), down = good (success-display)
 * - metricType="neutral": up = good (success-display), down = neutral (muted-foreground)
 */
export function DeltaBadge({ current, last, metricType = "cost", comparisonLabel = "vs mês anterior" }: Props) {
  const d = delta(current, last);
  if (d === null) {
    return <span className="text-xs text-muted-foreground">Sem mês anterior</span>;
  }
  const up = d >= 0;
  const Icon = d === 0 ? Minus : up ? TrendingUp : TrendingDown;

  let color = "text-muted-foreground";
  if (d !== 0) {
    if (metricType === "cost") {
      color = up ? "text-destructive" : "text-success-display";
    } else {
      color = up ? "text-success-display" : "text-muted-foreground";
    }
  }

  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium tabular-nums", color)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {Math.abs(d).toFixed(1)}% {comparisonLabel}
    </span>
  );
}
