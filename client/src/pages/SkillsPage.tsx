import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { useSkillsList, type SkillSummary, type SkillSource } from "@/hooks/useSkills";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pill } from "@/components/shared/Pill";
import { Search, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterChip, FilterChipGroup } from "@/components/shared/FilterChip";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";

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

export function SkillsPage() {
  const navigate = useNavigate();
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

  function toggleSort(col: string) {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col as SortCol);
      setSortDir("asc");
    }
  }

  const columns: AppTableColumn<SkillSummary>[] = [
    {
      key: "name",
      header: "Nome",
      width: "minmax(140px,1.1fr)",
      sortable: true,
      mono: true,
      render: (v) => <span className="text-foreground group-hover:text-info transition-colors truncate block">{v}</span>,
    },
    {
      key: "source",
      header: "Source",
      width: "100px",
      sortable: true,
      render: (v: SkillSource) => (
        <Pill variant={v === "skillforge" ? "ok" : v === "omc" ? "info" : "neutral"}>
          {SOURCE_LABEL[v]}
        </Pill>
      ),
    },
    {
      key: "description",
      header: "Descrição",
      width: "minmax(260px,3fr)",
      render: (v: string) => {
        const trim = v.length > 140 ? v.slice(0, 137).replace(/\s+\S*$/, "") + "…" : v;
        return <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{trim}</span>;
      },
    },
    {
      key: "category",
      header: "Categoria",
      width: "120px",
      sortable: true,
      render: (v: string | undefined) => {
        if (!v) return <span className="text-xs text-muted-foreground">—</span>;
        return <Pill variant="neutral" dot={false}>{v}</Pill>;
      },
    },
    {
      key: "fileCount",
      header: "Arq",
      width: "80px",
      align: "right",
      mono: true,
      sortable: true,
      render: (v) => <span className="text-muted-foreground">{v}</span>,
    },
    {
      key: "lockedAt",
      header: "Lock-in",
      width: "100px",
      sortable: true,
      mono: true,
      render: (v) => (
        v ? (
          <span className="inline-flex items-center gap-1 text-warning text-xs">
            <Lock className="h-3 w-3" />
            {v}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )
      ),
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
        crumb="claude · skills"
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
        <AppTable<SkillSummary>
          rowKey={(s) => `${s.source}:${s.name}`}
          data={filtered}
          columns={columns}
          sortKey={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
          onRowClick={(s) => navigate(`/skills/${s.name}?source=${s.source}`)}
        />
      )}
    </div>
  );
}
