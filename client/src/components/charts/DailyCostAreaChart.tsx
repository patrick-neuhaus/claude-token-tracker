import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { formatUSD, formatShortDate } from "@/lib/formatters";

interface Datum {
  day: string;
  cost_usd: number;
}

interface Props {
  data: Datum[];
  /** Chart height in pixels. Default 240. */
  height?: number;
  /** Stroke + fill color. Default indigo. */
  color?: string;
}

/**
 * DailyCostAreaChart — area chart for daily cost over time.
 *
 * Extracted from ProjectDetailPage:308-329 (was inline). Reusable for any
 * day×cost timeseries (sparklines, project pages, dashboard).
 */
export function DailyCostAreaChart({
  data,
  height = 240,
  color = "#6366f1",
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="day" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v: number) => `$${v.toFixed(0)}`} tick={{ fontSize: 11 }} width={56} />
        <Tooltip
          formatter={(v) => formatUSD(Number(v))}
          labelFormatter={(v) => formatShortDate(String(v))}
          {...TOOLTIP_PROPS}
        />
        <Area
          type="monotone"
          dataKey="cost_usd"
          name="Custo"
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
