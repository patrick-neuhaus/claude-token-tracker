import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSessionTime } from "@/hooks/useSessionTime";
import { formatUSD, formatNumber, formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/Section";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Clock, DollarSign, Activity, Layers, Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MS_PER_DAY } from "@/lib/constants";
import { PageHeader } from "@/components/shared/PageHeader";
import { SessionTimeFilters } from "@/components/sessions/SessionTimeFilters";
import { SessionTimeScatterChart } from "@/components/sessions/SessionTimeScatterChart";
import { formatDuration, toDateInputValue, dayStartIso, dayEndIso } from "@/lib/timeFormatters";

interface SessionTimeRow {
  session_id: string;
  session_db_id: string | null;
  sessao: string;
  project_id: string | null;
  project_name: string | null;
  custo_usd: number;
  calls: number;
  tempo_util_segundos: number;
  inicio: string;
  fim: string;
}

const detailColumns: AppTableColumn<SessionTimeRow>[] = [
  {
    key: "sessao",
    header: "Sessão",
    width: "minmax(180px,2fr)",
    render: (_v, r) => (
      <span className="font-medium truncate block">
        {r.session_db_id ? (
          <Link to={`/sessions/${r.session_db_id}`} className="hover:underline">
            {r.sessao}
          </Link>
        ) : (
          r.sessao
        )}
      </span>
    ),
  },
  {
    key: "project_name",
    header: "Projeto",
    width: "minmax(120px,1.3fr)",
    render: (_v, r) => (
      r.project_name && r.project_id ? (
        <Link to={`/projects/${r.project_id}`}>
          <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors w-fit">{r.project_name}</Badge>
        </Link>
      ) : r.project_name ? (
        <Badge variant="secondary" className="text-xs w-fit">{r.project_name}</Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )
    ),
  },
  {
    key: "custo_usd",
    header: "Custo",
    width: "100px",
    align: "right",
    mono: true,
    render: (v) => <span className="font-medium">{formatUSD(v)}</span>,
  },
  {
    key: "calls",
    header: "Calls",
    width: "80px",
    align: "right",
    mono: true,
    render: (v) => formatNumber(v),
  },
  {
    key: "tempo_util_segundos",
    header: "Tempo Útil",
    width: "110px",
    align: "right",
    mono: true,
    render: (v) => formatDuration(v),
  },
  {
    key: "inicio",
    header: "Início",
    width: "150px",
    mono: true,
    render: (v) => <span className="text-muted-foreground whitespace-nowrap">{formatDate(v)}</span>,
  },
  {
    key: "fim",
    header: "Fim",
    width: "150px",
    mono: true,
    render: (v) => <span className="text-muted-foreground whitespace-nowrap">{formatDate(v)}</span>,
  },
];

export function SessionTimePage() {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * MS_PER_DAY);

  const [dayFrom, setDayFrom] = useState<string>(toDateInputValue(sevenDaysAgo));
  const [dayTo, setDayTo] = useState<string>(toDateInputValue(today));
  const [gap, setGap] = useState<number>(60);

  const fromIso = useMemo(() => dayStartIso(dayFrom), [dayFrom]);
  const toIso = useMemo(() => dayEndIso(dayTo), [dayTo]);

  const { data, isLoading, isError } = useSessionTime(gap, fromIso, toIso);

  const rows = data || [];

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.custo += Number(r.custo_usd) || 0;
        acc.tempo += Number(r.tempo_util_segundos) || 0;
        acc.calls += Number(r.calls) || 0;
        acc.sessoes += 1;
        return acc;
      },
      { custo: 0, tempo: 0, calls: 0, sessoes: 0 }
    );
  }, [rows]);

  // scatter data: custo x tempo útil (1 ponto por sessão)
  const scatterData = useMemo(() => {
    return rows.map((r) => ({
      name: r.sessao,
      tempoMin: r.tempo_util_segundos / 60,
      custo: r.custo_usd,
      calls: r.calls,
    }));
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tempo por Sessão"
        crumb="tracker · sessões · tempo"
        subtitle="Tempo útil aproximado por sessão. Ajuste o gap máximo considerado como trabalho contínuo."
        actions={
          <UITooltip>
            <TooltipTrigger
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="O que é tempo útil"
            >
              <Info className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div>
                <p className="font-medium mb-1">Como o tempo útil é calculado</p>
                <p className="text-xs opacity-80">
                  Somamos os intervalos entre calls consecutivas da sessão, ignorando qualquer gap maior
                  que o valor do slider. Ex: com gap=60min, se você ficar 2h sem rodar nada, esse período não conta.
                </p>
              </div>
            </TooltipContent>
          </UITooltip>
        }
      />

      <SessionTimeFilters
        dayFrom={dayFrom}
        dayTo={dayTo}
        gap={gap}
        onDayFromChange={setDayFrom}
        onDayToChange={setDayTo}
        onGapChange={setGap}
      />

      {/* Loading / error */}
      {isLoading && (
        <div className="space-y-4">
          <SkeletonGrid count={4} />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      )}

      {isError && (
        <ErrorState title="Erro ao carregar dados" />
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState icon={Clock} message="Nenhuma sessão encontrada no período" />
      )}

      {!isLoading && rows.length > 0 && (
        <>
          {/* Resumo */}
          <div className="kpis">
            <StatCard label="Custo Total" value={formatUSD(totals.custo)} />
            <StatCard label="Tempo Útil" value={formatDuration(totals.tempo)} />
            <StatCard label="Sessões" value={formatNumber(totals.sessoes)} />
            <StatCard label="Calls" value={formatNumber(totals.calls)} />
          </div>

          {/* Scatter: custo vs tempo útil */}
          <Section
            title="Custo × Tempo Útil"
            description="Cada ponto é uma sessão. Pontos no canto superior direito são sessões caras e longas; canto inferior esquerdo são quick wins."
          >
            <SessionTimeScatterChart data={scatterData} />
          </Section>

          {/* Tabela detalhada */}
          <Section title="Detalhamento" flush>
            <AppTable
              rowKey="session_id"
              data={rows}
              columns={detailColumns}
            />
          </Section>
        </>
      )}
    </div>
  );
}
