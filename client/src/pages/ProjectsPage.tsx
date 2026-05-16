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
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonRows } from "@/components/shared/SkeletonGrid";
import { ViewModeToggle } from "@/components/shared/ViewModeToggle";
import { ClickableRow } from "@/components/shared/ClickableRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppTable } from "@/components/data/AppTable";

interface ProjectListRow {
  id: string;
  name: string;
  description?: string | null;
  session_count: number;
  total_cost_usd: number;
  last_activity?: string | null;
  sparkline?: { cost: number }[];
}

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
        <div className="rounded-xl border border-border overflow-hidden">
          <SkeletonRows count={6} className="space-y-0" />
        </div>
      </div>
    );
  }

  const projectList = projects;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        crumb="tracker · projetos"
        subtitle={
          projectList && projectList.length > 0
            ? `${projectList.length} projetos · ${formatUSD(projectList.reduce((acc, p) => acc + Number(p.total_cost_usd || 0), 0))} no total`
            : undefined
        }
        actions={
          <>
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
          </>
        }
      />

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
              className={`group ${surface.section} px-5 py-4`}
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
            </ClickableRow>
          ))}
        </div>
      ) : (
        /* List view — compacta para 30+ projetos */
        <AppTable<ProjectListRow>
          rowKey="id"
          data={projectList.slice().sort((a, b) => b.total_cost_usd - a.total_cost_usd)}
          onRowClick={(p) => navigate(`/projects/${p.id}`)}
          columns={[
            {
              key: "name",
              header: "Projeto",
              width: "minmax(220px,2.5fr)",
              render: (_v, p) => (
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  {p.description && (
                    <div className="text-xs text-muted-foreground truncate">{p.description}</div>
                  )}
                </div>
              ),
            },
            {
              key: "session_count",
              header: "Sessões",
              width: "100px",
              align: "right",
              mono: true,
              render: (v) => v,
            },
            {
              key: "total_cost_usd",
              header: "Custo",
              width: "110px",
              align: "right",
              mono: true,
              render: (v) => <span className="font-medium">{formatUSD(v)}</span>,
            },
            {
              key: "last_activity",
              header: "Última atividade",
              width: "150px",
              align: "right",
              mono: true,
              render: (v) => <span className="text-muted-foreground text-xs">{v ? formatDate(v) : "—"}</span>,
            },
          ]}
        />
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
