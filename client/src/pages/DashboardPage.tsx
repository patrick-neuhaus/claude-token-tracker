import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSummary, useCharts, type DashboardFilters } from "@/hooks/useDashboard";
import { useInefficientSessions } from "@/hooks/useCompactions";
import { useProjects } from "@/hooks/useProjects";
import { presetToRange } from "@/components/shared/DateRangeFilter";
import { useAuth } from "@/contexts/AuthContext";
import { MonthNarrative } from "@/components/dashboard/MonthNarrative";
import { PlanIndicator } from "@/components/dashboard/PlanIndicator";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CostByModelChart } from "@/components/dashboard/CostByModelChart";
import { CostBySourceChart } from "@/components/dashboard/CostBySourceChart";
import { DailyCostChart } from "@/components/dashboard/DailyCostChart";
import { CacheHitTrendChart } from "@/components/dashboard/CacheHitTrendChart";
import { ToolP95Card } from "@/components/dashboard/ToolP95Card";
// PeriodTable removido — dados redundantes com SummaryCards
import { DashboardFilters as DashboardFiltersBar } from "@/components/dashboard/DashboardFilters";
import { BudgetAlert } from "@/components/dashboard/BudgetAlert";
import { DailyBudgetProgress } from "@/components/dashboard/DailyBudgetProgress";
import { DailyGoalBanner } from "@/components/dashboard/DailyGoalBanner";
import { WebhookPing } from "@/components/dashboard/WebhookPing";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/Section";
import { formatUSD, formatNumber } from "@/lib/formatters";
import { Zap } from "lucide-react";

