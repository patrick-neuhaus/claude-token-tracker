import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSystemPromptsList, type SystemPromptSummary } from "@/hooks/useSystemPrompts";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, ScrollText } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";

type SortCol = "label" | "lineCount" | "lastModified" | "bytes";

const COLS = "minmax(200px,1.5fr) minmax(280px,3fr) 90px 100px 160px 32px";

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

  function toggleSort(col: SortCol) {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortBy !== col) return <ArrowUpDown className="inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />;
  }

  function sortHead(col: SortCol, label: string, align: "left" | "right" = "left") {
    return (
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {label}
        <SortIcon col={col} />
      </button>
    );
  }

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
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-muted-foreground" />
            System Prompts
          </h2>
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {filtered.length} de {prompts?.length ?? 0} arquivos · {existing} existem
          </p>
        </div>
      </div>

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
        <div className="text-center py-16 text-muted-foreground text-sm border border-border rounded-md bg-card">
          Nenhum system prompt encontrado.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div
            className="grid gap-3 px-5 py-3 border-b border-border bg-muted/30"
            style={{ gridTemplateColumns: COLS }}
          >
            {sortHead("label", "Label")}
            <span className="text-xs font-medium text-muted-foreground">Path</span>
            {sortHead("lineCount", "Linhas", "right")}
            {sortHead("bytes", "Tamanho", "right")}
            {sortHead("lastModified", "Modificado")}
            <span></span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((p: SystemPromptSummary) => (
              <Link
                key={p.id}
                to={`/system-prompts/${p.id}`}
                className={`grid gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors items-center group ${
                  !p.exists ? "opacity-50" : ""
                }`}
                style={{ gridTemplateColumns: COLS }}
              >
                <span className="text-sm text-foreground group-hover:text-info transition-colors truncate">
                  {p.label}
                </span>
                <span className="text-xs font-mono text-muted-foreground truncate" title={p.path}>
                  {p.path.replace("C:/Users/Patrick Neuhaus/", "~/")}
                </span>
                <span className="text-sm text-right tabular-nums text-muted-foreground">
                  {p.exists ? p.lineCount : "—"}
                </span>
                <span className="text-sm text-right tabular-nums text-muted-foreground">
                  {p.exists ? formatBytes(p.bytes) : "—"}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatDate(p.lastModified)}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity justify-self-end" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
