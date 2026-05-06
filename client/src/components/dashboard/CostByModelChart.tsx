import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { displayModelName, getModelColor, MODEL_COLORS } from "@/lib/constants";
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

const TOP_N = 6;

/**
 * CostByModelChart — Wave 7.2: nome bruto kebab→Title Case (sem agrupar família).
 *
 * Patrick: hook envia model bruto, mostrar direto. Cor via família (consistência
 * visual). Top 6 + agrega resto em "Outros" pra evitar pie poluído.
 */
export function CostByModelChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.cost_usd - a.cost_usd);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  const restSum = rest.reduce((s, d) => s + d.cost_usd, 0);

  const chartData = [
    ...top.map((d) => ({
      name: displayModelName(d.model),
      value: d.cost_usd,
      fill: getModelColor(d.model),
    })),
    ...(rest.length > 0
      ? [{ name: `Outros (${rest.length})`, value: restSum, fill: MODEL_COLORS.outro }]
      : []),
  ];

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
