import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewModeToggleProps<T extends string> {
  options: { value: T; icon: LucideIcon; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "default";
  className?: string;
}

/**
 * ViewModeToggle — molecule binary/N-way toggle for view modes (grid/list,
 * raw/rendered, code/preview). Padronizes the inline button-group pattern
 * scattered across SkillDetailPage, SystemPromptDetailPage, ProjectsPage.
 *
 * Resolves UX F-11 (consistent visual between binary toggles).
 *
 * a11y: role="group" + aria-label parent, aria-pressed per button.
 * focus-visible inset ring (not offset, since buttons share borders).
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
      className={cn("flex rounded-md border border-border overflow-hidden", className)}
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
              "text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
