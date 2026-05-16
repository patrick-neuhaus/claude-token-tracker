import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { textH2, textSubtitle } from "@/lib/surface";

interface Props {
  title: string;
  crumb?: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, crumb, subtitle, icon: Icon, actions, className }: Props) {
  return (
    <header
      className={cn(
        "flex items-end justify-between flex-wrap gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        {crumb && (
          <span className="font-mono text-[11px] text-muted-foreground lowercase tracking-[0.06em]">
            {crumb}
          </span>
        )}
        <h1 className={cn(textH2, "flex items-center gap-2")}>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && (
          <div className={cn(textSubtitle, "mt-0 tabular-nums")}>{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
