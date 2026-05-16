import { useMemo } from "react";
import { SvgScatterPlot, type ScatterPoint } from "@/components/charts/SvgScatterPlot";
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
 * SessionTimeScatterChart — Wave 8.2.4 R8: SVG inline migration.
 * Cost (Y) × time (X) × calls (bubble radius).
 */
export function SessionTimeScatterChart({ data, height = 400 }: Props) {
  const points = useMemo<ScatterPoint[]>(() => {
    if (data.length === 0) return [];
    const callsMin = Math.min(...data.map((d) => d.calls));
    const callsMax = Math.max(...data.map((d) => d.calls));
    const span = Math.max(1, callsMax - callsMin);
    return data.map((d) => ({
      name: d.name,
      x: d.tempoMin,
      y: d.custo,
      r: 4 + ((d.calls - callsMin) / span) * 12,
    }));
  }, [data]);

  return (
    <SvgScatterPlot
      data={points}
      height={height}
      xLabel="Tempo útil (minutos)"
      yLabel="Custo (USD)"
      formatX={(v) => `${v.toFixed(0)}m`}
      formatY={(v) => `$${v.toFixed(0)}`}
      formatTooltip={(p) => {
        const orig = data.find((d) => d.name === p.name);
        if (!orig) return p.name;
        return `${p.name}\nTempo: ${formatDuration(orig.tempoMin * 60)}\nCusto: ${formatUSD(orig.custo)}\nCalls: ${orig.calls}`;
      }}
    />
  );
}
