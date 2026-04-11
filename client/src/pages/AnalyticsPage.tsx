import { useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatUSD, formatTokens, formatNumber, formatShortDate, formatFullDate } from "@/lib/formatters";
import { useProjects } from "@/hooks/useProjects";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart2, Clock, Flame, Trophy, Zap } from "lucide-react";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { ContributionGraph } from "@/components/analytics/ContributionGraph";
import { CHART_COLORS, DOW_LABELS_FULL } from "@/lib/constants";
import type { ProjectComparisonData, AnalyticsData } from "@/lib/types";
import { EmptyState } from "@/components/shared/EmptyState";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";

function delta(current: number, last: number) {
  if (last === 0) return null;
  return ((current - last) / last) * 100;
}

function DeltaBadge({ current, last, metricType = "cost" }: { current: number; last: number; metricType?: "cost" | "neutral" }) {
  const d = delta(current, last);
  if (d === null) return <span className="text-xs text-muted-foreground">Sem mês anterior</span>;
  const up = d >= 0;
  const Icon = d === 0 ? Minus : up ? TrendingUp : TrendingDown;
  // cost: up = ruim (vermelho); neutral: up = bom (verde); down sempre cinza
  let color = "text-muted-foreground";
  if (d !== 0) {
    if (metricType === "cost") {
      color = up ? "text-red-400" : "text-green-400";
    } else {
      color = up ? "text-green-400" : "text-muted-foreground";
    }
  }
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(d).toFixed(1)}% vs mês anterior
    </span>
  );
}

// EmptyChart usa EmptyState compartilhado
function EmptyChart({ message }: { message: string }) {
  return <EmptyState icon={BarChart2} message={message} className="h-40 py-0" />;
}



