import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSessionTime } from "@/hooks/useSessionTime";
import { formatUSD, formatNumber, formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/Section";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={DollarSign} iconColor="text-success" label="Custo Total" value={formatUSD(totals.custo)} />
            <StatCard icon={Clock} iconColor="text-info" label="Tempo Útil" value={formatDuration(totals.tempo)} />
            <StatCard icon={Layers} iconColor="text-warning" label="Sessões" value={formatNumber(totals.sessoes)} />
            <StatCard icon={Activity} iconColor="text-chart-4" label="Calls" value={formatNumber(totals.calls)} />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Sessão</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Tempo Útil</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="pr-4">Fim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.session_id}>
                    <TableCell className="font-medium max-w-[240px] truncate pl-4">
                      {r.session_db_id ? (
                        <Link to={`/sessions/${r.session_db_id}`} className="hover:underline">
                          {r.sessao}
                        </Link>
                      ) : (
                        r.sessao
                      )}
                    </TableCell>
                    <TableCell>
                      {r.project_name && r.project_id ? (
                        <Link to={`/projects/${r.project_id}`}>
                          <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors">{r.project_name}</Badge>
                        </Link>
                      ) : r.project_name ? (
                        <Badge variant="secondary" className="text-xs">{r.project_name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatUSD(r.custo_usd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(r.calls)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(r.tempo_util_segundos)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">{formatDate(r.inicio)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap tabular-nums pr-4">{formatDate(r.fim)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </>
      )}
    </div>
  );
}
