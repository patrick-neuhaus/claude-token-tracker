import { useState, useMemo } from "react";
import { BarChart2, X } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DOW_LABELS_FULL } from "@/lib/constants";
import { formatUSD } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/lib/types";

interface Props {
  heatmap: AnalyticsData["heatmap"];
}

interface Selection {
  dow: number;
  hour: number;
}

type Metric = "entries" | "cost";

/**
 * HeatmapWeekHour — 7×24 grid showing usage intensity by day-of-week and hour.
 *
 * R8c: toggle entre métricas (entradas vs custo). Quartis recalculados por métrica.
 */
export function HeatmapWeekHour({ heatmap }: Props) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [metric, setMetric] = useState<Metric>("entries");

  const heatmapMatrix = useMemo(() => {
    const out: Record<string, { entries: number; cost: number }> = {};
    for (const row of (heatmap || [])) {
      out[`${row.dow}-${row.hour}`] = {
        entries: row.entries,
        cost: row.cost_usd ?? 0,
      };
    }
    return out;
  }, [heatmap]);

  const buckets = useMemo(() => {
    const values = (heatmap || [])
      .map((r) => (metric === "entries" ? r.entries : r.cost_usd ?? 0))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    function quantile(arr: number[], q: number): number {
      if (arr.length === 0) return 0;
      const pos = (arr.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
    }
    return {
      q25: quantile(values, 0.25),
      q50: quantile(values, 0.5),
      q75: quantile(values, 0.75),
    };
  }, [heatmap, metric]);

  if (!heatmap?.length) {
    return <EmptyState icon={BarChart2} message="Nenhum dado de uso encontrado" className="h-40 py-0" />;
  }

  function bucketAlpha(val: number): number {
    if (val === 0) return 0.06;
    if (val <= buckets.q25) return 0.22;
    if (val <= buckets.q50) return 0.45;
    if (val <= buckets.q75) return 0.7;
    return 0.95;
  }

  function getValue(cell: { entries: number; cost: number } | undefined): number {
    if (!cell) return 0;
    return metric === "entries" ? cell.entries : cell.cost;
  }

  function formatValue(val: number): string {
    if (metric === "entries") return `${val} entradas`;
    return formatUSD(val);
  }

  const selectedData = selected ? heatmapMatrix[`${selected.dow}-${selected.hour}`] : null;
  const selectedDay = selected ? DOW_LABELS_FULL[selected.dow] : null;

  function toggleCell(dow: number, hour: number) {
    if (selected && selected.dow === dow && selected.hour === hour) {
      setSelected(null);
    } else {
      setSelected({ dow, hour });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div role="group" aria-label="Métrica" className="inline-flex items-center gap-1 rounded-md p-1 bg-muted/40 border border-border/60">
          {([
            { value: "entries", label: "Entradas" },
            { value: "cost", label: "Custo" },
          ] as const).map((opt) => {
            const active = metric === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMetric(opt.value)}
                aria-pressed={active}
                className={cn(
                  "px-2.5 py-1.5 text-xs rounded transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 mb-1 pl-10">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="w-6 text-center text-xs text-muted-foreground" style={{ minWidth: 24 }}>
                {h % 4 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {DOW_LABELS_FULL.map((day, dow) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <div className="w-8 text-right text-xs text-muted-foreground pr-2">{day}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = heatmapMatrix[`${dow}-${hour}`];
                const val = getValue(cell);
                const alpha = bucketAlpha(val);
                const isSelected = selected?.dow === dow && selected?.hour === hour;
                return (
                  <button
                    type="button"
                    key={hour}
                    onClick={() => toggleCell(dow, hour)}
                    title={`${day} ${hour}h: ${formatValue(val)}`}
                    aria-label={`${day} ${hour}h: ${formatValue(val)}`}
                    aria-pressed={isSelected}
                    className={`rounded-sm transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected ? "ring-2 ring-ring scale-110" : ""
                    }`}
                    style={{ width: 24, height: 24, minWidth: 24, background: `hsl(var(--chart-1) / ${alpha.toFixed(2)})` }}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pl-10">
            <span className="text-xs text-muted-foreground">Menos</span>
            {[0.06, 0.22, 0.45, 0.7, 0.95].map((o) => (
              <div key={o} className="rounded-sm" style={{ width: 16, height: 16, background: `hsl(var(--chart-1) / ${o})` }} />
            ))}
            <span className="text-xs text-muted-foreground">Mais</span>
          </div>

          {selected && selectedData && selectedDay && (
            <div className="mt-3 ml-10 inline-flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">
                {selectedDay} · {selected.hour}h–{selected.hour + 1}h
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-foreground tabular-nums">{selectedData.entries} entradas</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-foreground tabular-nums">{formatUSD(selectedData.cost)}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fechar detalhe"
                className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
