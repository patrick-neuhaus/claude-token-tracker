import { useMemo, useState } from "react";
import { useSessionTime } from "@/hooks/useSessionTime";
import { formatUSD, formatNumber, formatDate } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { Clock, DollarSign, Activity, Layers, Info } from "lucide-react";
import { CHART_COLORS, MS_PER_DAY } from "@/lib/constants";
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

  // dados ordenados por tempo util pro gráfico
  const chartByTime = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.tempo_util_segundos - a.tempo_util_segundos)
      .map((r) => ({
        name: r.sessao.length > 24 ? r.sessao.slice(0, 22) + "…" : r.sessao,
        tempo: r.tempo_util_segundos,
        custo: r.custo_usd,
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
        <h1 className="text-2xl font-bold">Tempo por Sessão</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tempo útil aproximado por sessão. Ajuste o gap máximo considerado como trabalho contínuo.
        </p>
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="p-4 space-y-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Loading / error */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      )}

      {isError && (
        <EmptyState icon={Activity} message="Erro ao carregar dados" />
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState icon={Clock} message="Nenhuma sessão encontrada no período" />
      )}

      {!isLoading && rows.length > 0 && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-muted p-2 text-green-400">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo Total</p>
                  <p className="text-lg font-bold tabular-nums">{formatUSD(totals.custo)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-muted p-2 text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tempo Útil</p>
                  <p className="text-lg font-bold tabular-nums">{formatDuration(totals.tempo)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-muted p-2 text-amber-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessões</p>
                  <p className="text-lg font-bold tabular-nums">{formatNumber(totals.sessoes)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-muted p-2 text-purple-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Calls</p>
                  <p className="text-lg font-bold tabular-nums">{formatNumber(totals.calls)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico: tempo útil por sessão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tempo Útil por Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, chartByTime.length * 38)}>
                <BarChart
                  data={chartByTime}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatDuration(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v) => formatDuration(Number(v))}
                    {...TOOLTIP_PROPS}
                  />
                  <Bar dataKey="tempo" name="tempo" radius={[0, 4, 4, 0]}>
                    {chartByTime.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico: custo por sessão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custo por Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, chartByTime.length * 38)}>
                <BarChart
                  data={chartByTime}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v) => formatUSD(Number(v))} {...TOOLTIP_PROPS} />
                  <Bar dataKey="custo" name="custo" radius={[0, 4, 4, 0]}>
                    {chartByTime.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabela detalhada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Sessão</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Tempo Útil</TableHead>
                    <TableHead className="text-right">Início</TableHead>
                    <TableHead className="text-right pr-4">Fim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.session_id}>
                      <TableCell className="font-medium max-w-[240px] truncate pl-4">{r.sessao}</TableCell>
                      <TableCell>
                        {r.project_name ? (
                          <Badge variant="secondary" className="text-xs">{r.project_name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatUSD(r.custo_usd)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(r.calls)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDuration(r.tempo_util_segundos)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap tabular-nums">{formatDate(r.inicio)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap tabular-nums pr-4">{formatDate(r.fim)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
