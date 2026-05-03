import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import { MODEL_COLORS, normalizeModelFamily } from "@/lib/constants";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { formatUSD } from "@/lib/formatters";

interface Datum {
  model: string;
  cost_usd: number;
}

interface Props {
  data: Datum[];
  /** Chart height in pixels. Default 240. */
  height?: number;
  /** Pie inner radius. Default 40. */
  innerRadius?: number;
  /** Pie outer radius. Default 80. */
  outerRadius?: number;
}

/**
 * ModelPieChart — donut chart of cost grouped by normalized model family.
 *
 * ZERO-DIFF extraction: identical structure between ProjectDetailPage:344-362
 * and SessionDetailPage:201-225. Reuses MODEL_COLORS + normalizeModelFamily
 * from constants.
 *
 * Caller passes raw `[{ model, cost_usd }]` rows; component handles the
 * groupBy + percentage tooltip formatting.
 */
export function ModelPieChart({
  data,
  height = 240,
  innerRadius = 40,
  outerRadius = 80,
}: Props) {
  const grouped = data.reduce<Record<string, number>>((acc, d) => {
    const family = normalizeModelFamily(d.model);
    acc[family] = (acc[family] || 0) + d.cost_usd;
    return acc;
  }, {});

  const modelPie = Object.entries(grouped)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  const modelTotal = modelPie.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={modelPie}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
        >
          {modelPie.map((d) => (
            <Cell key={d.name} fill={MODEL_COLORS[d.name.toLowerCase()] || MODEL_COLORS.outro} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [
            `${formatUSD(Number(value))} (${modelTotal > 0 ? ((Number(value) / modelTotal) * 100).toFixed(1) : 0}%)`,
            "Custo",
          ]}
          {...TOOLTIP_PROPS}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
