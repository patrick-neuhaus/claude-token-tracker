import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { formatShortDate, formatNumber } from "@/lib/formatters";
import { EmptyState } from "@/components/shared/EmptyState";
import { Activity } from "lucide-react";
import type { DailyCount } from "@/hooks/useSkillUsage";

interface Props {
  data: DailyCount[];
  height?: number;
}

const COLOR_ALLOW = "hsl(var(--chart-2))"; // green
const COLOR_DENY = "hsl(var(--chart-5))"; // magenta/red-ish — destaque

/**
 * SkillUsageTimeSeries — AreaChart empilhado (allow + deny) por dia.
 *
 * Pattern derivado de DailyCostAreaChart + DailyCostChart (multi-series stacked).
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

  // Garantir ordenação por data
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={sorted}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => formatNumber(v)}
          tick={{ fontSize: 11 }}
          width={48}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(v, name) => [formatNumber(Number(v)), String(name)]}
          labelFormatter={(v) => formatShortDate(String(v))}
          {...TOOLTIP_PROPS}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area
          type="monotone"
          dataKey="allow"
          name="Allow"
          stackId="1"
          stroke={COLOR_ALLOW}
          fill={COLOR_ALLOW}
          fillOpacity={0.4}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="deny"
          name="Deny"
          stackId="1"
          stroke={COLOR_DENY}
          fill={COLOR_DENY}
          fillOpacity={0.4}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
