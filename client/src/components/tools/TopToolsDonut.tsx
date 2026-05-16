import { useMemo } from "react";
import { SvgPieDonut } from "@/components/charts/SvgPieDonut";
import { EmptyState } from "@/components/shared/EmptyState";
import type { TopToolRow } from "@/hooks/useToolStats";

const TOOL_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface Props {
  data: TopToolRow[];
}

/**
 * TopToolsDonut — top 5 tools by invocation count as a donut chart.
 * Uses the canonical SvgPieDonut (zero external deps).
 */
export function TopToolsDonut({ data }: Props) {
  const top5 = data.slice(0, 5);

  const pieData = useMemo(
    () =>
      top5.map((t, i) => ({
        label: t.tool_name,
        value: t.count,
        color: TOOL_COLORS[i % TOOL_COLORS.length],
      })),
    [top5]
  );

  if (pieData.length === 0) {
    return (
      <EmptyState message="Nenhum tool registrado ainda. Configure o hook tool-use-tracker.ps1 para começar a rastrear." />
    );
  }

  return (
    <SvgPieDonut
      data={pieData}
      height={220}
      innerRatio={0.55}
      formatValue={(v) => `${v} chamadas`}
    />
  );
}
