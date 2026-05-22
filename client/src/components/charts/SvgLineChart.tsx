import { useMemo, useState } from "react";
import { linearScale, linePath, niceTicks } from "@/lib/svg-charts";
import { formatShortDate } from "@/lib/formatters";
import { useChartTooltip, getEventPos } from "./ChartTooltip";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: LineSeries[];
  height?: number;
  formatX?: (v: string) => string;
  formatY?: (v: number) => string;
  legend?: boolean;
  /** Accessible label for screen readers. Defaults to a generic chart description. */
  ariaLabel?: string;
}

/**
 * SvgLineChart — canonical CRM lift (R8). Multi-series line chart, pure SVG.
 */
export function SvgLineChart({
  data,
  xKey,
  series,
  height = 240,
  formatX = formatShortDate,
  formatY,
  legend = true,
  ariaLabel,
}: Props) {
  const W = 800;
  const H = height;
  const padL = 56;
  const padR = 16;
  const padT = 8;
  const padB = 28;

  const fmtY = formatY ?? ((v: number) => `$${v.toFixed(v >= 100 ? 0 : 2)}`);

  const yMax = useMemo(() => {
    let m = 0;
    for (const row of data) {
      for (const s of series) {
        const v = Number(row[s.key]) || 0;
        if (v > m) m = v;
      }
    }
    return Math.max(m, 0.01);
  }, [data, series]);

  const xs = data.map((row) => String(row[xKey]));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, xs.length - 1);
  const ticksY = niceTicks(0, yMax, 4);
  const niceMaxY = Math.max(yMax, ticksY[ticksY.length - 1] || yMax);
  const y = linearScale(0, niceMaxY, H - padB, padT);

  const { show, hide, anchor } = useChartTooltip();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function handleMove(e: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x: clientX } = getEventPos(e);
    const relX = ((clientX - rect.left) / rect.width) * W;
    const span = (W - padL - padR) / Math.max(1, xs.length - 1);
    const idx = Math.max(0, Math.min(xs.length - 1, Math.round((relX - padL) / span)));
    setHoverIdx(idx);
    const row = data[idx];
    show(
      e,
      <div className="space-y-1">
        <div className="font-medium">{formatX(String(row[xKey]))}</div>
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2 font-mono tabular-nums">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground truncate max-w-[140px]">{s.label}</span>
            <span className="ml-auto text-foreground">{fmtY(Number(row[s.key]) || 0)}</span>
          </div>
        ))}
      </div>
    );
  }
  const xLabels = downsampleLabels(xs, 7);

  return (
    <div className="w-full">
      {anchor}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel ?? `Gráfico de linha com ${series.length} série(s)`}
      >
        {ticksY.map((tv, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(tv)}
              y2={y(tv)}
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y(tv)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {fmtY(tv)}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const points = data.map((row, i) => ({
            x: x(i),
            y: row[s.key] != null ? y(Number(row[s.key])) : null,
          }));
          return (
            <path
              key={s.key}
              d={linePath(points)}
              stroke={s.color}
              strokeWidth={2}
              fill="none"
            />
          );
        })}

        {xLabels.map((idx) => (
          <text
            key={idx}
            x={x(idx)}
            y={H - padB + 16}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            {formatX(xs[idx])}
          </text>
        ))}

        {/* Hover crosshair + dots */}
        {hoverIdx != null && (
          <g pointerEvents="none">
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={padT}
              y2={H - padB}
              stroke="hsl(var(--foreground))"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.4}
            />
            {series.map((s) => {
              const v = Number(data[hoverIdx]?.[s.key]) || 0;
              return (
                <circle
                  key={s.key}
                  cx={x(hoverIdx)}
                  cy={y(v)}
                  r={3.5}
                  fill={s.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        )}

        {/* Hover capture overlay */}
        <rect
          x={padL}
          y={padT}
          width={W - padL - padR}
          height={H - padT - padB}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => { setHoverIdx(null); hide(); }}
          onTouchStart={handleMove}
          onTouchMove={handleMove}
          onTouchEnd={() => { setHoverIdx(null); hide(); }}
          style={{ cursor: "crosshair" }}
        />
      </svg>

      {legend && (
        <div className="flex items-center gap-4 mt-2 flex-wrap text-xs">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-3 rounded-sm"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground truncate max-w-[180px]">{s.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function downsampleLabels(xs: string[], maxLabels: number): number[] {
  if (xs.length <= maxLabels) return xs.map((_, i) => i);
  const step = Math.ceil(xs.length / maxLabels);
  const out: number[] = [];
  for (let i = 0; i < xs.length; i += step) out.push(i);
  return out;
}
