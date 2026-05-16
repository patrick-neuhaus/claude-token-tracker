import { SvgAreaStack, type AreaSeries } from "./SvgAreaStack";

interface Datum {
  day: string;
  cost_usd: number;
}

interface Props {
  data: Datum[];
  height?: number;
  color?: string;
}

/**
 * DailyCostAreaChart — Wave 8.2.4 R8: SVG inline migration.
 * Single-series area chart for daily cost timeseries.
 */
export function DailyCostAreaChart({
  data,
  height = 240,
  color = "hsl(var(--chart-1))",
}: Props) {
  const series: AreaSeries[] = [{ key: "cost_usd", label: "Custo", color }];
  return (
    <SvgAreaStack
      data={data as Array<Record<string, string | number>>}
      xKey="day"
      series={series}
      stacked={false}
      height={height}
    />
  );
}
