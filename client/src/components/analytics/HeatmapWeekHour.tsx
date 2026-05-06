import { useState } from "react";
import { BarChart2, X } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DOW_LABELS_FULL } from "@/lib/constants";
import { formatUSD } from "@/lib/formatters";
import type { AnalyticsData } from "@/lib/types";

interface Props {
  heatmap: AnalyticsData["heatmap"];
}

interface Selection {
  dow: number;
  hour: number;
}

/**
 * HeatmapWeekHour — 7×24 grid showing usage intensity by day-of-week and hour.
 *
 * Wave 7.6: tiles agora clickable buttons. Click abre detail panel inline com
 * dia/hora/entries/cost. Click again mesmo tile OR Clear botão fecha.
 * Color via brand chart-1 token (Wave 7.6 Patch).
 */
export function HeatmapWeekHour({ heatmap }: Props) {
  const [selected, setSelected] = useState<Selection | null>(null);

  if (!heatmap?.length) {
    return <EmptyState icon={BarChart2} message="Nenhum dado de uso encontrado" className="h-40 py-0" />;
  }

  const heatmapMax = Math.max(...heatmap.map((r) => r.entries), 1);
  const heatmapMatrix: Record<string, { entries: number; cost: number }> = {};
  for (const row of heatmap) {
    heatmapMatrix[`${row.dow}-${row.hour}`] = {
      entries: row.entries,
      cost: row.cost_usd ?? 0,
    };
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
              const val = cell?.entries ?? 0;
              const alpha = val === 0 ? 0.06 : 0.12 + (val / heatmapMax) * 0.88;
              const isSelected = selected?.dow === dow && selected?.hour === hour;
              return (
                <button
                  type="button"
                  key={hour}
                  onClick={() => toggleCell(dow, hour)}
                  title={`${day} ${hour}h: ${val} entradas`}
                  aria-label={`${day} ${hour}h: ${val} entradas`}
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
          {[0.06, 0.28, 0.5, 0.72, 1].map((o) => (
            <div key={o} className="rounded-sm" style={{ width: 16, height: 16, background: `hsl(var(--chart-1) / ${o})` }} />
          ))}
          <span className="text-xs text-muted-foreground">Mais</span>
        </div>

        {/* Wave 7.6: detail panel inline quando célula selecionada */}
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
  );
}
