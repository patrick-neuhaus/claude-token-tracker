import { BarChart2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DOW_LABELS_FULL } from "@/lib/constants";
import type { AnalyticsData } from "@/lib/types";

interface Props {
  heatmap: AnalyticsData["heatmap"];
}

/**
 * HeatmapWeekHour — 7×24 grid showing usage intensity by day-of-week and
 * hour. Tile alpha scales with `entries / max`. Extracted from
 * AnalyticsPage:325-365 (heatmap manual rendering block).
 */
export function HeatmapWeekHour({ heatmap }: Props) {
  if (!heatmap?.length) {
    return <EmptyState icon={BarChart2} message="Nenhum dado de uso encontrado" className="h-40 py-0" />;
  }

  const heatmapMax = Math.max(...heatmap.map((r) => r.entries), 1);
  const heatmapMatrix: Record<string, number> = {};
  for (const row of heatmap) {
    heatmapMatrix[`${row.dow}-${row.hour}`] = row.entries;
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
              const val = heatmapMatrix[`${dow}-${hour}`] || 0;
              const alpha = val === 0 ? 0.06 : 0.12 + (val / heatmapMax) * 0.88;
              return (
                <div
                  key={hour}
                  title={`${day} ${hour}h: ${val} entradas`}
                  className="rounded-sm"
                  style={{ width: 24, height: 24, minWidth: 24, background: `rgba(99,102,241,${alpha.toFixed(2)})` }}
                />
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2 pl-10">
          <span className="text-xs text-muted-foreground">Menos</span>
          {[0.06, 0.28, 0.5, 0.72, 1].map((o) => (
            <div key={o} className="rounded-sm" style={{ width: 16, height: 16, background: `rgba(99,102,241,${o})` }} />
          ))}
          <span className="text-xs text-muted-foreground">Mais</span>
        </div>
      </div>
    </div>
  );
}
