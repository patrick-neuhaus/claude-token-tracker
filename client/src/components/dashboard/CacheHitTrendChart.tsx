import { useMemo } from "react";
import { Section } from "@/components/shared/Section";
import { SvgLineChart, type LineSeries } from "@/components/charts/SvgLineChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { Activity } from "lucide-react";

interface DailyData {
  day: string;
  model: string;
  cost_usd: number;
  input_tokens: string;
  cache_read: string;
  cache_write: string;
  output_tokens: string;
  entries: number;
}

interface Props {
  data: DailyData[];
}

/**
 * CacheHitTrendChart — Wave 8.2.4 R8a: cache reuse efficiency over time.
 * Hit rate = cache_read / (cache_read + input_tokens). Higher = better reuse.
 */
export function CacheHitTrendChart({ data }: Props) {
  const { rows, avgRate } = useMemo(() => {
    const byDay: Record<string, { input: number; cache_read: number }> = {};
    for (const d of data) {
      if (!byDay[d.day]) byDay[d.day] = { input: 0, cache_read: 0 };
      byDay[d.day].input += Number(d.input_tokens) || 0;
      byDay[d.day].cache_read += Number(d.cache_read) || 0;
    }
    const sorted = Object.keys(byDay).sort();
    const rows = sorted.map((day) => {
      const { input, cache_read } = byDay[day];
      const denom = input + cache_read;
      const hit = denom > 0 ? (cache_read / denom) * 100 : 0;
      return { day, hit_rate: Number(hit.toFixed(1)) };
    });
    const totals = sorted.reduce(
      (acc, d) => ({ input: acc.input + byDay[d].input, cache_read: acc.cache_read + byDay[d].cache_read }),
      { input: 0, cache_read: 0 }
    );
    const denom = totals.input + totals.cache_read;
    const avg = denom > 0 ? (totals.cache_read / denom) * 100 : 0;
    return { rows, avgRate: avg };
  }, [data]);

  const series: LineSeries[] = [
    { key: "hit_rate", label: "Cache Hit Rate", color: "hsl(var(--success))" },
  ];

  if (rows.length === 0) {
    return (
      <Section title="Cache Hit Rate" description="Reaproveitamento de cache ao longo do tempo">
        <EmptyState icon={Activity} message="Sem dados" />
      </Section>
    );
  }

  return (
    <Section
      title="Cache Hit Rate"
      description={`Média do período: ${avgRate.toFixed(1)}%`}
    >
      <SvgLineChart
        data={rows as Array<Record<string, string | number>>}
        xKey="day"
        series={series}
        height={220}
        formatY={(v) => `${v.toFixed(0)}%`}
        legend={false}
      />
    </Section>
  );
}
