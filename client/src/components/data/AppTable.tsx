import { useState, useMemo, type ReactNode, type KeyboardEvent } from "react";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AppTable — declarative sortable/clickable table.
 *
 * Wave 6.2 lift from anti-ai-design-system canonical
 * (ui_kits/default/components/data/AppTable.jsx). Adapted to React+TS+Tailwind:
 * - CSS grid layout (matches tracker convention, supports min/max columns)
 * - Hybrid sort: internal state (default) OR controlled (sortKey/sortDir/onSort)
 * - onRowClick + native keyboard support (Enter/Space)
 * - Surface canonical: rounded-xl + hover border accent (Wave 6.1 surface helper)
 *
 * When to use: dashboard / list screens with sortable cols + row drill-in.
 * When NOT to use: spreadsheet editing, highly custom row layouts.
 */

export type SortDir = "asc" | "desc" | null;

export interface AppTableColumn<T> {
  /** Object key in row OR synthetic key (e.g., "_arrow"). */
  key: string;
  /** Header content (string or node). */
  header: ReactNode;
  /** Cell alignment. Default: left. */
  align?: "left" | "right" | "center";
  /** Custom render fn — receives row[key] + row. Falls back to row[key]. */
  render?: (value: any, row: T) => ReactNode;
  /** Enables sort UI on header click. */
  sortable?: boolean;
  /** Mono font + tabular-nums for numeric cols. */
  mono?: boolean;
  /** CSS grid track (e.g., "minmax(220px,2fr)" or "100px"). Default: "1fr". */
  width?: string;
}

export interface AppTableProps<T> {
  columns: AppTableColumn<T>[];
  data: T[];
  /** Key extractor — string field name or fn. Default: "id". */
  rowKey?: string | ((row: T) => string);
  /** Click handler — receives full row. Enables keyboard support. */
  onRowClick?: (row: T) => void;
  /** Initial sort state for uncontrolled mode. */
  initialSort?: { key: string; dir: SortDir };
  /** Controlled sort key (parent owns state, e.g., server-side sort). */
  sortKey?: string;
  /** Controlled sort dir. */
  sortDir?: SortDir;
  /** Controlled sort callback — fires on header click with col key. */
  onSort?: (key: string) => void;
  /** Empty state when data.length === 0. */
  empty?: ReactNode;
  /** Extra classes on outer container. */
  className?: string;
}

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc") return <ChevronUp className="h-3 w-3 text-foreground" aria-hidden="true" />;
  if (dir === "desc") return <ChevronDown className="h-3 w-3 text-foreground" aria-hidden="true" />;
  return <ArrowUpDown className="h-3 w-3 opacity-35" aria-hidden="true" />;
}

export function AppTable<T>({
  columns,
  data,
  rowKey = "id",
  onRowClick,
  initialSort,
  sortKey: ctrlSortKey,
  sortDir: ctrlSortDir,
  onSort,
  empty,
  className,
}: AppTableProps<T>) {
  const [internalSort, setInternalSort] = useState<{ key: string | null; dir: SortDir }>(
    initialSort ?? { key: null, dir: null },
  );

  const isControlled = ctrlSortKey !== undefined && onSort !== undefined;
  const sort = isControlled
    ? { key: ctrlSortKey ?? null, dir: ctrlSortDir ?? null }
    : internalSort;

  const sorted = useMemo(() => {
    // Controlled mode: parent owns ordering (server-side typical)
    if (isControlled) return data;
    if (!sort.key || !sort.dir) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const av = (a as any)[sort.key as string];
      const bv = (b as any)[sort.key as string];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sort, columns, isControlled]);

  const toggleSort = (key: string) => {
    if (isControlled) {
      onSort!(key);
      return;
    }
    setInternalSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  };

  const gridTemplate = columns.map((c) => c.width ?? "1fr").join(" ");
  const getRowKey =
    typeof rowKey === "function" ? rowKey : (row: T) => (row as any)[rowKey];

  if (data.length === 0 && empty) {
    return (
      <div className={cn("bg-card border border-border rounded-xl", className)}>
        {empty}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden",
        "transition-colors hover:border-accent/40",
        className,
      )}
    >
      {/* Header */}
      <div
        className="grid gap-3 px-5 py-3 border-b border-border bg-muted/30"
        style={{ gridTemplateColumns: gridTemplate }}
        role="row"
      >
        {columns.map((c) => {
          const dir: SortDir = sort.key === c.key ? sort.dir : null;
          const ariaSort: "ascending" | "descending" | "none" | undefined = c.sortable
            ? dir === "asc"
              ? "ascending"
              : dir === "desc"
                ? "descending"
                : "none"
            : undefined;

          if (!c.sortable) {
            return (
              <span
                key={c.key}
                role="columnheader"
                className={cn(
                  "text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5",
                  c.align === "right" && "justify-end",
                  c.align === "center" && "justify-center",
                )}
              >
                {c.header}
              </span>
            );
          }

          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleSort(c.key)}
              role="columnheader"
              aria-sort={ariaSort}
              className={cn(
                "text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5",
                "hover:text-foreground transition-colors cursor-pointer",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
                c.align === "right" && "justify-end",
                c.align === "center" && "justify-center",
              )}
            >
              {c.header}
              <SortIcon dir={dir} />
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border" role="rowgroup">
        {sorted.map((row) => (
          <AppTableRow
            key={getRowKey(row)}
            row={row}
            columns={columns}
            gridTemplate={gridTemplate}
            onRowClick={onRowClick}
          />
        ))}
      </div>
    </div>
  );
}

function AppTableRow<T>({
  row,
  columns,
  gridTemplate,
  onRowClick,
}: {
  row: T;
  columns: AppTableColumn<T>[];
  gridTemplate: string;
  onRowClick?: (row: T) => void;
}) {
  const clickable = !!onRowClick;
  const handleClick = clickable ? () => onRowClick!(row) : undefined;
  const handleKeyDown = clickable
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick!(row);
        }
      }
    : undefined;

  return (
    <div
      className={cn(
        "grid gap-3 px-5 py-3 items-center group",
        clickable &&
          "cursor-pointer hover:bg-accent/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
      )}
      style={{ gridTemplateColumns: gridTemplate }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? "button" : "row"}
    >
      {columns.map((c) => {
        const value = (row as any)[c.key];
        const content = c.render ? c.render(value, row) : value;
        return (
          <div
            key={c.key}
            className={cn(
              "text-sm min-w-0",
              c.align === "right" && "text-right",
              c.align === "center" && "text-center",
              c.mono && "font-mono tabular-nums",
            )}
            role="cell"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
