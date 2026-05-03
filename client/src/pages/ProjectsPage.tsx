import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { formatUSD, formatDate } from "@/lib/formatters";
import { surface } from "@/lib/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonRows } from "@/components/shared/SkeletonGrid";
import { ViewModeToggle } from "@/components/shared/ViewModeToggle";
import { ClickableRow, handleEnterSpaceKey } from "@/components/shared/ClickableRow";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewModeState] = useState<"grid" | "list">(() => {
    try {
      const saved = localStorage.getItem("projects_view_mode");
      return saved === "grid" || saved === "list" ? saved : "list";
    } catch {
      return "list";
    }
  });
  const setViewMode = (m: "grid" | "list") => {
    setViewModeState(m);
    try {
      localStorage.setItem("projects_view_mode", m);
    } catch {
      /* noop */
    }
  };

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }
    createProject.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Projeto criado com sucesso");
          setDialogOpen(false);
          setName("");
          setDescription("");
        },
        onError: (err) => {
          toast.error(err.message || "Erro ao criar projeto");
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-md border overflow-hidden">
          <SkeletonRows count={6} className="space-y-0" />
        </div>
      </div>
    );
  }

  const projectList = projects;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Projetos</h2>
        <div className="flex items-center gap-2">
          {/* Toggle view */}
          {projectList && projectList.length > 0 && (
            <ViewModeToggle
              options={[
                { value: "grid", icon: LayoutGrid, label: "Visualização em grade" },
                { value: "list", icon: List, label: "Visualização em lista" },
              ]}
              value={viewMode}
              onChange={setViewMode}
            />
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {!projectList || projectList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Nenhum projeto ainda
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Crie um projeto para agrupar sessões e ver custos consolidados
          </p>
          <Button className="mt-6" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Projeto
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projectList.map((project) => (
            <ClickableRow
              key={project.id}
              mode="link"
              to={`/projects/${project.id}`}
              className={`${surface.section} px-5 py-4 rounded-md`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight group-hover:text-info transition-colors truncate">{project.name}</h3>
                <Badge variant="secondary" className="shrink-0">
                  {project.session_count} {project.session_count === 1 ? "sessão" : "sessões"}
                </Badge>
              </div>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center justify-between text-sm mt-3 mb-1">
                <div>
                  <span className="text-muted-foreground">Custo: </span>
                  <span className="font-medium tabular-nums">{formatUSD(project.total_cost_usd)}</span>
                </div>
                {project.last_activity && (
                  <span className="text-muted-foreground text-xs">{formatDate(project.last_activity)}</span>
                )}
              </div>
              {project.sparkline?.length ? (
                <div className="h-10 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={project.sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Area type="monotone" dataKey="cost" stroke="hsl(var(--info))" fill="hsl(var(--info))" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </ClickableRow>
          ))}
        </div>
      ) : (
        /* List view — compacta para 30+ projetos */
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 font-medium">Projeto</th>
                <th className="text-right p-3 font-medium">Sessões</th>
                <th className="text-right p-3 font-medium">Custo</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">Última atividade</th>
                <th className="p-3 w-24 hidden md:table-cell">7 dias</th>
              </tr>
            </thead>
            <tbody>
              {projectList
                .slice()
                .sort((a, b) => b.total_cost_usd - a.total_cost_usd)
                .map((project) => (
                  <tr
                    key={project.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Abrir projeto ${project.name}`}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    onKeyDown={handleEnterSpaceKey(() => navigate(`/projects/${project.id}`))}
                  >
                    <td className="p-3">
                      <div className="font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">{project.description}</div>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{project.session_count}</td>
                    <td className="p-3 text-right font-medium tabular-nums">{formatUSD(project.total_cost_usd)}</td>
                    <td className="p-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                      {project.last_activity ? formatDate(project.last_activity) : "—"}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {project.sparkline?.length ? (
                        <div className="h-8 w-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={project.sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                              <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Nome</Label>
              <Input
                id="project-name"
                placeholder="Nome do projeto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">Descrição (opcional)</Label>
              <Input
                id="project-desc"
                placeholder="Descrição do projeto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createProject.isPending}
            >
              {createProject.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
