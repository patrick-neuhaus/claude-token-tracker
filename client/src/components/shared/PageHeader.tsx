import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { textH2, textSubtitle } from "@/lib/surface";

interface Props {
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

/**
 * PageHeader — molecule for top-of-page heading. Promotes h2 -> h1 (resolves
 * UX F-15 / WCAG 1.3.1 — single h1 per page). Supports subtitle (text or
 * ReactNode for colored counts), icon prefix, and actions slot.
 *
 * Replaces the inline `<h2 text-xl font-semibold>` + count line scattered
 * across 11 pages. Resolves dedup #3 + DS Δ9 (subtitles consistentes).
 */
export function PageHeader({ title, subtitle, icon: Icon, actions, className }: Props) {
  return (
    <header
      className={cn(
        "flex items-end justify-between flex-wrap gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className={cn(textH2, "flex items-center gap-2")}>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && (
          <div className={cn(textSubtitle, "mt-1 tabular-nums")}>{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
