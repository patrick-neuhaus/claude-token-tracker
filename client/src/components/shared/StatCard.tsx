import { useEffect, useRef, useState, type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Optional secondary line below label. Replaces deprecated `hint` prop. */
  sublabel?: ReactNode;
  /** Backwards-compat alias for sublabel. Will be removed Wave 7. */
  hint?: ReactNode;
  /** Trend indicator string (e.g. "+12%" green, "-5%" red). */
  trend?: string;
  /** Loading state — renders shimmer skeleton. */
  loading?: boolean;
  /** Count-up animation 0→value on viewport entry. Default true. */
  animate?: boolean;
  /** Tailwind text color class for icon. Default text-accent. */
  iconColor?: string;
}

// Parse numeric prefix from value string (e.g. "1.247" → 1247, "183" → 183)
function parseNumeric(v: string | number): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function formatLike(original: string | number, current: number): string {
  const orig = String(original);
  const hasDotThousands = /^\d{1,3}(\.\d{3})+$/.test(orig);
  if (hasDotThousands) {
    return current.toLocaleString("pt-BR").replace(",", ".");
  }
  return String(current);
}

function useStatCountUp(
  ref: React.RefObject<HTMLDivElement | null>,
  targetStr: string | number,
  duration = 800,
): string | number {
  const [display, setDisplay] = useState<string | number>(targetStr);
  const hasRun = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const numeric = parseNumeric(targetStr);
    if (numeric === null) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * numeric);
            setDisplay(formatLike(targetStr, current));
            if (progress < 1) requestAnimationFrame(tick);
            else setDisplay(targetStr);
          };
          requestAnimationFrame(tick);
          io.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetStr, duration, ref]);
  return display;
}

/**
 * StatCard — KPI tile canonical CRM lift (Wave 6.1).
 * Anatomy: accent-tinted icon chip + 28px stat + divider + label/sublabel/trend.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  hint,
  trend,
  loading = false,
  animate = true,
  iconColor = "text-accent",
}: Props) {
  const valueRef = useRef<HTMLDivElement | null>(null);
  const displayValue = useStatCountUp(valueRef, value);
  const finalValue = animate ? displayValue : value;
  const finalSublabel = sublabel ?? hint;

  if (loading) {
    return (
      <div
        className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
        aria-busy="true"
        aria-label="Carregando..."
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
          <div className="h-6 w-20 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-3/5 rounded bg-muted animate-pulse" />
          <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/40">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/12 flex items-center justify-center">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div
          ref={valueRef}
          className="text-stat font-medium tabular-nums leading-none text-foreground flex-1 min-w-0 truncate"
          style={{ fontSize: 28 }}
        >
          {finalValue}
        </div>
      </div>
      <div className="h-px bg-border mb-3" />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{label}</div>
          {finalSublabel && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">{finalSublabel}</div>
          )}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium shrink-0 ${
              trend.startsWith("-") ? "text-destructive" : "text-success-display"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
