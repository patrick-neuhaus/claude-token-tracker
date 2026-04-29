import { type LucideIcon } from "lucide-react";
import { surface } from "@/lib/surface";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Tailwind text color class for the icon, e.g. "text-success", "text-info". Default muted. */
  iconColor?: string;
  /** Optional secondary line below the value (e.g. comparison delta). */
  hint?: React.ReactNode;
}

/**
 * StatCard — small KPI tile. Replaces `<Card><CardContent flex+icon+text>` pattern
 * scattered across SessionsPage, SessionTimePage, AnalyticsPage stat grids.
 *
 * Density-first: uses `surface.section` (rounded-md, not lg) + tighter padding than Card default.
 */
export function StatCard({ icon: Icon, label, value, iconColor = "text-muted-foreground", hint }: Props) {
  return (
    <div className={`${surface.section} flex items-center gap-3 px-4 py-3`}>
      <div className={`rounded-md bg-muted/50 p-2 ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {hint && <div className="mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}
