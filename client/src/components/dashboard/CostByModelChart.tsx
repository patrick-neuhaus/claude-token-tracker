import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { normalizeModelFamily, MODEL_COLORS } from "@/lib/constants";
import { formatUSD } from "@/lib/formatters";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { surface, surfaceHeader, surfaceContent } from "@/lib/surface";

interface ModelData {
  model: string;
  cost_usd: number;
}

interface Props {
  data: ModelData[];
}

export function CostByModelChart({ data }: Props) {
  const grouped = data.reduce<Record<string, number>>((acc, d) => {
    const family = normalizeModelFamily(d.model);
    acc[family] = (acc[family] || 0) + d.cost_usd;
    return acc;
  }, {});

  const chartData = Object.entries(grouped)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className={surface.section}>
      <div className={surfaceHeader}>
        <h3 className="text-sm font-medium">Custo por Modelo</h3>
      </div>
      <div className={surfaceContent}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
            >
              {chartData.map((d) => (
                <Cell key={d.name} fill={MODEL_COLORS[d.name.toLowerCase()] || MODEL_COLORS.outro} />
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
