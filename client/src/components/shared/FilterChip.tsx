import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  icon?: LucideIcon;
  variant?: "info" | "warning" | "primary";
  disabled?: boolean;
}

/**
 * FilterChip — atom button for filter selection. Supports active/inactive,
 * count display, optional icon, and 3 color variants.
 *
 * Resolves UX F-01 (focus-visible ring on chips) + UX F-07 (disabled feedback
 * for limit cases). aria-pressed indicates toggle state.
 *
 * Use FilterChipGroup for related groups with shared label.
 */
export function FilterChip({
  label,
  active,
  onClick,
  count,
  icon: Icon,
  variant = "info",
  disabled = false,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-disabled={disabled || undefined}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-sm border transition-colors tabular-nums",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "opacity-40 cursor-not-allowed",
        active && variant === "info" && "bg-info/15 border-info/40 text-info",
        active && variant === "warning" && "bg-warning/15 border-warning/40 text-warning",
        active && variant === "primary" && "bg-primary/15 border-primary/40 text-primary",
        !active && !disabled && "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        !active && disabled && "border-border text-muted-foreground",
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {label}
      {count !== undefined && <span>({count})</span>}
    </button>
  );
}

interface FilterChipGroupProps<T extends string> {
  label?: string;
  options: { value: T; label: string; count?: number; icon?: LucideIcon }[];
  active: T | null;
  onChange: (value: T) => void;
  variant?: "info" | "warning" | "primary";
  className?: string;
}

/**
 * FilterChipGroup — molecule grouping FilterChip atoms with shared header label.
 * Single-select pattern: clicking another option swaps active.
 */
export function FilterChipGroup<T extends string>({
  label,
  options,
  active,
  onChange,
  variant = "info",
  className,
}: FilterChipGroupProps<T>) {
  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
          {label}
        </span>
      )}
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          count={opt.count}
          icon={opt.icon}
          active={active === opt.value}
          onClick={() => onChange(opt.value)}
          variant={variant}
        />
      ))}
    </div>
  );
}
