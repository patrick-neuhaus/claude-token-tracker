import { useMemo } from "react";
import { arcPath, computePieSegments } from "@/lib/svg-charts";
import { formatUSD } from "@/lib/formatters";
import { useChartTooltip } from "./ChartTooltip";

export interface PieDatum {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: PieDatum[];
  /** Chart height in px. Pie auto-sizes from height. Default 240. */
  height?: number;
  /** Inner radius ratio (0 = pie, 0.5 = donut). Default 0.5. */
  innerRatio?: number;
  /** Padding angle in radians between segments. Default 0.02. */
  paddingAngle?: number;
  /** Show legend on right. Default true. */
  legend?: boolean;
  /** Format value for legend display. Default formatUSD. */
  formatValue?: (v: number) => string;
}

/**
 * SvgPieDonut — canonical CRM lift (R8). Pure SVG, zero deps.
 * Donut chart with optional legend (right side). Native browser title tooltips.
 */
export function SvgPieDonut({
  data,
  height = 240,
  innerRatio = 0.5,
  paddingAngle = 0.02,
  legend = true,
  formatValue = formatUSD,
}: Props) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const segments = useMemo(() => computePieSegments(data, paddingAngle), [data, paddingAngle]);
  const { show, hide, anchor } = useChartTooltip();

  const chartSize = height;
  const radius = chartSize / 2 - 4;
  const innerR = radius * innerRatio;
  const cx = chartSize / 2;
  const cy = chartSize / 2;

  return (
    <div className="flex items-center gap-4 w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${chartSize} ${chartSize}`}
        width={chartSize}
        height={chartSize}
        role="img"
        aria-label="Gráfico de pizza"
        className="shrink-0"
        onMouseLeave={hide}
      >
        {segments.map((s) => {
          const pct = (s.percent * 100).toFixed(1);
          return (
            <path
              key={s.data.label}
              d={arcPath(cx, cy, innerR, radius, s.startAngle, s.endAngle)}
              fill={s.data.color}
              style={{ cursor: "pointer", transition: "opacity 120ms" }}
              onMouseMove={(e) =>
                show(
                  e,
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm" style={{ background: s.data.color }} />
                      <span className="font-medium">{s.data.label}</span>
                    </div>
                    <div className="font-mono tabular-nums text-foreground">{formatValue(s.data.value)}</div>
                    <div className="font-mono tabular-nums text-muted-foreground">{pct}% do total</div>
                  </div>
                )
              }
            />
          );
        })}
        {total === 0 && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="12"
            fontFamily="var(--font-mono)"
          >
            sem dados
          </text>
        )}
      </svg>
      {anchor}
      {legend && (
        <ul className="flex-1 min-w-0 space-y-1.5 text-sm">
          {segments.map((s) => {
            const pct = (s.percent * 100).toFixed(1);
            return (
              <li key={s.data.label} className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ background: s.data.color }}
                  aria-hidden="true"
                />
                <span className="truncate flex-1">{s.data.label}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
