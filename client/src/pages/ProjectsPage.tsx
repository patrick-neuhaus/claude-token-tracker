import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { formatUSD, formatDate } from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const projectList = projects;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <div className="flex items-center gap-2">
          {/* Toggle view */}
          {projectList && projectList.length > 0 && (
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Visualização em grade"
                aria-pressed={viewMode === "grid"}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label="Visualização em lista"
                aria-pressed={viewMode === "list"}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectList.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant="secondary">
                    {project.session_count} {project.session_count === 1 ? "sessão" : "sessões"}
                  </Badge>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div>
                    <span className="text-muted-foreground">Custo: </span>
                    <span className="font-medium tabular-nums">
                      {formatUSD(project.total_cost_usd)}
                    </span>
                  </div>
                  {project.last_activity && (
                    <span className="text-muted-foreground text-xs">
                      {formatDate(project.last_activity)}
                    </span>
                  )}
                </div>
                {project.sparkline?.length && (
                  <div className="h-10 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={project.sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
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
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
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
