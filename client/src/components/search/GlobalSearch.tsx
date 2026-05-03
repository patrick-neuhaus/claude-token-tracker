import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { Search, FileCode, ScrollText, Lock, ArrowRight, ListChecks, FolderOpen } from "lucide-react";
import { useSkillsList, type SkillSource } from "@/hooks/useSkills";
import { useSystemPromptsList } from "@/hooks/useSystemPrompts";
import { useSessions } from "@/hooks/useSessions";
import { useProjects } from "@/hooks/useProjects";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ResultKind = "skill" | "system-prompt" | "session" | "project";

interface SearchResult {
  kind: ResultKind;
  id: string;
  label: string;
  description?: string;
  href: string;
  meta?: string;
  source?: SkillSource;
  locked?: boolean;
}

const KIND_LABEL: Record<ResultKind, string> = {
  skill: "Skill",
  "system-prompt": "System Prompt",
  session: "Sessão",
  project: "Projeto",
};

const KIND_ICON: Record<ResultKind, React.ComponentType<{ className?: string }>> = {
  skill: FileCode,
  "system-prompt": ScrollText,
  session: ListChecks,
  project: FolderOpen,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: skills } = useSkillsList();
  const { data: prompts } = useSystemPromptsList();
  const { data: sessionsResp } = useSessions({ page: 1, search: "", sort_by: "last_seen", sort_dir: "desc" });
  const { data: projects } = useProjects();

  const items = useMemo<SearchResult[]>(() => {
    const out: SearchResult[] = [];
    for (const s of skills ?? []) {
      out.push({
        kind: "skill",
        id: `${s.source}:${s.name}`,
        label: s.name,
        description: s.description,
        href: `/skills/${s.name}?source=${s.source}`,
        meta: s.category || undefined,
        source: s.source,
        locked: !!s.lockedAt,
      });
    }
    for (const p of prompts ?? []) {
      if (!p.exists) continue;
      out.push({
        kind: "system-prompt",
        id: p.id,
        label: p.label,
        description: p.path.replace("C:/Users/Patrick Neuhaus/", "~/"),
        href: `/system-prompts/${p.id}`,
        meta: `${p.lineCount} linhas`,
      });
    }
    for (const session of sessionsResp?.sessions ?? []) {
      out.push({
        kind: "session",
        id: session.id,
        label: session.custom_name || session.session_id.slice(0, 24),
        description: session.session_id,
        href: `/sessions/${session.id}`,
        meta: session.project_name || undefined,
      });
    }
    for (const project of projects ?? []) {
      out.push({
        kind: "project",
        id: project.id,
        label: project.name,
        description: project.description || undefined,
        href: `/projects/${project.id}`,
        meta: `${project.session_count} sessões`,
      });
    }
    return out;
  }, [skills, prompts, sessionsResp, projects]);

  const fuse = useMemo(
    () => new Fuse(items, { keys: ["label", "description", "meta"], threshold: 0.35, ignoreLocation: true }),
    [items],
  );

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return items.slice(0, 30);
    return fuse.search(query.trim()).slice(0, 30).map((r) => r.item);
  }, [query, fuse, items]);

  // grouped for display
  const grouped = useMemo(() => {
    const map = new Map<ResultKind, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.kind)) map.set(r.kind, []);
      map.get(r.kind)!.push(r);
    }
    return Array.from(map.entries());
  }, [results]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // Re-clamp activeIndex when results change
  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(Math.max(0, results.length - 1));
  }, [results, activeIndex]);

  function go(href: string) {
    onOpenChange(false);
    navigate(href);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = results[activeIndex];
      if (selected) go(selected.href);
    }
  }

  // Compute flat index for each grouped item
  let flatIdx = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 top-4 sm:top-[20%] translate-y-0"
        onKeyDown={handleKey}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Buscar skills, system prompts, sessões, projetos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono shrink-0">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              {query.trim() ? "Nenhum resultado." : "Comece a digitar pra buscar."}
            </div>
          ) : (
            grouped.map(([kind, list]) => {
              const Icon = KIND_ICON[kind];
              return (
                <div key={kind}>
                  <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {KIND_LABEL[kind]} ({list.length})
                  </div>
                  {list.map((r) => {
                    flatIdx++;
                    const isActive = flatIdx === activeIndex;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        onClick={() => go(r.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                          isActive ? "bg-muted/60" : "hover:bg-muted/30"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono text-foreground truncate">{r.label}</span>
                            {r.source && (
                              <span className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5">{r.source}</span>
                            )}
                            {r.locked && <Lock className="h-3 w-3 text-warning shrink-0" />}
                          </div>
                          {r.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.description}</p>
                          )}
                        </div>
                        {r.meta && <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{r.meta}</span>}
                        <ArrowRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono border border-border rounded px-1">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono border border-border rounded px-1">⏎</kbd> abrir</span>
            <span><kbd className="font-mono border border-border rounded px-1">Esc</kbd> fechar</span>
          </div>
          <span className="tabular-nums">{results.length} resultado{results.length === 1 ? "" : "s"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
