import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { handleEnterSpaceKey } from "@/components/shared/ClickableRow";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Plus,
  DollarSign,
  Users,
  Cpu,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { DateRangeFilter, presetToRange } from "@/components/shared/DateRangeFilter";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { MODEL_COLORS, normalizeModelFamily } from "@/lib/constants";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import { formatShortDate } from "@/lib/formatters";

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

  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (project && !editingName) {
      setNameValue(project.name);
    }
  }, [project, editingName]);

  useEffect(() => {
    if (project && !editingDesc) {
      setDescValue(project.description || "");
    }
  }, [project, editingDesc]);

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
          `${selectedSessions.size} ${selectedSessions.size === 1 ? "sessão adicionada" : "sessões adicionadas"} ao projeto`
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
              <Button variant="ghost" size="icon" onClick={saveName} aria-label="Salvar nome">
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cancelar edição do nome"
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
              <h2 className="text-xl font-semibold tracking-tight">{project.name}</h2>
              <Pencil className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
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
              <Button variant="ghost" size="icon" onClick={saveDesc} aria-label="Salvar descrição">
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cancelar edição da descrição"
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
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={project.daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => `$${v.toFixed(0)}`} tick={{ fontSize: 11 }} width={56} />
                    <RechartsTooltip
                      formatter={(v) => formatUSD(Number(v))}
                      labelFormatter={(v) => formatShortDate(String(v))}
                      {...TOOLTIP_PROPS}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost_usd"
                      name="Custo"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          )}
          {project.by_model && project.by_model.length > 0 && (() => {
            const grouped = project.by_model.reduce<Record<string, number>>((acc: Record<string, number>, d: { model: string; cost_usd: number }) => {
              const family = normalizeModelFamily(d.model);
              acc[family] = (acc[family] || 0) + d.cost_usd;
              return acc;
            }, {});
            const modelPie = Object.entries(grouped)
              .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
              .sort((a, b) => b.value - a.value);
            const modelTotal = modelPie.reduce((s, d) => s + d.value, 0);
            return (
              <Section title="Por Modelo">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={modelPie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                        {modelPie.map((d) => (
                          <Cell key={d.name} fill={MODEL_COLORS[d.name.toLowerCase()] || MODEL_COLORS.outro} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => [
                          `${formatUSD(Number(value))} (${modelTotal > 0 ? ((Number(value) / modelTotal) * 100).toFixed(1) : 0}%)`,
                          "Custo",
                        ]}
                        {...TOOLTIP_PROPS}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
              </Section>
            );
          })()}
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
