import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import { MODEL_COLORS, displayModelName, getModelColor } from "@/lib/constants";
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

const TOP_N = 6;

/**
 * ModelPieChart — Wave 7.2: nome bruto kebab→Title Case sem agrupar família.
 * Cor via família pra consistência visual. Top 6 + "Outros" se >6 models.
 */
export function ModelPieChart({
  data,
  height = 240,
  innerRadius = 40,
  outerRadius = 80,
}: Props) {
  const sorted = [...data].sort((a, b) => b.cost_usd - a.cost_usd);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  const restSum = rest.reduce((s, d) => s + d.cost_usd, 0);

  const modelPie = [
    ...top.map((d) => ({
      name: displayModelName(d.model),
      value: d.cost_usd,
      fill: getModelColor(d.model),
    })),
    ...(rest.length > 0
      ? [{ name: `Outros (${rest.length})`, value: restSum, fill: MODEL_COLORS.outro }]
      : []),
  ];

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
            <Cell key={d.name} fill={d.fill} />
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
