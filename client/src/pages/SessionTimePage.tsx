import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSessionTime } from "@/hooks/useSessionTime";
import { formatUSD, formatNumber, formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/Section";
import { surface } from "@/lib/surface";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis,
} from "recharts";
import { Clock, DollarSign, Activity, Layers, Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MS_PER_DAY } from "@/lib/constants";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";

// --- helpers ---

function formatDuration(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  if (s === 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function toDateInputValue(d: Date): string {
  // "YYYY-MM-DD" no timezone local (usa relógio do Windows)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayStartIso(dateStr: string): string {
  // dateStr = "YYYY-MM-DD" → início do dia BRT em ISO
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 0, 0, 0, 0);
  return local.toISOString();
}

function dayEndIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 23, 59, 59, 999);
  return local.toISOString();
}

// --- page ---

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

  // presets rápidos de data
  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - days * MS_PER_DAY);
    setDayFrom(toDateInputValue(from));
    setDayTo(toDateInputValue(to));
  }

  function applyThisMonth() {
    const now = new Date();
    setDayFrom(toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
    setDayTo(toDateInputValue(now));
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Tempo por Sessão</h2>
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
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Tempo útil aproximado por sessão. Ajuste o gap máximo considerado como trabalho contínuo.
        </p>
      </div>

      {/* Controles */}
      <div className={`${surface.section} px-5 py-4 space-y-4`}>
          {/* Presets + datas */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => applyPreset(1)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => applyPreset(7)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
              >
                7 dias
              </button>
              <button
                onClick={() => applyPreset(30)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
              >
                30 dias
              </button>
              <button
                onClick={applyThisMonth}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
              >
                Este mês
              </button>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs">De</span>
              <input
                type="date"
                value={dayFrom}
                max={dayTo}
                onChange={(e) => setDayFrom(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground [color-scheme:dark]"
              />
              <span className="text-muted-foreground text-xs">até</span>
              <input
                type="date"
                value={dayTo}
                min={dayFrom}
                onChange={(e) => setDayTo(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Gap slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Gap máximo</span>
                <Badge variant="secondary" className="tabular-nums">{gap} min</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Intervalos maiores que isso não contam como trabalho</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums w-8">0m</span>
              <input
                type="range"
                min={0}
                max={500}
                step={1}
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">500m</span>
            </div>
            {/* Presets rápidos */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Presets:</span>
              {[15, 30, 60, 90, 120, 180].map((v) => (
                <button
                  key={v}
                  onClick={() => setGap(v)}
                  className={`px-2.5 py-0.5 text-xs rounded-md border transition-colors ${
                    gap === v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {v >= 60 ? `${v / 60}h` : `${v}m`}
                </button>
              ))}
            </div>
          </div>
      </div>

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
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 24, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    dataKey="tempoMin"
                    name="Tempo útil"
                    tickFormatter={(v: number) => `${v.toFixed(0)}m`}
                    tick={{ fontSize: 11 }}
                    label={{ value: "Tempo útil (minutos)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#a0a0b8" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="custo"
                    name="Custo"
                    tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    tick={{ fontSize: 11 }}
                    label={{ value: "Custo (USD)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#a0a0b8" }}
                  />
                  <ZAxis type="number" dataKey="calls" range={[60, 400]} name="calls" />
                  <Tooltip
                    {...TOOLTIP_PROPS}
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const p = payload[0].payload;
                        return (
                          <div style={TOOLTIP_PROPS.contentStyle as any}>
                            <p className="text-sm font-medium" style={TOOLTIP_PROPS.itemStyle as any}>{p.name}</p>
                            <p className="text-xs" style={TOOLTIP_PROPS.labelStyle as any}>
                              Tempo: {formatDuration(p.tempoMin * 60)}
                            </p>
                            <p className="text-xs" style={TOOLTIP_PROPS.labelStyle as any}>
                              Custo: {formatUSD(p.custo)}
                            </p>
                            <p className="text-xs" style={TOOLTIP_PROPS.labelStyle as any}>
                              Calls: {p.calls}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter data={scatterData} fill="#6366f1" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
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
