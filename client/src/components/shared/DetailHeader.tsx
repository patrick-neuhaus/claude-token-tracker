import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { textH2 } from "@/lib/surface";

interface Props {
  backTo: string;
  backLabel: string;
  title: string;
  icon?: LucideIcon;
  badges?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/**
 * DetailHeader — molecule for detail-page headers (back link + h1 + badges + actions).
 * More specific than PageHeader: always has back link, often has badges / mono path.
 *
 * Promotes h2 to h1 (single per page, WCAG 1.3.1). Back link has focus-visible
 * ring for keyboard nav.
 *
 * Resolves dedup #4. Use for skill/system-prompt details. For breadcrumb-style
 * (deep hierarchy), prefer NavBreadcrumb.
 */
export function DetailHeader({
  backTo,
  backLabel,
  title,
  icon: Icon,
  badges,
  subtitle,
  actions,
}: Props) {
  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="space-y-2 flex-1 min-w-0">
        <Link
          to={backTo}
          className={cn(
            "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className={cn(textH2, "flex items-center gap-2")}>
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
            {title}
          </h1>
          {badges}
        </div>
        {subtitle && <div>{subtitle}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
