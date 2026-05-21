import { useMemo } from "react";
import { linearScale, niceTicks } from "@/lib/svg-charts";
import { useChartTooltip } from "./ChartTooltip";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: BarSeries[];
  /** Stack bars if multi-series. Default false (grouped). */
  stacked?: boolean;
  /** Horizontal layout (categories on Y, values on X). Default false. */
  horizontal?: boolean;
  height?: number;
  formatY?: (v: number) => string;
  formatTooltip?: (key: string, value: number, row: Record<string, string | number>) => string;
  /** Accessible label for screen readers. Defaults to a generic chart description. */
  ariaLabel?: string;
}

/**
 * SvgBarChart — canonical CRM lift (R8). Pure SVG bar chart.
 * Supports vertical/horizontal + stacked/grouped.
 */
export function SvgBarChart({
  data,
  xKey,
  series,
  stacked = false,
  horizontal = false,
  height = 240,
  formatY,
  formatTooltip,
  ariaLabel,
}: Props) {
  const W = 800;
  const H = height;
  const padL = horizontal ? 120 : 56;
  const padR = 16;
  const padT = 8;
  const padB = 28;

  const fmtY = formatY ?? ((v: number) => `${v.toFixed(0)}`);
  const { show, hide, anchor } = useChartTooltip();

  const yMax = useMemo(() => {
    let m = 0;
    for (const row of data) {
      if (stacked) {
        let sum = 0;
        for (const s of series) sum += Number(row[s.key]) || 0;
        if (sum > m) m = sum;
      } else {
        for (const s of series) {
          const v = Number(row[s.key]) || 0;
          if (v > m) m = v;
        }
      }
    }
    return Math.max(m, 0.01);
  }, [data, series, stacked]);

  const xs = data.map((row) => String(row[xKey]));

  if (horizontal) {
    // Horizontal bar (each row = a bar)
    const rowH = (H - padT - padB) / Math.max(1, data.length);
    const barH = Math.min(24, rowH * 0.6);
    const ticksX = niceTicks(0, yMax, 4);
    const niceMaxX = Math.max(yMax, ticksX[ticksX.length - 1] || yMax);
    const valScale = linearScale(0, niceMaxX, padL, W - padR);

    return (
      <div className="w-full" style={{ height: H }}>
        {anchor}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel ?? `Gráfico de barras horizontais com ${series.length} série(s)`}
          onMouseLeave={hide}
        >
          {/* X grid */}
          {ticksX.map((tv, i) => (
            <g key={i}>
              <line
                x1={valScale(tv)}
                x2={valScale(tv)}
                y1={padT}
                y2={H - padB}
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={valScale(tv)}
                y={H - padB + 14}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {fmtY(tv)}
              </text>
            </g>
          ))}

          {data.map((row, i) => {
            const cy = padT + rowH * i + (rowH - barH) / 2;
            const v = Number(row[series[0].key]) || 0;
            const w = Math.max(0, valScale(v) - padL);
            const tooltip = formatTooltip?.(series[0].key, v, row) ?? `${row[xKey]}: ${fmtY(v)}`;
            return (
              <g key={i}>
                <text
                  x={padL - 8}
                  y={cy + barH / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="hsl(var(--foreground))"
                  fontSize="11"
                  fontFamily="var(--font-body)"
                >
                  {String(row[xKey]).slice(0, 18)}
                </text>
                <rect
                  x={padL}
                  y={cy}
                  width={w}
                  height={barH}
                  fill={series[0].color}
                  rx={3}
                  ry={3}
                  style={{ cursor: "pointer" }}
                  onMouseMove={(e) => show(e, <div className="font-mono tabular-nums">{tooltip}</div>)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Vertical bar
  const groupW = (W - padL - padR) / Math.max(1, xs.length);
  const innerW = groupW * 0.7;
  const barW = stacked ? innerW : innerW / Math.max(1, series.length);
  const ticksY = niceTicks(0, yMax, 4);
  const niceMaxY = Math.max(yMax, ticksY[ticksY.length - 1] || yMax);
  const yScale = linearScale(0, niceMaxY, H - padB, padT);
  const xLabels = downsampleLabels(xs, 7);

  return (
    <div className="w-full" style={{ height: H }}>
      {anchor}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel ?? `Gráfico de barras ${stacked ? "empilhadas" : "agrupadas"} com ${series.length} série(s)`}
        onMouseLeave={hide}
      >
        {ticksY.map((tv, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yScale(tv)}
              y2={yScale(tv)}
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={yScale(tv)}
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

        {data.map((row, i) => {
          const cx = padL + groupW * i + groupW / 2;
          if (stacked) {
            let acc = 0;
            return (
              <g key={i}>
                {series.map((s) => {
                  const v = Number(row[s.key]) || 0;
                  if (v <= 0) return null;
                  const y0 = yScale(acc);
                  acc += v;
                  const y1 = yScale(acc);
                  const tooltip = formatTooltip?.(s.key, v, row) ?? `${s.label}: ${fmtY(v)}`;
                  return (
                    <rect
                      key={s.key}
                      x={cx - barW / 2}
                      y={y1}
                      width={barW}
                      height={Math.max(0, y0 - y1)}
                      fill={s.color}
                      rx={2}
                      style={{ cursor: "pointer" }}
                      onMouseMove={(e) => show(e, <div className="font-mono tabular-nums">{tooltip}</div>)}
                    />
                  );
                })}
              </g>
            );
          }
          // grouped
          const startX = cx - innerW / 2;
          return (
            <g key={i}>
              {series.map((s, j) => {
                const v = Number(row[s.key]) || 0;
                const x0 = startX + j * barW;
                const y1 = yScale(v);
                const y0 = yScale(0);
                const tooltip = formatTooltip?.(s.key, v, row) ?? `${s.label}: ${fmtY(v)}`;
                return (
                  <rect
                    key={s.key}
                    x={x0 + 1}
                    y={y1}
                    width={Math.max(0, barW - 2)}
                    height={Math.max(0, y0 - y1)}
                    fill={s.color}
                    rx={2}
                    style={{ cursor: "pointer" }}
                    onMouseMove={(e) => show(e, <div className="font-mono tabular-nums">{tooltip}</div>)}
                  />
                );
              })}
            </g>
          );
        })}

        {xLabels.map((idx) => {
          const cx = padL + groupW * idx + groupW / 2;
          return (
            <text
              key={idx}
              x={cx}
              y={H - padB + 16}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {xs[idx]}
            </text>
          );
        })}
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
