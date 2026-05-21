import { useMemo } from "react";
import { linearScale, niceTicks } from "@/lib/svg-charts";
import { useChartTooltip } from "./ChartTooltip";

export interface ScatterPoint {
  name: string;
  x: number;
  y: number;
  /** Bubble radius (calc'd from external size dim) — default 6. */
  r?: number;
}

interface Props {
  data: ScatterPoint[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  /** Tooltip content per point. Returns string for native title. */
  formatTooltip?: (p: ScatterPoint) => string;
  fillColor?: string;
  /** Accessible label for screen readers. Defaults to a generic chart description. */
  ariaLabel?: string;
}

/**
 * SvgScatterPlot — canonical CRM lift (R8). Pure SVG scatter chart with bubbles.
 */
export function SvgScatterPlot({
  data,
  height = 360,
  xLabel,
  yLabel,
  formatX = (v) => v.toFixed(0),
  formatY = (v) => v.toFixed(0),
  formatTooltip,
  fillColor = "hsl(var(--chart-1))",
  ariaLabel,
}: Props) {
  const W = 800;
  const H = height;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 40;

  const { xMax, yMax } = useMemo(() => {
    let xm = 0;
    let ym = 0;
    for (const p of data) {
      if (p.x > xm) xm = p.x;
      if (p.y > ym) ym = p.y;
    }
    return { xMax: Math.max(xm, 0.01), yMax: Math.max(ym, 0.01) };
  }, [data]);

  const xs = linearScale(0, xMax, padL, W - padR);
  const ys = linearScale(0, yMax, H - padB, padT);
  const ticksX = niceTicks(0, xMax, 5);
  const ticksY = niceTicks(0, yMax, 4);

  const { show, hide, anchor } = useChartTooltip();

  return (
    <div className="w-full" style={{ height: H }}>
      {anchor}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel ?? `Gráfico de dispersão com ${data.length} ponto(s)${xLabel && yLabel ? ` — ${xLabel} versus ${yLabel}` : ""}`}
        onMouseLeave={hide}
      >
        {/* Y grid + ticks */}
        {ticksY.map((tv, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={ys(tv)}
              y2={ys(tv)}
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={ys(tv)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {formatY(tv)}
            </text>
          </g>
        ))}

        {/* X ticks */}
        {ticksX.map((tv, i) => (
          <text
            key={i}
            x={xs(tv)}
            y={H - padB + 16}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            {formatX(tv)}
          </text>
        ))}

        {/* Axis labels */}
        {xLabel && (
          <text
            x={(W + padL - padR) / 2}
            y={H - 4}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="11"
          >
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            x={14}
            y={(H - padB + padT) / 2}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${(H - padB + padT) / 2})`}
            fill="hsl(var(--muted-foreground))"
            fontSize="11"
          >
            {yLabel}
          </text>
        )}

        {/* Points */}
        {data.map((p, i) => (
          <circle
            key={`${p.name}-${i}`}
            cx={xs(p.x)}
            cy={ys(p.y)}
            r={p.r ?? 6}
            fill={fillColor}
            fillOpacity={0.55}
            stroke={fillColor}
            strokeWidth={1}
            style={{ cursor: "pointer" }}
            onMouseMove={(e) =>
              show(
                e,
                <div className="font-mono tabular-nums whitespace-pre-line">
                  {formatTooltip ? formatTooltip(p) : p.name}
                </div>
              )
            }
          />
        ))}
      </svg>
    </div>
  );
}
