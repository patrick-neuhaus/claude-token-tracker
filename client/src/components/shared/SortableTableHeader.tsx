import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props<TCol extends string> {
  col: TCol;
  label: string;
  sortBy?: TCol;
  sortDir?: "asc" | "desc";
  onSort: (col: TCol) => void;
  align?: "left" | "right";
  className?: string;
}

/**
 * SortableTableHeader — generic sort header button. Replaces the inline
 * SortIcon + sortHead pattern copy-pasted across 3 list pages.
 *
 * Component is the inner <button>, not the <th> cell. Caller decides whether
 * to wrap in <th> (shadcn Table) or grid <span> (dense lists).
 *
 * a11y: button + ArrowUpDown when not sorted, ArrowUp/Down when sorted.
 * focus-visible inherited from button defaults.
 *
 * Resolves dedup #2.
 */
export function SortableTableHeader<TCol extends string>({
  col,
  label,
  sortBy,
  sortDir,
  onSort,
  align = "left",
  className,
}: Props<TCol>) {
  const active = sortBy === col;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      aria-label={`Ordenar por ${label}`}
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
        align === "right" && "justify-end",
        className,
      )}
    >
      {label}
      <Icon className={cn("inline h-3 w-3", !active && "opacity-40")} aria-hidden="true" />
    </button>
  );
}