function TopProjectsWeekCard() {
  const { data: projects, isLoading } = useProjects();

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  if (!projects || projects.length === 0) return null;

  // Sum sparkline (last 7 days) to get week cost per project
  const withWeekCost = projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      weekCost: Array.isArray(p.sparkline)
        ? p.sparkline.reduce((sum: number, d: { cost: number }) => sum + (d.cost || 0), 0)
        : 0,
    }))
    .filter((p) => p.weekCost > 0)
    .sort((a, b) => b.weekCost - a.weekCost)
    .slice(0, 5);

  if (withWeekCost.length === 0) return null;

  return (
    <Section title="Top projetos — última semana" description="Os 5 projetos com maior custo nos últimos 7 dias.">
      <div className="divide-y divide-border">
        {withWeekCost.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between py-2 px-1 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground w-4 tabular-nums">{i + 1}</span>
              <span className="text-sm font-mono truncate">{p.name}</span>
            </div>
            <span className="text-sm tabular-nums shrink-0">{formatUSD(p.weekCost)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <SkeletonGrid count={5} cols={5} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export function DashboardPage() {
  // Wave 7.1: resolver preset → from/to ISO no mount evita server fallback bug
  // (parsePeriod no Node UTC computava midnight errado quando cliente só mandava preset).
  // P2 fix: persistir filtros em URL searchParams pra sobreviver refresh (F5).
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<DashboardFilters>(() => {
    const period = searchParams.get("period") ?? undefined;
    const fromQs = searchParams.get("from") ?? undefined;
    const toQs = searchParams.get("to") ?? undefined;
    const model = searchParams.get("model") ?? undefined;
    const source = searchParams.get("source") ?? undefined;
    const project_id = searchParams.get("project_id") ?? undefined;
    // Default: período "month" com range resolvido (mantém comportamento Wave 7.1)
    if (!period && !fromQs && !toQs) {
      return { period: "month", ...presetToRange("month") };
    }
    // Se URL traz só preset sem from/to (paste de URL antiga), resolve aqui também.
    if (period && !fromQs && !toQs) {
      return { period, ...presetToRange(period), model, source, project_id };
    }
    return { period, from: fromQs, to: toQs, model, source, project_id };
  }, [searchParams]);

  const setFilters = useCallback((next: DashboardFilters) => {
    setSearchParams((prev) => {
      const newSp = new URLSearchParams(prev);
      const set = (k: string, v: string | undefined) => {
        if (v) newSp.set(k, v);
        else newSp.delete(k);
      };
      set("period", next.period);
      set("from", next.from);
      set("to", next.to);
      set("model", next.model);
      set("source", next.source);
      set("project_id", next.project_id);
      return newSp;
    }, { replace: true });
  }, [setSearchParams]);

  const { user } = useAuth();
  const planCost = Number(user?.plan_cost_usd) || 200;
  const dailyBudget = user?.daily_budget_usd ?? null;

  const { data: summary, isLoading: loadingSummary, isError: errorSummary, refetch: refetchSummary } = useSummary(filters);
  const { data: charts, isLoading: loadingCharts, isError: errorCharts, refetch: refetchCharts } = useCharts(filters);
  const { data: compactionData } = useInefficientSessions();

  const s = summary;
  const c = charts;

  if (loadingSummary || loadingCharts) {
    return <DashboardSkeleton />;
  }

  if (errorSummary || errorCharts) {
    return (
      <ErrorState
        title="Erro ao carregar dados"
        onRetry={() => { refetchSummary(); refetchCharts(); }}
      />
    );
  }

  if (!s || s.entry_count === 0) {
    return <WebhookPing />;
  }

  const periodLabel = filters.period === "month"
    ? "Mês atual"
    : filters.period === "today"
      ? "Hoje"
      : filters.period === "7d"
        ? "Últimos 7 dias"
        : filters.period === "30d"
          ? "Últimos 30 dias"
          : "Período";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        crumb="tracker · dashboard"
        subtitle={
          <>
            {periodLabel} · {formatNumber(s.session_count)} sessões · {formatUSD(s.total_cost_usd)}
          </>
        }
      />
      <SummaryCards
        totalCostUsd={s.total_cost_usd}
        totalTokens={Number(s.total_tokens)}
        entryCount={s.entry_count}
        sessionCount={s.session_count}
        totalCacheRead={Number(s.total_cache_read)}
        totalInput={Number(s.total_input)}
        cacheSavingsUsd={s.cache_savings_usd}
      />

      <DailyBudgetProgress todayCostUsd={s?.today_cost_usd ?? 0} dailyBudgetUsd={dailyBudget} />

      <DailyGoalBanner todayCostUsd={s?.today_cost_usd ?? 0} planCostUsd={planCost} />

      <DashboardFiltersBar filters={filters} onChange={setFilters} />

      <BudgetAlert todayCostUsd={s?.today_cost_usd ?? 0} dailyBudgetUsd={dailyBudget} />

      <MonthNarrative
        totalCostUsd={s.total_cost_usd}
        planCostUsd={planCost}
        entryCount={s.entry_count}
        sessionCount={s.session_count}
        byModel={c?.by_model || []}
        bySource={c?.by_source || []}
        daily={c?.daily || []}
      />

      <PlanIndicator
        totalCostUsd={s.total_cost_usd}
        planCostUsd={planCost}
        weeklyResetDow={user?.weekly_reset_dow ?? 2}
        weeklyResetHour={user?.weekly_reset_hour ?? 15}
        planStartDate={user?.plan_start_date}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostByModelChart data={c?.by_model || []} />
        <CostBySourceChart data={c?.by_source || []} />
      </div>

      <DailyCostChart data={c?.daily || []} />

      <TopProjectsWeekCard />

      <ToolP95Card />

      <CacheHitTrendChart data={c?.daily || []} />

      {/* Inefficient sessions (>3 compactions or <30% reduction) */}
      {compactionData?.inefficientSessions && compactionData.inefficientSessions.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-yellow-500" />
            Sessions ineficientes (&gt;3 compactações)
          </div>
          <ul className="space-y-2">
            {compactionData.inefficientSessions.slice(0, 5).map((s) => (
              <li key={s.session_id} className="flex items-center justify-between text-sm">
                <Link
                  to={`/sessions?q=${encodeURIComponent(s.session_id)}`}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                  title={s.session_id}
                >
                  {s.session_id.slice(0, 16)}…
                </Link>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="tabular-nums">{s.compaction_count}x</span>
                  {s.avg_reduction_pct !== null && (
                    <span className="text-muted-foreground tabular-nums">
                      {s.avg_reduction_pct.toFixed(1)}% redução
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
