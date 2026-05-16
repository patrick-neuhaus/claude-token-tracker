import { useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatUSD, formatShortDate } from "@/lib/formatters";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { Section } from "@/components/shared/Section";
import { SvgLineChart } from "@/components/charts/SvgLineChart";
import { SvgAreaStack } from "@/components/charts/SvgAreaStack";
import { SvgBarChart } from "@/components/charts/SvgBarChart";
import { BarChart2 } from "lucide-react";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { ContributionGraph } from "@/components/analytics/ContributionGraph";
import { CHART_COLORS } from "@/lib/constants";
import type { AnalyticsData } from "@/lib/types";
import { EmptyState } from "@/components/shared/EmptyState";
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
        <PageHeader title="Analytics" crumb="tracker · analytics" />
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
    .map(([day, costs]) => {
      const filled: Record<string, number> = {};
      for (const name of projectNames) filled[name] = costs[name] || 0;
      return { day, ...filled };
    });

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
    .map(([week, costs]) => {
      const filled: Record<string, number> = {};
      for (const name of modelNames) filled[name] = costs[name] || 0;
      return { week: formatShortDate(week), ...filled };
    });

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" crumb="tracker · analytics" />

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

      {/* Atividade + Padrão de uso — dados globais (stacked full-width pra não dar scroll horizontal) */}
      <div className="space-y-4">
        <Section title="Atividade por Dia">
          <ContributionGraph data={daily_cost || []} />
        </Section>

        <Section title={heatmapLabel}>
          <HeatmapWeekHour heatmap={heatmap} />
        </Section>
      </div>

      {/* === FILTRO — divide estático de filtrável === */}
      <div className="border-t border-border pt-5">
        <h2 className="text-xl font-semibold tracking-tight mb-3">Detalhamento por Período</h2>
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

      {/* Custo por Projeto — SVG inline (R8) */}
      <Section title="Custo por Projeto">
        {projectNames.length === 0 ? (
          <EmptyChart message="Nenhum projeto com sessões vinculadas ainda" />
        ) : (
          <SvgLineChart
            data={projectTrendData as Array<Record<string, string | number>>}
            xKey="day"
            series={projectNames.map((name, i) => ({
              key: name,
              label: name,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))}
            height={260}
          />
        )}
      </Section>

      {/* Comparação de projetos */}
      <ProjectComparison dateRange={dateRange} />

      {/* Tendência de modelos — SVG inline (R8) */}
      <Section title="Custo por Modelo (por semana)">
        {modelNames.length === 0 ? (
          <EmptyChart message="Nenhum dado de modelo encontrado" />
        ) : (
          <SvgAreaStack
            data={modelTrendData as Array<Record<string, string | number>>}
            xKey="week"
            series={modelNames.map((name, i) => ({
              key: name,
              label: name,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))}
            stacked
            height={260}
            formatX={(v) => v}
          />
        )}
      </Section>

      {/* Top 10 sessões mais caras — agrupado por nome (R8-FIX-6) */}
      <Section title="Top 10 Sessões mais Caras" description="Sessões com mesmo nome agrupadas">
        {!top_sessions?.length ? (
          <EmptyChart message="Nenhuma sessão encontrada" />
        ) : (() => {
          const map = new Map<string, { name: string; cost: number; count: number; entries: number }>();
          for (const s of top_sessions) {
            const key = s.custom_name || s.session_id;
            const display = s.custom_name || s.session_id.slice(0, 12) + "…";
            const existing = map.get(key);
            if (existing) {
              existing.cost += s.total_cost_usd;
              existing.count += 1;
              existing.entries += s.entry_count;
            } else {
              map.set(key, { name: display, cost: s.total_cost_usd, count: 1, entries: s.entry_count });
            }
          }
          const grouped = [...map.values()].sort((a, b) => b.cost - a.cost).slice(0, 10);
          return (
            <SvgBarChart
              data={grouped.map((g) => ({
                name: g.count > 1 ? `${g.name} (${g.count})` : g.name,
                cost: g.cost,
              })) as Array<Record<string, string | number>>}
              xKey="name"
              series={[{ key: "cost", label: "Custo", color: "hsl(var(--chart-1))" }]}
              horizontal
              height={Math.max(180, grouped.length * 36)}
              formatY={(v) => formatUSD(v)}
              formatTooltip={(_k, v, row) => `${row.name}: ${formatUSD(v)}`}
            />
          );
        })()}
      </Section>

    </div>
  );
}
