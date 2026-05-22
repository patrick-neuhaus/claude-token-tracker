import { useChartTooltip } from "./ChartTooltip";

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  height?: number;
  formatValue?: (v: number) => string;
  showLegend?: boolean;
  /** Minimum visible segment width in % (segments below get a thin sliver but still visible). */
  minWidthPct?: number;
  /** Accessible label for screen readers. Defaults to a generic chart description. */
  ariaLabel?: string;
}

/**
 * SvgStackedBar — single full-width horizontal bar split into proportional segments.
 * Designed for "composition" charts where 1 dimension dominates (e.g. cache_read 85%).
 * Tooltips via native <title>. No axes, no gridlines.
 */
export function SvgStackedBar({
  segments,
  height = 36,
  formatValue = (v) => v.toLocaleString(),
  showLegend = true,
  minWidthPct = 0.5,
  ariaLabel,
}: Props) {
  const W = 1000;
  const H = height;
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const { show, hide, anchor } = useChartTooltip();

  if (total === 0) {
    return (
      <div className="w-full">
        <div
          className="w-full rounded-md bg-muted/30 border border-border/60"
          style={{ height: H }}
          aria-label="Sem dados"
        />
      </div>
    );
  }

  // Compute raw percentages
  const raw = segments.map((s) => ({
    ...s,
    pct: (s.value / total) * 100,
  }));

  // Apply minWidthPct floor for visual presence (steal from biggest segment proportionally)
  const adjusted = raw.map((s) => ({ ...s, displayPct: Math.max(s.pct, s.value > 0 ? minWidthPct : 0) }));
  const sumDisplay = adjusted.reduce((acc, s) => acc + s.displayPct, 0);
  const norm = adjusted.map((s) => ({ ...s, normPct: (s.displayPct / sumDisplay) * 100 }));

  let xCursor = 0;

  return (
    <div className="w-full">
      {anchor}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel ?? `Gráfico de barra empilhada com ${segments.length} segmento(s)`}
        onMouseLeave={hide}
        onTouchEnd={hide}
      >
        <rect x={0} y={0} width={W} height={H} fill="hsl(var(--muted) / 0.3)" rx={6} ry={6} />
        {norm.map((s, i) => {
          if (s.value <= 0) return null;
          const segW = (s.normPct / 100) * W;
          const x = xCursor;
          xCursor += segW;
          const isFirst = i === 0;
          const isLast = i === norm.length - 1;
          const rx = isFirst || isLast ? 6 : 0;
          return (
            <g key={s.key}>
              <rect
                x={x}
                y={0}
                width={segW}
                height={H}
                fill={s.color}
                rx={rx}
                ry={rx}
                style={{ cursor: "pointer" }}
                onMouseMove={(e) =>
                  show(
                    e,
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                        <span className="font-medium">{s.label}</span>
                      </div>
                      <div className="font-mono tabular-nums text-foreground">{formatValue(s.value)}</div>
                      <div className="font-mono tabular-nums text-muted-foreground">{s.pct.toFixed(1)}% do total</div>
                    </div>
                  )
                }
                onTouchStart={(e) =>
                  show(
                    e,
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                        <span className="font-medium">{s.label}</span>
                      </div>
                      <div className="font-mono tabular-nums text-foreground">{formatValue(s.value)}</div>
                      <div className="font-mono tabular-nums text-muted-foreground">{s.pct.toFixed(1)}% do total</div>
                    </div>
                  )
                }
                onTouchMove={(e) =>
                  show(
                    e,
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                        <span className="font-medium">{s.label}</span>
                      </div>
                      <div className="font-mono tabular-nums text-foreground">{formatValue(s.value)}</div>
                      <div className="font-mono tabular-nums text-muted-foreground">{s.pct.toFixed(1)}% do total</div>
                    </div>
                  )
                }
              />
              {s.pct >= 8 && (
                <text
                  x={x + segW / 2}
                  y={H / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="var(--font-mono)"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
                  pointerEvents="none"
                >
                  {s.pct.toFixed(0)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-3 text-xs">
          {raw.map((s) => (
            <div key={s.key} className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground truncate">{s.label}</span>
              <span className="font-mono text-foreground tabular-nums shrink-0 ml-auto">
                {formatValue(s.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
