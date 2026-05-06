import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SOURCE_COLORS, displayLabel } from "@/lib/constants";
import { formatUSD } from "@/lib/formatters";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { surface, surfaceHeader, surfaceContent } from "@/lib/surface";

interface SourceData {
  source: string;
  cost_usd: number;
}

interface Props {
  data: SourceData[];
}

/**
 * CostBySourceChart — Wave 7.2: source label kebab→Title Case via displayLabel.
 * "claude-code" → "Claude Code", "codex" → "Codex". Color lookup via raw key.
 */
export function CostBySourceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: displayLabel(d.source),
    value: d.cost_usd,
    fill: SOURCE_COLORS[d.source] || "hsl(var(--muted-foreground))",
  }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className={surface.section}>
      <div className={surfaceHeader}>
        <h3 className="text-sm font-medium">Custo por Fonte</h3>
      </div>
      <div className={surfaceContent}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {chartData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                `${formatUSD(Number(value))} (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`,
                "Custo",
              ]}
              {...TOOLTIP_PROPS}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
