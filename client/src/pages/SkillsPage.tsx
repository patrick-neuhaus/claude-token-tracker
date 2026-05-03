import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Fuse from "fuse.js";
import { useSkillsList, type SkillSummary, type SkillSource } from "@/hooks/useSkills";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";
import { FilterChip, FilterChipGroup } from "@/components/shared/FilterChip";
import { PageHeader } from "@/components/shared/PageHeader";

const CATEGORIES = [
  "all", "meta", "code-review", "guard", "implementation", "design",
  "knowledge", "content", "infra", "people", "marketing", "workflow", "meeting", "optimization",
];

const SOURCES: ("all" | SkillSource)[] = ["all", "skillforge", "omc", "builtin"];

const SOURCE_COLOR: Record<SkillSource, string> = {
  skillforge: "border-info/40 bg-info/10 text-info",
  omc: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  builtin: "border-border bg-muted/30 text-muted-foreground",
};

const SOURCE_LABEL: Record<SkillSource, string> = {
  skillforge: "skillforge",
  omc: "omc",
  builtin: "built-in",
};

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

type SortCol = "name" | "source" | "category" | "fileCount" | "lockedAt";

const COLS = "minmax(140px,1.1fr) 100px minmax(260px,3fr) 120px 80px 100px 32px";

export function SkillsPage() {
  const { data: skills, isLoading, isError, refetch } = useSkillsList();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [source, setSource] = useState<"all" | SkillSource>("all");
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
    if (source !== "all") {
      list = list.filter((s) => s.source === source);
    }
    if (lockedOnly) {
      list = list.filter((s) => !!s.lockedAt);
    }
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "source": return a.source.localeCompare(b.source) * dir;
        case "category": return ((a.category || "zzz").localeCompare(b.category || "zzz")) * dir;
        case "fileCount": return (a.fileCount - b.fileCount) * dir;
        case "lockedAt": return ((a.lockedAt || "").localeCompare(b.lockedAt || "")) * dir;
      }
    });
    return list;
  }, [skills, search, category, source, lockedOnly, fuse, sortBy, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
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
        title="Erro ao carregar skills"
        description="Verifica se as fontes estão acessíveis (skillforge-arsenal, oh-my-claudecode, ~/.claude/plugins/cache)."
        onRetry={() => refetch()}
      />
    );
  }

  // Source counts pra mostrar nos chips
  const sourceCounts: Record<string, number> = { all: skills?.length ?? 0 };
  for (const s of skills ?? []) {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Skills"
        subtitle={
          <>
            {filtered.length} de {skills?.length ?? 0} skills
            {" · "}
            <span className="text-info">{sourceCounts.skillforge || 0} skillforge</span>
            {" · "}
            <span className="text-chart-4">{sourceCounts.omc || 0} omc</span>
            {" · "}
            <span>{sourceCounts.builtin || 0} built-in</span>
          </>
        }
      />

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
        <FilterChip
          label="Lock-in"
          active={lockedOnly}
          onClick={() => setLockedOnly(!lockedOnly)}
          icon={Lock}
          variant="warning"
        />
      </div>

      {/* Source chips */}
      <FilterChipGroup
        label="source:"
        options={SOURCES.map((src) => ({
          value: src,
          label: src === "all" ? "all" : SOURCE_LABEL[src],
          count: sourceCounts[src] || 0,
        }))}
        active={source}
        onChange={setSource}
      />

      {/* Category chips */}
      <FilterChipGroup
        label="categoria:"
        options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
        active={category}
        onChange={setCategory}
      />

      {/* Tabela densa */}
      {filtered.length === 0 ? (
        (search || category !== "all" || source !== "all" || lockedOnly) ? (
          <EmptyState
            message="Nenhuma skill com esses filtros"
            description="Tente remover ou ajustar os filtros aplicados."
            action={
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setSource("all");
                  setLockedOnly(false);
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState message="Nenhuma skill registrada" />
        )
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          {/* Header */}
          <div
            className="grid gap-3 px-5 py-3 border-b border-border bg-muted/30"
            style={{ gridTemplateColumns: COLS }}
          >
            <SortableTableHeader col="name" label="Nome" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <SortableTableHeader col="source" label="Source" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <span className="text-xs font-medium text-muted-foreground">Descrição</span>
            <SortableTableHeader col="category" label="Categoria" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <SortableTableHeader col="fileCount" label="Arq" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
            <SortableTableHeader col="lockedAt" label="Lock-in" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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
                  key={`${s.source}:${s.name}`}
                  to={`/skills/${s.name}?source=${s.source}`}
                  className="grid gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors items-center group"
                  style={{ gridTemplateColumns: COLS }}
                >
                  <span className="font-mono text-sm text-foreground group-hover:text-info transition-colors truncate">
                    {s.name}
                  </span>
                  <span>
                    <Badge variant="outline" className={`text-[10px] ${SOURCE_COLOR[s.source]}`}>
                      {SOURCE_LABEL[s.source]}
                    </Badge>
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
