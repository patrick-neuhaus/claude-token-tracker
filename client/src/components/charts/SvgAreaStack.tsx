import { useMemo, useState } from "react";
import { linearScale, areaPath, linePath, niceTicks } from "@/lib/svg-charts";
import { formatUSD, formatShortDate } from "@/lib/formatters";
import { useChartTooltip } from "./ChartTooltip";

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  /** Data rows: {x: string, [seriesKey]: number}[] */
  data: Array<Record<string, string | number>>;
  /** X axis key (e.g. "day"). */
  xKey: string;
  /** Series definitions in stack order (bottom→top). */
  series: AreaSeries[];
  /** Stack mode? If false, draws separate areas. Default true. */
  stacked?: boolean;
  /** Chart height in px. Default 240. */
  height?: number;
  /** Format X axis tick. Default formatShortDate. */
  formatX?: (v: string) => string;
  /** Format Y axis tick + tooltip. Default formatUSD short. */
  formatY?: (v: number) => string;
}

/**
 * SvgAreaStack — canonical CRM lift (R8). Pure SVG stacked/single area chart.
 * No deps. ViewBox responsive. Auto-fit dimensions via container.
 */
export function SvgAreaStack({
  data,
  xKey,
  series,
  stacked = true,
  height = 240,
  formatX = formatShortDate,
  formatY,
}: Props) {
  const W = 800; // viewBox width — scales via preserveAspectRatio
  const H = height;
  const padL = 48;
  const padR = 16;
  const padT = 8;
  const padB = 28;

  const fmtY = formatY ?? ((v: number) => `$${v.toFixed(v >= 100 ? 0 : 1)}`);

  const stackedData = useMemo(() => {
    if (!stacked) return null;
    return data.map((row) => {
      let acc = 0;
      const out: Record<string, number> = {};
      for (const s of series) {
        const v = Number(row[s.key]) || 0;
        out[`${s.key}_y0`] = acc;
        acc += v;
        out[`${s.key}_y1`] = acc;
      }
      out._total = acc;
      return { ...row, ...out };
    });
  }, [data, series, stacked]);

  const yMax = useMemo(() => {
    if (stacked && stackedData) {
      return Math.max(...stackedData.map((r) => r._total as number), 0.01);
    }
    let m = 0;
    for (const row of data) {
      for (const s of series) {
        m = Math.max(m, Number(row[s.key]) || 0);
      }
    }
    return Math.max(m, 0.01);
  }, [data, series, stacked, stackedData]);

  const xs = data.map((row) => String(row[xKey]));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, xs.length - 1);
  const ticksY = niceTicks(0, yMax, 4);
  const niceMaxY = Math.max(yMax, ticksY[ticksY.length - 1] || yMax);
  const y = linearScale(0, niceMaxY, H - padB, padT);
  const { show, hide, anchor } = useChartTooltip();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const span = (W - padL - padR) / Math.max(1, xs.length - 1);
    const idx = Math.max(0, Math.min(xs.length - 1, Math.round((relX - padL) / span)));
    setHoverIdx(idx);
    const row = data[idx];
    show(
      e,
      <div className="space-y-1">
        <div className="font-medium">{formatX(String(row[xKey]))}</div>
        {[...series].reverse().map((s) => (
          <div key={s.key} className="flex items-center gap-2 font-mono tabular-nums">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto text-foreground">{fmtY(Number(row[s.key]) || 0)}</span>
          </div>
        ))}
      </div>
    );
  }
  const xLabels = downsampleLabels(xs, 7);

  return (
    <div className="w-full" style={{ height }}>
      {anchor}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" role="img">
        {/* Grid + Y ticks */}
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

        {/* Areas (bottom→top so top series renders on top) */}
        {series.map((s) => {
          const points = data.map((row, i) => {
            if (stacked && stackedData) {
              return {
                x: x(i),
                y: y(stackedData[i][`${s.key}_y1`] as number),
              };
            }
            return { x: x(i), y: y(Number(row[s.key]) || 0) };
          });

          const baselineY = stacked && stackedData
            ? data.map((_, i) => ({
                x: x(i),
                y: y(stackedData[i][`${s.key}_y0`] as number),
              }))
            : null;

          let pathD = "";
          if (baselineY) {
            // stacked: closed shape between two lines
            pathD = points.reduce(
              (acc, p, i) => acc + `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)} `,
              "",
            );
            for (let i = baselineY.length - 1; i >= 0; i--) {
              pathD += `L${baselineY[i].x.toFixed(2)},${baselineY[i].y.toFixed(2)} `;
            }
            pathD += "Z";
          } else {
            pathD = areaPath(points, y(0));
          }

          return (
            <g key={s.key}>
              <path d={pathD} fill={s.color} fillOpacity={stacked ? 0.55 : 0.2} />
              <path
                d={linePath(points)}
                stroke={s.color}
                strokeWidth={1.5}
                fill="none"
              />
            </g>
          );
        })}

        {/* X tick labels */}
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

        {/* X baseline */}
        <line
          x1={padL}
          x2={W - padR}
          y1={y(0)}
          y2={y(0)}
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />

        {/* Hover crosshair */}
        {hoverIdx != null && (
          <line
            x1={x(hoverIdx)}
            x2={x(hoverIdx)}
            y1={padT}
            y2={H - padB}
            stroke="hsl(var(--foreground))"
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.4}
            pointerEvents="none"
          />
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
          style={{ cursor: "crosshair" }}
        />
      </svg>
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
