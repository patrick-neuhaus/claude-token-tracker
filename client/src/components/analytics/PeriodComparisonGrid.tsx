import { surface } from "@/lib/surface";
import { formatUSD, formatTokens } from "@/lib/formatters";
import { DeltaBadge } from "./DeltaBadge";
import type { AnalyticsData } from "@/lib/types";

interface Props {
  periodComparison: AnalyticsData["period_comparison"];
}

/**
 * PeriodComparisonGrid — 3 cards (cost / tokens / entries) with delta vs
 * previous month. Extracted from AnalyticsPage:262-295.
 */
export function PeriodComparisonGrid({ periodComparison }: Props) {
  const items = [
    {
      label: "Custo este mês",
      current: periodComparison?.current_month ?? 0,
      last: periodComparison?.last_month ?? 0,
      fmt: (v: number) => formatUSD(v),
      metricType: "cost" as const,
    },
    {
      label: "Tokens este mês",
      current: Number(periodComparison?.current_tokens ?? 0),
      last: Number(periodComparison?.last_tokens ?? 0),
      fmt: (v: number) => formatTokens(v),
      metricType: "neutral" as const,
    },
    {
      label: "Entradas este mês",
      current: periodComparison?.current_entries ?? 0,
      last: periodComparison?.last_entries ?? 0,
      fmt: (v: number) => String(v),
      metricType: "neutral" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map(({ label, current, last, fmt, metricType }) => (
        <div key={label} className={`${surface.section} px-5 py-4`}>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="text-2xl font-semibold tabular-nums mt-1">{fmt(current)}</div>
          <div className="mt-1">
            <DeltaBadge current={current} last={last} metricType={metricType} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Mês anterior: {fmt(last)}</p>
        </div>
      ))}
    </div>
  );
}
