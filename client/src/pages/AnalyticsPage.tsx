import { useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatUSD, formatShortDate } from "@/lib/formatters";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { Section } from "@/components/shared/Section";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell,
} from "recharts";
import { BarChart2 } from "lucide-react";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { ContributionGraph } from "@/components/analytics/ContributionGraph";
import { CHART_COLORS } from "@/lib/constants";
import type { AnalyticsData } from "@/lib/types";
import { EmptyState } from "@/components/shared/EmptyState";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodComparisonGrid } from "@/components/analytics/PeriodComparisonGrid";
import { StreaksKpiGrid } from "@/components/analytics/StreaksKpiGrid";
import { HeatmapWeekHour } from "@/components/analytics/HeatmapWeekHour";
import { ProjectComparison } from "@/components/analytics/ProjectComparison";
import { KpiBox } from "@/components/analytics/KpiBox";
import { Clock } from "lucide-react";

// EmptyChart usa EmptyState compartilhado (densidade reduzida)
function EmptyChart({ message }: { message: string }) {
  return <EmptyState icon={BarChart2} message={message} className="h-40 py-0" />;
}

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ preset?: string; from?: string; to?: string }>({});
  const { data, isLoading } = useAnalytics({ from: dateRange.from, to: dateRange.to });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <SkeletonGrid count={4} cols={1} itemHeight="h-72" />
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

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" />

      {/* === BLOCO ESTÁTICO — não muda com filtros === */}

      {/* Comparação de períodos */}
      <PeriodComparisonGrid periodComparison={period_comparison} />

      {/* Gamification — Streaks */}
      <StreaksKpiGrid streaks={streaks} hourly={hourly} topSessions={top_sessions} />

      {/* Custo por hora ativa (se não tem streaks) */}
      {hourly && !streaks && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <KpiBox icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="Custo por Hora Ativa" value={formatUSD(hourly.cost_per_active_hour)} suffix="/hora" hint={`${hourly.active_hours} horas ativas no período`} />
          <KpiBox icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="Hoje" value={formatUSD(hourly.cost_today)} hint={`${hourly.active_hours_today} horas ativas hoje`} />
        </div>
      )}

      {/* Atividade + Padrão de uso — dados globais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Atividade por Dia">
          <ContributionGraph data={daily_cost || []} />
        </Section>

        <Section title={heatmapLabel}>
          <HeatmapWeekHour heatmap={heatmap} />
        </Section>
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
      <Section title="Custo por Projeto">
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
      </Section>

      {/* Comparação de projetos */}
      <ProjectComparison dateRange={dateRange} />

      {/* Tendência de modelos */}
      <Section title="Custo por Modelo (por semana)">
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
      </Section>

      {/* Top 10 sessões mais caras */}
      <Section title="Top 10 Sessões mais Caras">
        {!top_sessions?.length ? (
          <EmptyChart message="Nenhuma sessão encontrada" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, top_sessions.length * 28)}>
            <BarChart
              data={top_sessions.map((s: typeof top_sessions[number]) => ({
                name: s.custom_name || s.session_id.slice(0, 12) + "…",
                cost: s.total_cost_usd,
                session_id: s.session_id,
              }))}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatUSD(Number(v))} {...TOOLTIP_PROPS} />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {top_sessions.map((s, i: number) => (
                  <Cell key={s.session_id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

    </div>
  );
}
