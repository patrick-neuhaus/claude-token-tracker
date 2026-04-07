import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOURCE_COLORS } from "@/lib/constants";
import { formatUSD } from "@/lib/formatters";

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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Custo por Fonte</CardTitle>
      </CardHeader>
      <CardContent>
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
              contentStyle={{ background: "#1f1f23", border: "1px solid #333" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
