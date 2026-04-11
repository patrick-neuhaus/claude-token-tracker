import { useState } from "react";
import { useSessions, type SessionFilters } from "@/hooks/useSessions";
import { useProjects } from "@/hooks/useProjects";
import { SessionsTable } from "@/components/sessions/SessionsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, DollarSign, Layers, TrendingUp, BarChart3 } from "lucide-react";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { NativeSelect } from "@/components/shared/NativeSelect";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatUSD, formatNumber } from "@/lib/formatters";

export function SessionsPage() {
  const [filters, setFilters] = useState<SessionFilters>({
    page: 1,
    search: "",
    sort_by: "last_seen",
    sort_dir: "desc",
  });

  const [dateRange, setDateRange] = useState<{ preset?: string; from?: string; to?: string }>({});

  const { data, isLoading } = useSessions({
    ...filters,
    from: dateRange.from,
    to: dateRange.to,
  });
  const { data: projectsData } = useProjects();
  const projects = projectsData || [];

  function handleSort(col: string) {
    setFilters((f) => ({
      ...f,
      page: 1,
      sort_by: col,
      sort_dir: f.sort_by === col && f.sort_dir === "desc" ? "asc" : "desc",
    }));
  }

  const hasActiveFilters = !!(filters.project_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessões</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            className="pl-10"
          />
        </div>
      </div>

      {/* Date range filter */}
      <DateRangeFilter
        value={dateRange}
        onChange={(range) => {
          setDateRange(range);
          setFilters((f) => ({ ...f, page: 1 }));
        }}
        presets={[
          { value: "today", label: "Hoje" },
          { value: "7d", label: "7 dias" },
          { value: "30d", label: "30 dias" },
          { value: "month", label: "Este mês" },
          { value: "all", label: "Tudo" },
        ]}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {projects.length > 0 && (
          <NativeSelect
            value={filters.project_id || ""}
            onChange={(e) => setFilters((f) => ({ ...f, project_id: e.target.value || undefined, page: 1 }))}
            className="w-44"
          >
            <option value="">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => setFilters((f) => ({ ...f, project_id: undefined, page: 1 }))}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : data?.sessions?.length ? (
        <>
          {data.aggregates && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-muted p-2 text-green-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Custo Total</p>
                    <p className="text-lg font-bold tabular-nums">{formatUSD(data.aggregates.total_cost_usd)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-muted p-2 text-blue-400">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sessões</p>
                    <p className="text-lg font-bold tabular-nums">{formatNumber(data.total)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-muted p-2 text-amber-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Custo Médio</p>
                    <p className="text-lg font-bold tabular-nums">{formatUSD(data.aggregates.avg_session_cost)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-muted p-2 text-purple-400">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mais Cara</p>
                    <p className="text-lg font-bold tabular-nums">{formatUSD(data.aggregates.max_session_cost)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <SessionsTable
            sessions={data!.sessions}
            sortBy={filters.sort_by}
            sortDir={filters.sort_dir}
            onSort={handleSort}
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              Mostrando {data.sessions.length} de {formatNumber(data.total)} sessões
            </p>
            <Pagination page={filters.page} pages={data!.pages} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
          </div>
        </>
      ) : (
        <EmptyState message="Nenhuma sessão encontrada." />
      )}
    </div>
  );
}
