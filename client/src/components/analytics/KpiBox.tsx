import type { ReactNode } from "react";
import { surface } from "@/lib/surface";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  suffix?: string;
  hint?: ReactNode;
}

/**
 * KpiBox — variant of StatCard with ReactNode icon (allows custom-colored
 * lucide icons inline) and optional suffix string (e.g. "/h", "dias").
 *
 * Distinct from StatCard which takes LucideIcon component + iconColor prop.
 * KpiBox preserves caller's full icon JSX, useful for analytics streaks.
 */
export function KpiBox({ icon, label, value, suffix, hint }: Props) {
  return (
    <div className={`${surface.section} px-5 py-4`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
    </div>
  );
}
