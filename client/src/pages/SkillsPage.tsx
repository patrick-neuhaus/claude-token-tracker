import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import { useSkillsList, type SkillSummary } from "@/hooks/useSkills";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Lock, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "all", "meta", "code-review", "guard", "implementation", "design",
  "knowledge", "content", "infra", "people", "marketing", "workflow", "meeting", "optimization",
];

const CATEGORY_COLOR: Record<string, string> = {
  meta: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  "code-review": "border-info/40 bg-info/10 text-info",
  guard: "border-warning/40 bg-warning/10 text-warning",
  optimization: "border-success/40 bg-success/10 text-success",
  implementation: "border-info/40 bg-info/10 text-info",
  design: "border-chart-5/40 bg-chart-5/10 text-chart-5",
  knowledge: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  content: "border-border bg-muted/30 text-muted-foreground",
  infra: "border-warning/40 bg-warning/10 text-warning",
  people: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  meeting: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  workflow: "border-info/40 bg-info/10 text-info",
  marketing: "border-chart-5/40 bg-chart-5/10 text-chart-5",
};

type SortCol = "name" | "category" | "fileCount" | "lockedAt";

const COLS = "minmax(160px,1.2fr) minmax(280px,3fr) 130px 90px 110px 32px";

export function SkillsPage() {
  const { data: skills, isLoading, isError, refetch } = useSkillsList();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [lockedOnly, setLockedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fuse = useMemo(() => {
    if (!skills) return null;
    return new Fuse(skills, {
      keys: ["name", "description"],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [skills]);

  const filtered = useMemo(() => {
    if (!skills) return [];
    let list: SkillSummary[] = skills;
    if (search.trim() && fuse) {
      list = fuse.search(search.trim()).map((r) => r.item);
    }
    if (category !== "all") {
      list = list.filter((s) => s.category === category);
    }
    if (lockedOnly) {
      list = list.filter((s) => !!s.lockedAt);
    }
    // Sort
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "category": return ((a.category || "zzz").localeCompare(b.category || "zzz")) * dir;
        case "fileCount": return (a.fileCount - b.fileCount) * dir;
        case "lockedAt": return ((a.lockedAt || "").localeCompare(b.lockedAt || "")) * dir;
      }
    });
    return list;
  }, [skills, search, category, lockedOnly, fuse, sortBy, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Erro ao carregar skills</p>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Verifica se o skillforge-arsenal está em <code className="font-mono text-xs">~/Documents/Github/skillforge-arsenal</code>
        </p>
        <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Skills</h2>
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {filtered.length} de {skills?.length ?? 0} skills do skillforge-arsenal
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setLockedOnly(!lockedOnly)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-sm border transition-colors ${
            lockedOnly
              ? "bg-warning/15 border-warning/40 text-warning"
              : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <Lock className="h-3 w-3" />
          Lock-in
        </button>
      </div>

      {/* Category chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${
              category === cat
                ? "bg-info/15 border-info/40 text-info"
                : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tabela densa */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-border rounded-md bg-card">
          Nenhuma skill encontrada com esses filtros.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          {/* Header */}
          <div
            className="grid gap-3 px-5 py-3 border-b border-border bg-muted/30"
            style={{ gridTemplateColumns: COLS }}
          >
            {sortHead("name", "Nome")}
            <span className="text-xs font-medium text-muted-foreground">Descrição</span>
            {sortHead("category", "Categoria")}
            {sortHead("fileCount", "Arquivos", "right")}
            {sortHead("lockedAt", "Lock-in")}
            <span></span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((s) => {
              const trim = s.description.length > 140
                ? s.description.slice(0, 137).replace(/\s+\S*$/, "") + "…"
                : s.description;
              const catClass = s.category ? (CATEGORY_COLOR[s.category] || "border-border bg-muted/30 text-muted-foreground") : "";
              return (
                <Link
                  key={s.name}
                  to={`/skills/${s.name}`}
                  className="grid gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors items-center group"
                  style={{ gridTemplateColumns: COLS }}
                >
                  <span className="font-mono text-sm text-foreground group-hover:text-info transition-colors truncate">
                    {s.name}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{trim}</span>
                  <span>
                    {s.category ? (
                      <Badge variant="outline" className={`text-[10px] ${catClass}`}>{s.category}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="text-sm text-right tabular-nums text-muted-foreground">{s.fileCount}</span>
                  <span className="text-xs tabular-nums">
                    {s.lockedAt ? (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <Lock className="h-3 w-3" />
                        {s.lockedAt}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity justify-self-end" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
