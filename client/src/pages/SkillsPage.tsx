import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { useSkillsList } from "@/hooks/useSkills";
import { SkillCard } from "@/components/skills/SkillCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "all", "meta", "code-review", "guard", "implementation", "design",
  "knowledge", "content", "infra", "people", "marketing", "workflow", "meeting", "optimization",
];

export function SkillsPage() {
  const { data: skills, isLoading, isError, refetch } = useSkillsList();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [lockedOnly, setLockedOnly] = useState(false);

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
    let list = skills;
    if (search.trim() && fuse) {
      list = fuse.search(search.trim()).map((r) => r.item);
    }
    if (category !== "all") {
      list = list.filter((s) => s.category === category);
    }
    if (lockedOnly) {
      list = list.filter((s) => !!s.lockedAt);
    }
    return list;
  }, [skills, search, category, lockedOnly, fuse]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
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
          <p className="text-sm text-muted-foreground mt-1">
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhuma skill encontrada com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SkillCard key={s.name} skill={s} />
          ))}
        </div>
      )}
    </div>
  );
}
