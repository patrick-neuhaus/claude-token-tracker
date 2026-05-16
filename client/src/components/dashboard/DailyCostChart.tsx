import { useMemo } from "react";
import { normalizeModelFamily, MODEL_COLORS } from "@/lib/constants";
import { surface, surfaceHeader, surfaceContent } from "@/lib/surface";
import { SvgAreaStack, type AreaSeries } from "@/components/charts/SvgAreaStack";

interface DailyData {
  day: string;
  model: string;
  cost_usd: number;
}

interface Props {
  data: DailyData[];
}

/**
 * DailyCostChart — Wave 8.2.4 R8: SVG inline migration.
 * Stacked area chart por família (Opus/Sonnet/Haiku).
 */
export function DailyCostChart({ data }: Props) {
  const { rows, families } = useMemo(() => {
    const byDay: Record<string, Record<string, number>> = {};
    for (const d of data) {
      if (!byDay[d.day]) byDay[d.day] = {};
      const family = normalizeModelFamily(d.model);
      byDay[d.day][family] = (byDay[d.day][family] || 0) + d.cost_usd;
    }
    const fams = [...new Set(data.map((d) => normalizeModelFamily(d.model)))];
    const sortedDays = Object.keys(byDay).sort();
    const rows = sortedDays.map((day) => ({
      day,
      ...Object.fromEntries(fams.map((f) => [f, byDay[day][f] || 0])),
    }));
    return { rows, families: fams };
  }, [data]);

  const series: AreaSeries[] = families.map((f) => ({
    key: f,
    label: f,
    color: MODEL_COLORS[f] || MODEL_COLORS.outro,
  }));

  return (
    <div className={`${surface.section} col-span-2`}>
      <div className={surfaceHeader}>
        <h3 className="text-sm font-medium">Custo Diário</h3>
      </div>
      <div className={surfaceContent}>
        <SvgAreaStack data={rows} xKey="day" series={series} stacked height={300} />
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 flex-wrap text-xs">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground capitalize">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
