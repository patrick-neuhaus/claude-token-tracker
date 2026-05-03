import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonGridProps {
  count: number;
  cols?: 1 | 2 | 3 | 4 | 5;
  itemHeight?: string;
  itemRadius?: "rounded-md" | "rounded-lg" | "rounded-xl";
  className?: string;
}

const COLS_CLASS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
};

/**
 * SkeletonGrid — replaces Array.from({length: N}).map(<Skeleton/>) inline pattern
 * for grids of cards / charts. Default 4 cols, h-24 rounded-xl.
 *
 * Resolves dedup #8 / anti-pattern A1.
 */
export function SkeletonGrid({
  count,
  cols = 4,
  itemHeight = "h-24",
  itemRadius = "rounded-xl",
  className,
}: SkeletonGridProps) {
  return (
    <div className={cn("grid gap-4", COLS_CLASS[cols], className)} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn(itemHeight, itemRadius)} />
      ))}
    </div>
  );
}

interface SkeletonRowsProps {
  count: number;
  itemHeight?: string;
  className?: string;
}

/**
 * SkeletonRows — replaces vertical stack of skeleton rows for table loading.
 * Default h-14 (rows normais).
 */
export function SkeletonRows({
  count,
  itemHeight = "h-14",
  className,
}: SkeletonRowsProps) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn(itemHeight, "w-full")} />
      ))}
    </div>
  );
}
