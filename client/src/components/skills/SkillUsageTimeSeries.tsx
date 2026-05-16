import { SvgAreaStack, type AreaSeries } from "@/components/charts/SvgAreaStack";
import { EmptyState } from "@/components/shared/EmptyState";
import { Activity } from "lucide-react";
import { formatNumber } from "@/lib/formatters";
import type { DailyCount } from "@/hooks/useSkillUsage";

interface Props {
  data: DailyCount[];
  height?: number;
}

const SERIES: AreaSeries[] = [
  { key: "allow", label: "Allow", color: "hsl(var(--chart-2))" },
  { key: "deny", label: "Deny", color: "hsl(var(--chart-5))" },
];

/**
 * SkillUsageTimeSeries — stacked area (allow + deny) por dia.
 * Reescrito com SvgAreaStack (zero deps) — substituiu recharts.
 */
export function SkillUsageTimeSeries({ data, height = 240 }: Props) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        message="Sem invocações no período"
        description="Quando o hook PreToolUse rodar, as invocações aparecem aqui."
        className="h-40 py-0"
      />
    );
  }

  const sorted = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, allow: r.allow, deny: r.deny })) as Array<
    Record<string, string | number>
  >;

  return (
    <SvgAreaStack
      data={sorted}
      xKey="date"
      series={SERIES}
      stacked
      height={height}
      formatY={(v) => formatNumber(Math.round(v))}
    />
  );
}
