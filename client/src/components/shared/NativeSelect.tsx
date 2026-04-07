import type { SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  /** "sm" = h-8 px-2 (filtros inline) | "default" = h-9 px-3 (formulários) */
  sizing?: "sm" | "default";
}

const BASE = "rounded-md border border-input bg-background text-sm text-foreground";

const SIZE_MAP = {
  sm: "h-8 px-2",
  default: "h-9 px-3",
} as const;

export function NativeSelect({ sizing = "sm", className = "", ...props }: Props) {
  return (
    <select
      className={`${BASE} ${SIZE_MAP[sizing]} ${className}`}
      {...props}
    />
  );
}
