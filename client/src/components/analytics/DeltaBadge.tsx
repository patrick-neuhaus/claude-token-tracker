import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  current: number;
  last: number;
  metricType?: "cost" | "neutral";
}

function delta(current: number, last: number) {
  if (last === 0) return null;
  return ((current - last) / last) * 100;
}

/**
 * DeltaBadge — small inline badge showing % change vs previous period.
 *
 * - metricType="cost": up = bad (red), down = good (green)
 * - metricType="neutral": up = good (green), down = neutral (muted)
 */
export function DeltaBadge({ current, last, metricType = "cost" }: Props) {
  const d = delta(current, last);
  if (d === null) return <span className="text-xs text-muted-foreground">Sem mês anterior</span>;
  const up = d >= 0;
  const Icon = d === 0 ? Minus : up ? TrendingUp : TrendingDown;
  let color = "text-muted-foreground";
  if (d !== 0) {
    if (metricType === "cost") {
      color = up ? "text-red-400" : "text-green-400";
    } else {
      color = up ? "text-green-400" : "text-muted-foreground";
    }
  }
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(d).toFixed(1)}% vs mês anterior
    </span>
  );
}
