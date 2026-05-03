import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis,
} from "recharts";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { formatUSD } from "@/lib/formatters";
import { formatDuration } from "@/lib/timeFormatters";

interface ScatterDatum {
  name: string;
  tempoMin: number;
  custo: number;
  calls: number;
}

interface Props {
  data: ScatterDatum[];
  height?: number;
}

/**
 * SessionTimeScatterChart — scatter plot of cost (Y) × useful time (X), with
 * point size proportional to call count.
 *
 * Extracted from SessionTimePage:266-312. Caller pre-shapes data via useMemo.
 */
export function SessionTimeScatterChart({ data, height = 400 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 20, right: 24, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          type="number"
          dataKey="tempoMin"
          name="Tempo útil"
          tickFormatter={(v: number) => `${v.toFixed(0)}m`}
          tick={{ fontSize: 11 }}
          label={{ value: "Tempo útil (minutos)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#a0a0b8" }}
        />
        <YAxis
          type="number"
          dataKey="custo"
          name="Custo"
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          tick={{ fontSize: 11 }}
          label={{ value: "Custo (USD)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#a0a0b8" }}
        />
        <ZAxis type="number" dataKey="calls" range={[60, 400]} name="calls" />
        <Tooltip
          {...TOOLTIP_PROPS}
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const p = payload[0].payload;
              return (
                <div style={TOOLTIP_PROPS.contentStyle as React.CSSProperties}>
                  <p className="text-sm font-medium" style={TOOLTIP_PROPS.itemStyle as React.CSSProperties}>{p.name}</p>
                  <p className="text-xs" style={TOOLTIP_PROPS.labelStyle as React.CSSProperties}>
                    Tempo: {formatDuration(p.tempoMin * 60)}
                  </p>
                  <p className="text-xs" style={TOOLTIP_PROPS.labelStyle as React.CSSProperties}>
                    Custo: {formatUSD(p.custo)}
                  </p>
                  <p className="text-xs" style={TOOLTIP_PROPS.labelStyle as React.CSSProperties}>
                    Calls: {p.calls}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Scatter data={data} fill="#6366f1" fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
