import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewModeToggleProps<T extends string> {
  options: { value: T; icon: LucideIcon; label: string; count?: number | string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "default";
  className?: string;
}

/**
 * ViewModeToggle — canonical CRM view toggle (anti-ai-design-system lift, R6).
 *
 * Anatomy: bg-muted/30 container with rounded-md, active option = bg-card +
 * subtle shadow lift. Inactive = transparent + muted-foreground.
 *
 * a11y: role="group" + aria-pressed per button.
 */
export function ViewModeToggle<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  className,
}: ViewModeToggleProps<T>) {
  const padClass = size === "sm" ? "px-2.5 py-1.5" : "px-3 py-2";
  return (
    <div
      role="group"
      aria-label="Modo de visualização"
      className={cn(
        "inline-flex items-center gap-1 rounded-md p-1",
        "bg-muted/40 border border-border/60",
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={opt.label}
            className={cn(
              padClass,
              "text-sm rounded transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              "inline-flex items-center gap-1.5",
              active
                ? "bg-card text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {opt.count !== undefined && (
              <span className="font-mono text-[10px] opacity-60">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
