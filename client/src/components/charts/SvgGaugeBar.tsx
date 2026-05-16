import { formatUSD } from "@/lib/formatters";

interface Props {
  /** Spent so far (USD). */
  spent: number;
  /** Plan budget (USD). */
  budget: number;
  /** Optional label for the gauge. Default "Plano mensal". */
  label?: string;
  /** Show daily target line (budget/30). Default true. */
  showDailyTarget?: boolean;
  /** Days into the cycle (for daily target prorate). Default 1. */
  dayOfCycle?: number;
}

/**
 * SvgGaugeBar — Cost vs Plan Budget gauge (R8 NEW chart).
 *
 * Insight único do tracker: rastreia gasto vs orçamento mensal.
 * Mostra:
 * - Barra de progresso (verde <80%, warning 80-100%, danger >100%)
 * - Marca de "meta diária" (budget/30 × dayOfCycle) — pra ver se está no pace
 * - Texto: spent/budget + % + delta vs daily target
 */
export function SvgGaugeBar({
  spent,
  budget,
  label = "Plano mensal",
  showDailyTarget = true,
  dayOfCycle = 1,
}: Props) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const dailyTarget = budget > 0 ? (budget / 30) * Math.max(1, dayOfCycle) : 0;
  const dailyTargetPct = budget > 0 ? (dailyTarget / budget) * 100 : 0;

  const barColor =
    pct > 100 ? "hsl(var(--destructive))" : pct > 80 ? "hsl(var(--warning))" : "hsl(var(--success))";

  const onPace = spent <= dailyTarget;
  const delta = spent - dailyTarget;

  // Bar geometry
  const W = 100;
  const H = 8;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="kpi-label">{label}</div>
          <div className="font-display text-2xl font-semibold leading-none mt-1 tabular-nums">
            {formatUSD(spent)}
            <span className="text-sm text-muted-foreground font-normal ml-2">
              / {formatUSD(budget)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="kpi-label">{pct.toFixed(0)}% usado</div>
          {showDailyTarget && budget > 0 && (
            <div className={`text-xs font-mono mt-1 ${onPace ? "text-success" : "text-destructive"}`}>
              {onPace ? "↓" : "↑"} {formatUSD(Math.abs(delta))} {onPace ? "abaixo" : "acima"} da meta diária
            </div>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`${label}: ${pct.toFixed(0)}% usado`}>
        {/* Track */}
        <rect x="0" y="0" width={W} height={H} fill="hsl(var(--muted))" rx={H / 2} ry={H / 2} />
        {/* Filled */}
        <rect
          x="0"
          y="0"
          width={Math.min(pct, 100)}
          height={H}
          fill={barColor}
          rx={H / 2}
          ry={H / 2}
        />
        {/* Daily target marker */}
        {showDailyTarget && budget > 0 && dailyTargetPct > 0 && dailyTargetPct < 100 && (
          <line
            x1={dailyTargetPct}
            x2={dailyTargetPct}
            y1="-2"
            y2={H + 2}
            stroke="hsl(var(--foreground))"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.6"
          >
            <title>Meta diária ({formatUSD(dailyTarget)})</title>
          </line>
        )}
      </svg>
    </div>
  );
}
