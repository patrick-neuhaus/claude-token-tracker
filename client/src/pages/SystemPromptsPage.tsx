import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemPromptsList, type SystemPromptSummary } from "@/hooks/useSystemPrompts";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowRight, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";

type SortCol = "label" | "lineCount" | "lastModified" | "bytes";

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(2)}MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function SystemPromptsPage() {
  const navigate = useNavigate();
  const { data: prompts, isLoading, isError, refetch } = useSystemPromptsList();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortCol>("label");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!prompts) return [];
    let list = prompts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "label": return a.label.localeCompare(b.label) * dir;
        case "lineCount": return (a.lineCount - b.lineCount) * dir;
        case "lastModified": return ((a.lastModified || "").localeCompare(b.lastModified || "")) * dir;
        case "bytes": return (a.bytes - b.bytes) * dir;
      }
    });
  }, [prompts, search, sortBy, sortDir]);

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col as SortCol); setSortDir("asc"); }
  }

  const columns: AppTableColumn<SystemPromptSummary>[] = [
    {
      key: "label",
      header: "Label",
      width: "minmax(200px,1.5fr)",
      sortable: true,
      render: (v, p) => (
        <span className={`truncate ${!p.exists ? "opacity-50" : "group-hover:text-info transition-colors"}`}>
          {v}
        </span>
      ),
    },
    {
      key: "path",
      header: "Path",
      width: "minmax(280px,3fr)",
      mono: true,
      render: (v, p) => (
        <span className={`text-xs text-muted-foreground truncate ${!p.exists ? "opacity-50" : ""}`} title={v}>
          {v.replace("C:/Users/Patrick Neuhaus/", "~/")}
        </span>
      ),
    },
    {
      key: "lineCount",
      header: "Linhas",
      width: "90px",
      align: "right",
      mono: true,
      sortable: true,
      render: (v, p) => <span className="text-muted-foreground">{p.exists ? v : "—"}</span>,
    },
    {
      key: "bytes",
      header: "Tamanho",
      width: "100px",
      align: "right",
      mono: true,
      sortable: true,
      render: (v, p) => <span className="text-muted-foreground">{p.exists ? formatBytes(v) : "—"}</span>,
    },
    {
      key: "lastModified",
      header: "Modificado",
      width: "160px",
      mono: true,
      sortable: true,
      render: (v) => <span className="text-xs text-muted-foreground">{formatDate(v)}</span>,
    },
    {
      key: "_arrow",
      header: "",
      width: "32px",
      render: () => (
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity justify-self-end" />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Erro ao carregar system prompts"
        onRetry={() => refetch()}
      />
    );
  }

  const existing = prompts?.filter((p) => p.exists).length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="System Prompts"
        crumb="claude · prompts"
        icon={ScrollText}
        subtitle={`${filtered.length} de ${prompts?.length ?? 0} arquivos · ${existing} existem`}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por label ou path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        search ? (
          <EmptyState
            message="Nenhum system prompt com esse filtro"
            description="Tente buscar por outro termo ou limpe a busca."
            action={
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setSearch("")}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState message="Nenhum system prompt encontrado" />
        )
      ) : (
        <AppTable<SystemPromptSummary>
          rowKey="id"
          data={filtered}
          columns={columns}
          sortKey={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
          onRowClick={(p) => navigate(`/system-prompts/${p.id}`)}
        />
      )}
    </div>
  );
}
