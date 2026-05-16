import { Section } from "@/components/shared/Section";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer } from "lucide-react";
import { useToolP95 } from "@/hooks/useAnalytics";
import type { ToolP95Row } from "@/hooks/useAnalytics";

function formatDuration(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}min`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * ToolP95Card — Tier 2 chart: top 10 tools by P95 duration (last 7 days).
 * Useful to spot tools in loop/timeout.
 */
export function ToolP95Card() {
  const { data, isLoading } = useToolP95(7);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const rows: ToolP95Row[] = data ?? [];

  if (rows.length === 0) {
    return (
      <Section title="Tool Duration P95" description="Top 10 ferramentas mais lentas — últimos 7 dias">
        <EmptyState icon={Timer} message="Sem dados de duração de tools" />
      </Section>
    );
  }

  const maxP95 = Math.max(...rows.map((r) => Number(r.p95_ms) || 0));

  return (
    <Section
      title="Tool Duration P95"
      description="Top 10 ferramentas mais lentas — últimos 7 dias"
    >
      <div className="divide-y divide-border">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-1 py-1.5 text-xs text-muted-foreground font-medium">
          <span>Tool</span>
          <span className="text-right">P95</span>
          <span className="text-right">Calls</span>
          <span className="text-right">Total</span>
        </div>
        {rows.map((row) => {
          const p95 = Number(row.p95_ms) || 0;
          const count = Number(row.count) || 0;
          const total = Number(row.total_duration_ms) || 0;
          const barPct = maxP95 > 0 ? (p95 / maxP95) * 100 : 0;

          return (
            <div key={row.tool_name} className="py-2 px-1 space-y-1">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center">
                <span className="text-sm font-mono truncate" title={row.tool_name}>
                  {row.tool_name}
                </span>
                <span className="text-sm tabular-nums text-right font-medium">
                  {formatDuration(p95)}
                </span>
                <span className="text-xs tabular-nums text-right text-muted-foreground w-12">
                  {count.toLocaleString("pt-BR")}x
                </span>
                <span className="text-xs tabular-nums text-right text-muted-foreground w-16">
                  {formatDuration(total)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${barPct.toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
