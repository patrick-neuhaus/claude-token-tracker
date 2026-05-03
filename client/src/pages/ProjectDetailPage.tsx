import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useProjectDetail,
  useUpdateProject,
  useUnassignSession,
  useAssignSession,
  useUnassignedSessions,
} from "@/hooks/useProjects";
import {
  formatUSD,
  formatDate,
  formatTokens,
} from "@/lib/formatters";
import { surface } from "@/lib/surface";
import { Section } from "@/components/shared/Section";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { handleEnterSpaceKey } from "@/components/shared/ClickableRow";
import { Plus, DollarSign, Users, Cpu, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { DateRangeFilter, presetToRange } from "@/components/shared/DateRangeFilter";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProjectHeaderEditable } from "@/components/projects/ProjectHeaderEditable";
import { AddSessionDialog } from "@/components/projects/AddSessionDialog";
import { ModelPieChart } from "@/components/charts/ModelPieChart";
import { DailyCostAreaChart } from "@/components/charts/DailyCostAreaChart";

const PERIOD_PRESETS = [
  { value: "all", label: "Tudo" },
  { value: "30d", label: "30 dias" },
  { value: "7d", label: "7 dias" },
  { value: "today", label: "Hoje" },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ preset?: string; from?: string; to?: string }>({ preset: "all" });
  const { from, to } = dateRange;

  const { data: project, isLoading } = useProjectDetail(id, from, to);
  const updateProject = useUpdateProject();
  const unassignSession = useUnassignSession();
  const assignSession = useAssignSession();
  const { data: unassignedSessions } = useUnassignedSessions();

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  function saveName(name: string) {
    if (!id || !name) return;
    updateProject.mutate(
      { id, name },
      {
        onSuccess: () => toast.success("Nome atualizado"),
        onError: (err) => toast.error(err.message || "Erro ao atualizar"),
      }
    );
  }

  function saveDesc(description: string) {
    if (!id) return;
    updateProject.mutate(
      { id, description },
      {
        onSuccess: () => toast.success("Descrição atualizada"),
        onError: (err) => toast.error(err.message || "Erro ao atualizar"),
      }
    );
  }

  function handleUnassign(sessionId: string) {
    if (!id) return;
    unassignSession.mutate(
      { projectId: id, sessionId },
      {
        onSuccess: () => toast.success("Sessão removida do projeto"),
        onError: (err) => toast.error(err.message || "Erro ao remover sessão"),
      }
    );
  }

  function handleAssignSelected(sessionIds: string[]) {
    if (!id || sessionIds.length === 0) return;
    const promises = sessionIds.map((sessionId) =>
      assignSession.mutateAsync({ projectId: id, sessionId })
    );
    Promise.all(promises)
      .then(() => {
        toast.success(
          `${sessionIds.length} ${sessionIds.length === 1 ? "sessão adicionada" : "sessões adicionadas"} ao projeto`
        );
        setAddDialogOpen(false);
      })
      .catch((err) => {
        toast.error(err.message || "Erro ao adicionar sessões");
      });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-96" />
        <SkeletonGrid count={3} cols={3} />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-muted-foreground">Projeto nao encontrado.</p>;
  }

  const totalTokens =
    Number(project.total_input) + Number(project.total_output);

  return (
    <div className="space-y-6">
      {/* Header */}
      <ProjectHeaderEditable
        name={project.name}
        description={project.description}
        onSaveName={saveName}
        onSaveDescription={saveDesc}
      />

      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard icon={DollarSign} iconColor="text-success" label="Custo Total" value={formatUSD(project.total_cost_usd)} />
        <StatCard
          icon={Users}
          iconColor="text-info"
          label="Sessões"
          value={project.session_count}
          hint={<span className="text-xs text-muted-foreground">{project.session_count === 1 ? "sessão ativa" : "sessões ativas"}</span>}
        />
        <StatCard
          icon={Cpu}
          iconColor="text-chart-4"
          label="Tokens"
          value={formatTokens(totalTokens)}
          hint={<span className="text-xs text-muted-foreground">{formatTokens(project.total_input)} entrada / {formatTokens(project.total_output)} saída</span>}
        />
      </div>

      {/* Charts */}
      {(project.daily && project.daily.length > 0) || (project.by_model && project.by_model.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {project.daily && project.daily.length > 0 && (
            <div className={`${surface.section} lg:col-span-2 px-5 py-4`}>
              <h3 className="text-sm font-semibold tracking-tight mb-3">Custo diário</h3>
              <DailyCostAreaChart data={project.daily} />
            </div>
          )}
          {project.by_model && project.by_model.length > 0 && (
            <Section title="Por Modelo">
              <ModelPieChart data={project.by_model} />
            </Section>
          )}
        </div>
      ) : null}

      {/* Sessions Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">Sessões do Projeto</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeFilter
              value={dateRange}
              onChange={(range) => {
                const resolved = range.preset ? { ...range, ...presetToRange(range.preset) } : range;
                setDateRange(resolved);
              }}
              presets={PERIOD_PRESETS}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Sessão
            </Button>
          </div>
        </div>

        {!project.sessions || project.sessions.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            message="Nenhuma sessão neste projeto. Clique em 'Adicionar Sessão' pra começar a rastrear custos."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Abrir sessão ${session.custom_name || session.session_id.slice(0, 12)}`}
                    className="group cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    onKeyDown={handleEnterSpaceKey(() => navigate(`/sessions/${session.id}`))}
                  >
                    <TableCell className="font-medium">
                      {session.custom_name || session.session_id.slice(0, 12)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{session.source}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(session.last_seen)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {session.entry_count}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatUSD(session.total_cost_usd)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleUnassign(session.id)}
                        disabled={unassignSession.isPending}
                      >
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Sessions Dialog */}
      <AddSessionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        unassignedSessions={unassignedSessions}
        isPending={assignSession.isPending}
        onAssign={handleAssignSelected}
      />
    </div>
  );
}