// Componente de comparação de projetos
function ProjectComparison({ dateRange }: { dateRange: { from?: string; to?: string } }) {
  const { data: projectsData } = useProjects();
  const projects = projectsData || [];
  const [selected, setSelected] = useState<string[]>([]);

  const qs = new URLSearchParams();
  if (selected.length) qs.set("projects", selected.join(","));
  if (dateRange.from) qs.set("from", dateRange.from);
  if (dateRange.to) qs.set("to", dateRange.to);

  const { data: compareData } = useQuery({
    queryKey: ["analytics", "compare", selected, dateRange],
    queryFn: () => api.get(`/analytics/compare?${qs.toString()}`),
    enabled: selected.length >= 2,
  });

  const cd = compareData as ProjectComparisonData | undefined;

  // pivot daily por projeto
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const row of (cd?.daily || [])) {
    const day = row.day.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = {};
    dailyMap[day][row.project] = (dailyMap[day][row.project] || 0) + row.cost_usd;
  }
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, costs]) => ({ day, ...costs }));
  const projectNamesInComparison = [...new Set<string>((cd?.daily || []).map((r) => r.project))];

  function toggleProject(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  if (projects.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparação de Projetos</CardTitle>
        <p className="text-xs text-muted-foreground">Selecione até 3 projetos para comparar</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção */}
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleProject(p.id)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selected.includes(p.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {selected.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-4">Selecione pelo menos 2 projetos</p>
        )}

        {selected.length >= 2 && cd && (
          <>
            {/* Tabela comparativa */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-3 font-medium">Projeto</th>
                    <th className="text-right p-3 font-medium">Custo total</th>
                    <th className="text-right p-3 font-medium">Sessões</th>
                    <th className="text-right p-3 font-medium">Tokens</th>
                    <th className="text-right p-3 font-medium">Custo/sessão</th>
                  </tr>
                </thead>
                <tbody>
                  {(cd.summary || []).map((row, i) => (
                    <tr key={row.project_id} className="border-b last:border-0">
                      <td className="p-3 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {row.project}
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">{formatUSD(row.total_cost_usd)}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(row.session_count)}</td>
                      <td className="p-3 text-right tabular-nums">{formatTokens(row.total_tokens)}</td>
                      <td className="p-3 text-right tabular-nums">{formatUSD(row.cost_per_session)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gráfico sobrepostos */}
            {dailyData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} width={56} />
                  <Tooltip formatter={(v) => formatUSD(Number(v))} labelFormatter={(v) => formatShortDate(String(v))} {...TOOLTIP_PROPS} />
                  <Legend />
                  {projectNamesInComparison.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} dot={false} strokeWidth={2} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ preset?: string; from?: string; to?: string }>({});
  const { data, isLoading } = useAnalytics({ from: dateRange.from, to: dateRange.to });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;
  const d = data as AnalyticsData;

  const { project_trend, model_trend, top_sessions, period_comparison, heatmap, data_range, hourly, streaks, daily_cost } = d;

  // Heatmap label adaptativo
  const heatmapLabel = data_range?.total_days
    ? `Padrão de Uso (${data_range.total_days} ${data_range.total_days === 1 ? "dia" : "dias"} de histórico)`
    : "Padrão de Uso";

  // --- 1. Project Trend: pivot por projeto ---
  type PT = AnalyticsData["project_trend"][number];
  type MT = AnalyticsData["model_trend"][number];
  type HM = AnalyticsData["heatmap"][number];
  const projectNames = [...new Set<string>(project_trend.map((r: PT) => r.project))];
  const dayMap: Record<string, Record<string, number>> = {};
  for (const row of project_trend) {
    const day = row.day.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = {};
    dayMap[day][row.project] = (dayMap[day][row.project] || 0) + row.cost_usd;
  }
  const projectTrendData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, costs]) => ({ day, ...costs }));

  // --- 2. Model Trend: pivot por modelo ---
  const modelNames = [...new Set<string>(model_trend.map((r: MT) => r.model))];
  const weekMap: Record<string, Record<string, number>> = {};
  for (const row of model_trend) {
    const week = row.week.slice(0, 10);
    if (!weekMap[week]) weekMap[week] = {};
    weekMap[week][row.model] = (weekMap[week][row.model] || 0) + row.cost_usd;
  }
  const modelTrendData = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, costs]) => ({
      week: formatShortDate(week),
      ...costs,
    }));

  // --- Heatmap: matrix 7×24 ---
  const heatmapMax = Math.max(...heatmap.map((r: HM) => r.entries), 1);
  const heatmapMatrix: Record<string, number> = {};
  for (const row of heatmap) {
    heatmapMatrix[`${row.dow}-${row.hour}`] = row.entries;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* === BLOCO ESTÁTICO — não muda com filtros === */}

      {/* Comparação de períodos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Custo este mês",
            current: period_comparison?.current_month ?? 0,
            last: period_comparison?.last_month ?? 0,
            fmt: (v: number) => formatUSD(v),
            metricType: "cost" as const,
          },
          {
            label: "Tokens este mês",
            current: Number(period_comparison?.current_tokens ?? 0),
            last: Number(period_comparison?.last_tokens ?? 0),
            fmt: (v: number) => formatTokens(v),
            metricType: "neutral" as const,
          },
          {
            label: "Entradas este mês",
            current: period_comparison?.current_entries ?? 0,
            last: period_comparison?.last_entries ?? 0,
            fmt: (v: number) => String(v),
            metricType: "neutral" as const,
          },
        ].map(({ label, current, last, fmt, metricType }) => (
          <Card key={label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{fmt(current)}</div>
              <div className="mt-1">
                <DeltaBadge current={current} last={last} metricType={metricType} />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Mês anterior: {fmt(last)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gamification — Streaks */}
      {streaks && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Streak Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {streaks.current_streak ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">dias</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Recorde: {streaks.record_streak ?? 0} dias · {streaks.active_days_total ?? 0} dias ativos total
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Dia mais Caro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{formatUSD(streaks.most_expensive_day_cost ?? 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {streaks.most_expensive_day ? formatFullDate(streaks.most_expensive_day) : "—"}
              </div>
            </CardContent>
          </Card>
          {hourly && (
            <Card>
              <CardHeader className="pb-1 flex flex-row items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Custo/Hora Ativa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {formatUSD(hourly.cost_per_active_hour)}
                  <span className="text-sm font-normal text-muted-foreground">/h</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {hourly.active_hours} horas ativas · hoje: {formatUSD(hourly.cost_today)}
                </div>
              </CardContent>
            </Card>
          )}
          {!hourly && (
            <Card>
              <CardHeader className="pb-1 flex flex-row items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessão Mais Cara</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatUSD(top_sessions?.[0]?.total_cost_usd ?? 0)}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {top_sessions?.[0]?.custom_name || top_sessions?.[0]?.session_id?.slice(0, 12) || "—"}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Custo por hora ativa (se não tem streaks) */}
      {hourly && !streaks && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Custo por Hora Ativa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{formatUSD(hourly.cost_per_active_hour)}<span className="text-sm font-normal text-muted-foreground">/hora</span></div>
              <div className="text-xs text-muted-foreground mt-1">
                {hourly.active_hours} horas ativas no período
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{formatUSD(hourly.cost_today)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {hourly.active_hours_today} horas ativas hoje
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Atividade + Padrão de uso — dados globais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ContributionGraph data={daily_cost || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{heatmapLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {!heatmap?.length ? (
              <EmptyChart message="Nenhum dado de uso encontrado" />
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex gap-1 mb-1 pl-10">
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="w-6 text-center text-xs text-muted-foreground" style={{ minWidth: 24 }}>
                        {h % 4 === 0 ? h : ""}
                      </div>
                    ))}
                  </div>
                  {DOW_LABELS_FULL.map((day, dow) => (
                    <div key={dow} className="flex items-center gap-1 mb-1">
                      <div className="w-8 text-right text-xs text-muted-foreground pr-2">{day}</div>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const val = heatmapMatrix[`${dow}-${hour}`] || 0;
                        const alpha = val === 0 ? 0.06 : 0.12 + (val / heatmapMax) * 0.88;
                        return (
                          <div
                            key={hour}
                            title={`${day} ${hour}h: ${val} entradas`}
                            className="rounded-sm"
                            style={{ width: 24, height: 24, minWidth: 24, background: `rgba(99,102,241,${alpha.toFixed(2)})` }}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2 pl-10">
                    <span className="text-xs text-muted-foreground">Menos</span>
                    {[0.06, 0.28, 0.5, 0.72, 1].map((o) => (
                      <div key={o} className="rounded-sm" style={{ width: 16, height: 16, background: `rgba(99,102,241,${o})` }} />
                    ))}
                    <span className="text-xs text-muted-foreground">Mais</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === FILTRO — divide estático de filtrável === */}
      <div className="border-t pt-4">
        <h2 className="text-lg font-semibold mb-3">Detalhamento por Período</h2>
        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          presets={[
            { value: "7d", label: "7 dias" },
            { value: "30d", label: "30 dias" },
            { value: "month", label: "Este mês" },
            { value: "all", label: "Tudo" },
          ]}
        />
      </div>

      {/* Custo por Projeto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custo por Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          {projectNames.length === 0 ? (
            <EmptyChart message="Nenhum projeto com sessões vinculadas ainda" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={projectTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => formatUSD(Number(v))} labelFormatter={(v) => formatShortDate(String(v))} {...TOOLTIP_PROPS} />
                <Legend />
                {projectNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} dot={false} strokeWidth={2} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Comparação de projetos (Wave 2C) */}
      <ProjectComparison dateRange={dateRange} />

      {/* Tendência de modelos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custo por Modelo (por semana)</CardTitle>
        </CardHeader>
        <CardContent>
          {modelNames.length === 0 ? (
            <EmptyChart message="Nenhum dado de modelo encontrado" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={modelTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => formatUSD(Number(v))} {...TOOLTIP_PROPS} />
                <Legend />
                {modelNames.map((name, i) => (
                  <Area key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.15} strokeWidth={2} stackId="1" connectNulls />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top 10 sessões mais caras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 Sessões mais Caras</CardTitle>
        </CardHeader>
        <CardContent>
          {!top_sessions?.length ? (
            <EmptyChart message="Nenhuma sessão encontrada" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, top_sessions.length * 28)}>
              <BarChart
                data={top_sessions.map((s: typeof top_sessions[number]) => ({
                  name: s.custom_name || s.session_id.slice(0, 12) + "…",
                  cost: s.total_cost_usd,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatUSD(Number(v))} {...TOOLTIP_PROPS} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {top_sessions.map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
