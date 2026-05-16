import { useParams, Link } from "react-router-dom";
import { useSessionDetail } from "@/hooks/useSessionDetail";
import { useRenameSession } from "@/hooks/useSessions";
import { Section } from "@/components/shared/Section";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Pill } from "@/components/shared/Pill";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { Button } from "@/components/ui/button";
import { NavBreadcrumb } from "@/components/shared/NavBreadcrumb";
import { SessionNameEditor } from "@/components/sessions/SessionNameEditor";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";
import { SvgAreaStack } from "@/components/charts/SvgAreaStack";
import { SvgStackedBar } from "@/components/charts/SvgStackedBar";
import {
  MessageSquare, Activity, FolderOpen, ExternalLink, Zap,
} from "lucide-react";
import { formatUSD, formatNumber, formatTokens, formatDate } from "@/lib/formatters";
import { ModelPieChart } from "@/components/charts/ModelPieChart";
import { toast } from "sonner";
import { useSessionCompactions } from "@/hooks/useCompactions";

interface EntryRow {
  id: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number | string;
  cache_write: number | string;
  cost_usd: number;
}

const entriesColumns: AppTableColumn<EntryRow>[] = [
  {
    key: "timestamp",
    header: "Horário",
    width: "minmax(160px,1.4fr)",
    render: (v) => <span className="text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(v)}</span>,
  },
  {
    key: "model",
    header: "Modelo",
    width: "minmax(140px,1.2fr)",
    render: (v) => <span className="truncate" title={v}>{v}</span>,
  },
  {
    key: "input_tokens",
    header: "Input",
    width: "100px",
    align: "right",
    mono: true,
    render: (v) => formatTokens(v),
  },
  {
    key: "output_tokens",
    header: "Output",
    width: "100px",
    align: "right",
    mono: true,
    render: (v) => formatTokens(v),
  },
  {
    key: "cache_read",
    header: "Cache",
    width: "100px",
    align: "right",
    mono: true,
    render: (_v, e) => formatTokens(Number(e.cache_read) + Number(e.cache_write)),
  },
  {
    key: "cost_usd",
    header: "Custo",
    width: "110px",
    align: "right",
    mono: true,
    render: (v) => <span className="font-medium">{formatUSD(v)}</span>,
  },
];

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s === 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function Skeletons() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-96" />
      <SkeletonGrid count={4} />
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useSessionDetail(id);
  const rename = useRenameSession();
  const { data: compactionData } = useSessionCompactions(
    data?.session?.session_id
  );

  if (isLoading) return <Skeletons />;
  if (isError || !data) {
    return <ErrorState title="Erro ao carregar sessão" />;
  }

  const { session, aggregates, timeline, by_model, entries } = data;

  const duration = aggregates.first_ts && aggregates.last_ts
    ? (new Date(aggregates.last_ts).getTime() - new Date(aggregates.first_ts).getTime()) / 1000
    : 0;

  function handleRename(name: string) {
    if (!session.id) return;
    rename.mutate(
      { id: session.id, custom_name: name },
      {
        onSuccess: () => toast.success("Nome atualizado"),
        onError: () => toast.error("Erro ao renomear sessão"),
      }
    );
  }

  // Token composition: cache reuse insight pré-calculado
  const totalInput = Number(aggregates.total_input);
  const totalOutput = Number(aggregates.total_output);
  const totalCacheRead = Number(aggregates.total_cache_read);
  const totalCacheWrite = Number(aggregates.total_cache_write);
  const tokenSegments = [
    { key: "input", label: "Input", value: totalInput, color: "hsl(var(--chart-1))" },
    { key: "output", label: "Output", value: totalOutput, color: "hsl(var(--chart-2))" },
    { key: "cache_read", label: "Cache Read", value: totalCacheRead, color: "hsl(var(--success))" },
    { key: "cache_write", label: "Cache Write", value: totalCacheWrite, color: "hsl(var(--chart-4))" },
  ];
  const tokenSum = totalInput + totalOutput + totalCacheRead + totalCacheWrite;
  const cachePct = tokenSum > 0 ? (totalCacheRead / tokenSum) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <NavBreadcrumb
        items={[
          { type: "link", label: "Sessões", href: "/sessions", icon: MessageSquare },
          { type: "page", label: session.custom_name || session.session_id.slice(0, 16) },
        ]}
      />

      {/* Header: nome editável + projeto + source */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SessionNameEditor
            currentName={session.custom_name}
            sessionId={session.session_id}
            onSave={handleRename}
            source={session.source}
            firstSeen={session.first_seen}
            entryCount={session.entry_count}
          />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Pill variant="info">{session.source}</Pill>
            {session.project_id && session.project_name && (
              <Link to={`/projects/${session.project_id}`}>
                <Badge variant="secondary" className="text-xs gap-1 hover:bg-secondary/80 transition-colors cursor-pointer">
                  <FolderOpen className="h-3 w-3" />
                  {session.project_name}
                </Badge>
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(session.first_seen)} → {formatDate(session.last_seen)}
            </span>
          </div>
        </div>
        {session.project_id && (
          <Link to={`/projects/${session.project_id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir projeto
            </Button>
          </Link>
        )}
      </div>

      {/* Metrics bar */}
      <div className="kpis">
        <StatCard label="Custo Total" value={formatUSD(aggregates.total_cost_usd)} />
        <StatCard label="Total Tokens" value={formatTokens(aggregates.total_tokens)} />
        <StatCard label="Duração" value={formatDuration(duration)} />
        <StatCard label="Entradas" value={formatNumber(aggregates.entry_count)} />
      </div>

      {/* Chart: cumulative cost — SVG inline (R8) */}
      {timeline.length > 0 && (
        <Section title="Custo acumulado">
          <SvgAreaStack
            data={timeline as Array<Record<string, string | number>>}
            xKey="timestamp"
            series={[{ key: "cumulative_cost", label: "Custo acumulado", color: "hsl(var(--chart-2))" }]}
            stacked={false}
            height={260}
            formatX={(v) => formatDate(v).split(" ")[1] || ""}
            formatY={(v) => `$${v.toFixed(2)}`}
          />
        </Section>
      )}

      {/* Grid 2-col: modelos + composição de tokens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Custo por Modelo">
            {by_model.length === 0 ? (
              <EmptyState icon={Activity} message="Sem dados" />
            ) : (
              <ModelPieChart data={by_model} innerRadius={50} outerRadius={90} />
            )}
        </Section>

        <Section
          title="Composição de Tokens"
          description={
            tokenSum > 0
              ? `${cachePct.toFixed(0)}% reaproveitamento de cache`
              : "Sem dados"
          }
        >
          <SvgStackedBar
            segments={tokenSegments}
            height={56}
            formatValue={(v) => formatTokens(v)}
          />
        </Section>
      </div>

      {/* Compaction indicator */}
      {compactionData?.bySession && compactionData.bySession.compactions.length > 0 && (
        <Section title="Compactions">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Zap className="h-5 w-5 text-yellow-500 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">
                Compactou {compactionData.bySession.compactions.length}x
              </span>
              {compactionData.bySession.avg_reduction_pct !== null && (
                <span className="text-muted-foreground ml-2">
                  · reduziu{" "}
                  {compactionData.bySession.avg_reduction_pct.toFixed(1)}% em média
                </span>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Entries */}
      <Section title="Entradas recentes" flush>
          {entries.length === 0 ? (
            <EmptyState icon={Activity} message="Nenhuma entrada" />
          ) : (
            <AppTable
              rowKey="id"
              data={entries}
              columns={entriesColumns}
            />
          )}
      </Section>
    </div>
  );
}
