import { useState } from "react";
import { useSessions, type SessionFilters } from "@/hooks/useSessions";
import { useProjects } from "@/hooks/useProjects";
import { SessionsTable } from "@/components/sessions/SessionsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { NativeSelect } from "@/components/shared/NativeSelect";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";

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
  const projects = (projectsData as any)?.projects ?? [];

  const d = data as any;

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
            {projects.map((p: any) => (
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
        <p className="text-muted-foreground">Carregando...</p>
      ) : d?.sessions?.length > 0 ? (
        <>
          <SessionsTable
            sessions={d.sessions}
            sortBy={filters.sort_by}
            sortDir={filters.sort_dir}
            onSort={handleSort}
          />
          <Pagination page={filters.page} pages={d.pages} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </>
      ) : (
        <EmptyState message="Nenhuma sessão encontrada." />
      )}
    </div>
  );
}
