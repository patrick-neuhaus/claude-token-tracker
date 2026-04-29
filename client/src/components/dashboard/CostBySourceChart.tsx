import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SOURCE_COLORS } from "@/lib/constants";
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

export function CostBySourceChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.cost_usd, 0);

  return (
    <div className={surface.section}>
      <div className={surfaceHeader}>
        <h3 className="text-sm font-medium">Custo por Fonte</h3>
      </div>
      <div className={surfaceContent}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="cost_usd" nameKey="source" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.source} fill={SOURCE_COLORS[d.source] || "#6b7280"} />
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
