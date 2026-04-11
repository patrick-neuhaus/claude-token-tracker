import { useState } from "react";
import { useSummary, useCharts, type DashboardFilters } from "@/hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { MonthNarrative } from "@/components/dashboard/MonthNarrative";
import { PlanIndicator } from "@/components/dashboard/PlanIndicator";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CostByModelChart } from "@/components/dashboard/CostByModelChart";
import { CostBySourceChart } from "@/components/dashboard/CostBySourceChart";
import { DailyCostChart } from "@/components/dashboard/DailyCostChart";
// PeriodTable removido — dados redundantes com SummaryCards
import { DashboardFilters as DashboardFiltersBar } from "@/components/dashboard/DashboardFilters";
import { BudgetAlert } from "@/components/dashboard/BudgetAlert";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({ period: "month" });
  const { user } = useAuth();
  const planCost = Number(user?.plan_cost_usd) || 200;
  const dailyBudget = user?.daily_budget_usd ?? null;

  const { data: summary, isLoading: loadingSummary, isError: errorSummary, refetch: refetchSummary } = useSummary(filters);
  const { data: charts, isLoading: loadingCharts, isError: errorCharts, refetch: refetchCharts } = useCharts(filters);

  const s = summary;
  const c = charts;

  if (loadingSummary || loadingCharts) {
    return <DashboardSkeleton />;
  }

  if (errorSummary || errorCharts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Erro ao carregar dados</p>
        <Button variant="outline" onClick={() => { refetchSummary(); refetchCharts(); }}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!s || s.entry_count === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="rounded-full bg-muted p-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium">Nenhum dado ainda</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Configure o webhook nos seus scripts ou importe um CSV com dados históricos para começar a rastrear.
        </p>
        <Link to="/settings">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Ir para Configurações
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      <SummaryCards
        totalCostUsd={s.total_cost_usd}
        totalTokens={Number(s.total_tokens)}
        entryCount={s.entry_count}
        sessionCount={s.session_count}
        totalCacheRead={Number(s.total_cache_read)}
        totalInput={Number(s.total_input)}
        cacheSavingsUsd={s.cache_savings_usd}
      />

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
    </div>
  );
}
