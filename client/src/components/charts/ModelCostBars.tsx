import { useMemo } from "react";
import { displayModelName, getModelColor, MODEL_COLORS } from "@/lib/constants";
import { formatUSD, formatTokens } from "@/lib/formatters";
import { useChartTooltip } from "./ChartTooltip";

interface Datum {
  model: string;
  cost_usd: number;
  total_tokens?: string | number;
  entries?: number;
}

interface Props {
  data: Datum[];
  /** Max bars before grouping into "Outros (n)". Default 10. */
  maxBars?: number;
  /** Top N highlighted with distinct colors; rest use muted. Default 4. */
  topN?: number;
}

/**
 * ModelCostBars — Wave 8.2.4 R8-FIX: horizontal bar list, ordered DESC by cost.
 * Replaces donut for "Custo por Modelo" — every model visible, no 0.0% lies.
 */
export function ModelCostBars({ data, maxBars = 10, topN = 4 }: Props) {
  const { rows, total } = useMemo(() => {
    const sorted = [...data]
      .filter((d) => d.cost_usd > 0)
      .sort((a, b) => b.cost_usd - a.cost_usd);
    const total = sorted.reduce((s, d) => s + d.cost_usd, 0);
    if (sorted.length <= maxBars) return { rows: sorted, total };
    const top = sorted.slice(0, maxBars - 1);
    const rest = sorted.slice(maxBars - 1);
    const restSum = rest.reduce((s, d) => s + d.cost_usd, 0);
    return {
      rows: [
        ...top,
        { model: `__rest_${rest.length}`, cost_usd: restSum, _grouped: rest.length },
      ] as (Datum & { _grouped?: number })[],
      total,
    };
  }, [data, maxBars]);

  const max = rows.reduce((m, r) => Math.max(m, r.cost_usd), 0) || 1;

  const { show, hide, anchor } = useChartTooltip();

  if (rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-4 text-center">Sem modelos no período</div>
    );
  }

  return (
    <div className="flex flex-col gap-2" onMouseLeave={hide}>
      {anchor}
      {rows.map((r, i) => {
        const grouped = (r as Datum & { _grouped?: number })._grouped;
        const label = grouped
          ? `Outros (${grouped})`
          : displayModelName(r.model);
        const widthPct = (r.cost_usd / max) * 100;
        const sharePct = total > 0 ? (r.cost_usd / total) * 100 : 0;
        // Cor por família de modelo (consistente com DailyCostChart). "Outros (n)" usa cor de fallback.
        // topN além disso ainda atenua via muted pra reduzir ruído visual.
        const familyColor = grouped ? MODEL_COLORS.outro : getModelColor(r.model);
        const color = i < topN ? familyColor : "hsl(var(--muted-foreground) / 0.5)";
        const shareLabel = sharePct >= 0.1 ? `${sharePct.toFixed(1)}%` : `<0.1%`;
        return (
          <div
            key={r.model + i}
            className="flex items-center gap-3 text-sm rounded-sm transition-colors hover:bg-muted/40 px-1 -mx-1 cursor-pointer"
            onMouseMove={(e) =>
              show(
                e,
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
                    <span className="font-medium">{label}</span>
                  </div>
                  <div className="font-mono tabular-nums text-foreground">{formatUSD(r.cost_usd)}</div>
                  <div className="font-mono tabular-nums text-muted-foreground">{shareLabel} do total</div>
                  {r.total_tokens != null && (
                    <div className="font-mono tabular-nums text-muted-foreground">{formatTokens(Number(r.total_tokens))} tokens</div>
                  )}
                  {r.entries != null && (
                    <div className="font-mono tabular-nums text-muted-foreground">{r.entries} entradas</div>
                  )}
                </div>
              )
            }
          >
            <div className="w-40 truncate text-foreground">
              {label}
            </div>
            <div className="flex-1 relative h-6 bg-muted/30 rounded-sm overflow-hidden min-w-0">
              <div
                className="absolute inset-y-0 left-0 rounded-sm transition-[width]"
                style={{ width: `${Math.max(widthPct, 0.4)}%`, background: color }}
              />
            </div>
            <div className="w-24 text-right font-mono text-xs text-foreground tabular-nums shrink-0">
              {formatUSD(r.cost_usd)}
            </div>
            <div className="w-14 text-right font-mono text-xs text-muted-foreground tabular-nums shrink-0">
              {shareLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
