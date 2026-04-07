import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProjectDetail,
  useUpdateProject,
  useUnassignSession,
  useAssignSession,
  useUnassignedSessions,
} from "@/hooks/useProjects";
import {
  formatUSD,
  formatBRL,
  formatDate,
  formatTokens,
} from "@/lib/formatters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Plus,
  DollarSign,
  Users,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { DateRangeFilter, presetToRange } from "@/components/shared/DateRangeFilter";

const PERIOD_PRESETS = [
  { value: "all", label: "Tudo" },
  { value: "30d", label: "30 dias" },
  { value: "7d", label: "7 dias" },
  { value: "today", label: "Hoje" },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const brlRate = Number(user?.brl_rate) || 5.5;
  const [dateRange, setDateRange] = useState<{ preset?: string; from?: string; to?: string }>({ preset: "all" });
  const { from, to } = dateRange;

  const { data: project, isLoading } = useProjectDetail(id, from, to);
  const updateProject = useUpdateProject();
  const unassignSession = useUnassignSession();
  const assignSession = useAssignSession();
  const { data: unassignedSessions } = useUnassignedSessions();

  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (project) {
      setNameValue(project.name);
      setDescValue(project.description || "");
    }
  }, [project]);

  function saveName() {
    if (!id || !nameValue.trim()) return;
    updateProject.mutate(
      { id, name: nameValue.trim() },
      {
        onSuccess: () => {
          toast.success("Nome atualizado");
          setEditingName(false);
        },
        onError: (err) => toast.error(err.message || "Erro ao atualizar"),
      }
    );
  }

  function saveDesc() {
    if (!id) return;
    updateProject.mutate(
      { id, description: descValue.trim() },
      {
        onSuccess: () => {
          toast.success("Descrição atualizada");
          setEditingDesc(false);
        },
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

  function handleAssignSelected() {
    if (!id || selectedSessions.size === 0) return;
    const promises = Array.from(selectedSessions).map((sessionId) =>
      assignSession.mutateAsync({ projectId: id, sessionId })
    );
    Promise.all(promises)
      .then(() => {
        toast.success(
          `${selectedSessions.size} sessão(ões) adicionada(s) ao projeto`
        );
        setAddDialogOpen(false);
        setSelectedSessions(new Set());
      })
      .catch((err) => {
        toast.error(err.message || "Erro ao adicionar sessões");
      });
  }

  function toggleSession(sessionId: string) {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  if (!project) {
    return <p className="text-muted-foreground">Projeto nao encontrado.</p>;
  }

  const totalTokens =
    Number(project.total_input) + Number(project.total_output);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setNameValue(project.name);
                    setEditingName(false);
                  }
                }}
                className="text-2xl font-bold h-auto py-1"
                autoFocus
              />
              <Button variant="ghost" size="icon" onClick={saveName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setNameValue(project.name);
                  setEditingName(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group cursor-pointer"
              onClick={() => setEditingName(true)}
            >
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {editingDesc ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveDesc();
                  if (e.key === "Escape") {
                    setDescValue(project.description || "");
                    setEditingDesc(false);
                  }
                }}
                placeholder="Adicionar descrição..."
                className="text-sm h-auto py-1"
                autoFocus
              />
              <Button variant="ghost" size="icon" onClick={saveDesc}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDescValue(project.description || "");
                  setEditingDesc(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p
              className="text-sm text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setEditingDesc(true)}
            >
              {project.description || "Clique para adicionar descrição..."}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUSD(project.total_cost_usd)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBRL(project.total_cost_usd, brlRate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessões
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.session_count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              sessão{project.session_count !== 1 ? "ões" : ""} ativa
              {project.session_count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(totalTokens)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTokens(project.total_input)} entrada /{" "}
              {formatTokens(project.total_output)} saída
            </p>
          </CardContent>
        </Card>
      </div>

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
              onClick={() => {
                setSelectedSessions(new Set());
                setAddDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Sessão
            </Button>
          </div>
        </div>

        {!project.sessions || project.sessions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">
              Nenhuma sessão neste projeto
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione sessões para ver custos
            </p>
          </div>
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
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.custom_name || session.session_id.slice(0, 12)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{session.source}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(session.last_seen)}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.entry_count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatUSD(session.total_cost_usd)}
                    </TableCell>
                    <TableCell>
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
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Sessões</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 py-2">
            {!unassignedSessions || unassignedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma sessão disponível para adicionar
              </p>
            ) : (
              unassignedSessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedSessions.has(s.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => toggleSession(s.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {s.custom_name || s.session_id.slice(0, 16)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.source} &middot; {s.entry_count} entradas &middot;{" "}
                      {formatUSD(s.total_cost_usd)}
                    </p>
                  </div>
                  <div
                    className={`ml-3 h-5 w-5 rounded border flex items-center justify-center ${
                      selectedSessions.has(s.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {selectedSessions.has(s.id) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssignSelected}
              disabled={
                selectedSessions.size === 0 || assignSession.isPending
              }
            >
              {assignSession.isPending
                ? "Adicionando..."
                : `Adicionar (${selectedSessions.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
