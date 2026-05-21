import { useRef, type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

interface Props {
  /** @deprecated CRM canonical kpi has no icon. Prop kept for back-compat — ignored visually. */
  icon?: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: ReactNode;
  /** Backwards-compat alias for sublabel. */
  hint?: ReactNode;
  /** Trend indicator string (e.g. "+12%" green, "-5%" red). Renders as kpi-delta. */
  trend?: string;
  /** Loading state — renders shimmer skeleton. */
  loading?: boolean;
  /** Count-up animation 0→value on viewport entry. Default true. */
  animate?: boolean;
  /** @deprecated icon-related prop, ignored in CRM canonical. */
  iconColor?: string;
}

/**
 * StatCard — canonical CRM kpi (anti-ai-design-system lift, Wave 8.2.4 R3).
 * Anatomy: label uppercase mono → value Lora 28px → optional sublabel + delta.
 * NO icon, NO divider — kept compat-only for legacy callsites.
 */
export function StatCard({
  label,
  value,
  sublabel,
  hint,
  trend,
  loading = false,
  animate = true,
}: Props) {
  const valueRef = useRef<HTMLDivElement | null>(null);
  const displayValue = useCountUp(valueRef, animate ? value : null);
  const finalValue = animate ? displayValue : value;
  const finalSublabel = sublabel ?? hint;

  if (loading) {
    return (
      <div className="kpi" aria-busy="true" aria-label="Carregando...">
        <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
        <div className="h-7 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  const deltaCls = trend ? (trend.startsWith("-") ? "kpi-delta dn" : "kpi-delta up") : "";

  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div ref={valueRef} className="kpi-value tabular-nums">
        {finalValue}
      </div>
      {finalSublabel && <div className="kpi-sublabel">{finalSublabel}</div>}
      {trend && <span className={deltaCls}>{trend}</span>}
    </div>
  );
}
