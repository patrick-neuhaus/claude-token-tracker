import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeModelFamily, MODEL_COLORS } from "@/lib/constants";
import { formatUSD, formatShortDate } from "@/lib/formatters";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";

interface DailyData {
  day: string;
  model: string;
  cost_usd: number;
}

interface Props {
  data: DailyData[];
}

export function DailyCostChart({ data }: Props) {
  // Pivot: { day, opus, sonnet, haiku, total }
  const byDay: Record<string, Record<string, number>> = {};
  for (const d of data) {
    if (!byDay[d.day]) byDay[d.day] = {};
    const family = normalizeModelFamily(d.model);
    byDay[d.day][family] = (byDay[d.day][family] || 0) + d.cost_usd;
  }

  const chartData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, models]) => {
      const total = Object.values(models).reduce((s, v) => s + v, 0);
      const label = formatShortDate(day);
      return { day: label, ...models, total };
    });

  const families = [...new Set(data.map((d) => normalizeModelFamily(d.model)))];

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Custo Diário</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#999" }} />
            <YAxis tick={{ fontSize: 12, fill: "#999" }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value, name) => [formatUSD(Number(value)), String(name)]}
              {...TOOLTIP_PROPS}
            />
            {families.map((f) => (
              <Area
                key={f}
                type="monotone"
                dataKey={f}
                stackId="1"
                fill={MODEL_COLORS[f] || MODEL_COLORS.outro}
                stroke={MODEL_COLORS[f] || MODEL_COLORS.outro}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
