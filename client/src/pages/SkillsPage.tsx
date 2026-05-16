import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { useSkillsList, type SkillSummary, type SkillSource } from "@/hooks/useSkills";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterChip, FilterChipGroup } from "@/components/shared/FilterChip";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SkillCard } from "@/components/skills/SkillCard";

const CATEGORIES = [
  "all", "meta", "code-review", "guard", "implementation", "design",
  "knowledge", "content", "infra", "people", "marketing", "workflow", "meeting", "optimization",
];

const SOURCES: ("all" | SkillSource)[] = ["all", "skillforge", "omc", "builtin"];

type StatusTab = "active" | "deprecated" | "none" | "all";

const SOURCE_LABEL: Record<SkillSource, string> = {
  skillforge: "skillforge",
  omc: "omc",
  builtin: "built-in",
};

export function SkillsPage() {
  const { data: skills, isLoading, isError, refetch } = useSkillsList();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [source, setSource] = useState<"all" | SkillSource>("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("active");
  const [lockedOnly, setLockedOnly] = useState(false);

  const fuse = useMemo(() => {
    if (!skills) return null;
    return new Fuse(skills, {
      keys: ["name", "description"],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [skills]);

  // Filtra por tudo EXCETO status (status vira via tab)
  const filteredBase = useMemo(() => {
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
    return list;
  }, [skills, search, category, source, lockedOnly, fuse]);

  // Filtra adicionalmente pela tab de status
  const filtered = useMemo(() => {
    let list = filteredBase;
    if (statusTab === "active") {
      list = list.filter((s) => s.status === "active");
    } else if (statusTab === "deprecated") {
      list = list.filter((s) => s.status === "deprecated");
    } else if (statusTab === "none") {
      list = list.filter((s) => s.status == null);
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBase, statusTab]);

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

  // Source counts globais
  const sourceCounts: Record<string, number> = { all: skills?.length ?? 0 };
  for (const s of skills ?? []) {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  }

  // Status counts dentro da filteredBase (refletem busca/source/categoria/lock-in)
  const tabCounts: Record<StatusTab, number> = {
    active: 0,
    deprecated: 0,
    none: 0,
    all: filteredBase.length,
  };
  for (const s of filteredBase) {
    if (s.status === "active") tabCounts.active += 1;
    else if (s.status === "deprecated") tabCounts.deprecated += 1;
    else tabCounts.none += 1;
  }

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setSource("all");
    setLockedOnly(false);
  }

  const hasSecondaryFilters =
    !!search || category !== "all" || source !== "all" || lockedOnly;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Skills"
        crumb="claude · skills"
        subtitle={
          <>
            {skills?.length ?? 0} skills
            {" · "}
            <span className="text-info">{sourceCounts.skillforge || 0} skillforge</span>
            {" · "}
            <span className="text-chart-4">{sourceCounts.omc || 0} omc</span>
            {" · "}
            <span>{sourceCounts.builtin || 0} built-in</span>
          </>
        }
      />

      {/* Busca + lock-in */}
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

      {/* Tabs por status */}
      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
        <TabsList>
          <TabsTrigger value="active">
            Ativas ({tabCounts.active})
          </TabsTrigger>
          <TabsTrigger value="deprecated">
            Deprecated ({tabCounts.deprecated})
          </TabsTrigger>
          <TabsTrigger value="none">
            Sem status ({tabCounts.none})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas ({tabCounts.all})
          </TabsTrigger>
        </TabsList>

        {/* Filtros secundários (source + categoria) — fora dos panels pra não repetir */}
        <div className="space-y-2 mt-4">
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
          <FilterChipGroup
            label="categoria:"
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            active={category}
            onChange={setCategory}
          />
        </div>

        {/* Conteúdo: grid de cards (mesmo render pra todas as tabs — filtered já considera tab) */}
        <TabsContent value={statusTab} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              message="Nenhuma skill nesta visualização"
              description={
                hasSecondaryFilters
                  ? "Tente remover filtros ou trocar de aba."
                  : "Nenhuma skill encontrada nesta categoria de status."
              }
              action={
                hasSecondaryFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((skill) => (
                <SkillCard
                  key={`${skill.source}:${skill.name}`}
                  skill={skill}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
