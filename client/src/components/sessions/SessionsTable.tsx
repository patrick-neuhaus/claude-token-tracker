import { useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { SessionNameEditor } from "./SessionNameEditor";
import { useRenameSession } from "@/hooks/useSessions";
import { formatDate, formatUSD } from "@/lib/formatters";
import { toast } from "sonner";
import { SortableTableHeader } from "@/components/shared/SortableTableHeader";

interface Session {
  id: string;
  session_id: string;
  custom_name: string | null;
  source: string;
  first_seen: string;
  last_seen: string;
  total_cost_usd: number;
  total_input: number;
  total_output: number;
  entry_count: number;
  project_id?: string | null;
  project_name?: string | null;
}

interface Props {
  sessions: Session[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (col: string) => void;
}

// Grid columns: name | source | project | first | last | entries | cost | arrow
const COLS = "minmax(220px,2fr) 100px minmax(140px,1.5fr) 150px 150px 90px 110px 32px";

export function SessionsTable({ sessions, sortBy, sortDir, onSort }: Props) {
  const navigate = useNavigate();
  const rename = useRenameSession();

  function handleRename(id: string, name: string) {
    rename.mutate(
      { id, custom_name: name },
      {
        onSuccess: () => toast.success("Nome atualizado"),
        onError: () => toast.error("Erro ao renomear sessão"),
      },
    );
  }

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      {/* Header */}
      <div
        className="grid gap-3 px-5 py-3 border-b border-border bg-muted/30"
        style={{ gridTemplateColumns: COLS }}
      >
        <span className="text-xs font-medium text-muted-foreground">Nome</span>
        <span className="text-xs font-medium text-muted-foreground">Fonte</span>
        <span className="text-xs font-medium text-muted-foreground">Projeto</span>
        <SortableTableHeader col="first_seen" label="Primeira entrada" sortBy={sortBy} sortDir={sortDir} onSort={(c) => onSort?.(c)} />
        <SortableTableHeader col="last_seen" label="Última atividade" sortBy={sortBy} sortDir={sortDir} onSort={(c) => onSort?.(c)} />
        <SortableTableHeader col="entry_count" label="Entradas" sortBy={sortBy} sortDir={sortDir} onSort={(c) => onSort?.(c)} align="right" />
        <SortableTableHeader col="total_cost_usd" label="Custo" sortBy={sortBy} sortDir={sortDir} onSort={(c) => onSort?.(c)} align="right" />
        <span></span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="grid gap-3 px-5 py-3 cursor-pointer hover:bg-muted/40 transition-colors group items-center"
            style={{ gridTemplateColumns: COLS }}
            onClick={() => navigate(`/sessions/${s.id}`)}
          >
            <div onClick={(e) => e.stopPropagation()} className="min-w-0">
              <SessionNameEditor
                currentName={s.custom_name}
                sessionId={s.session_id}
                onSave={(name) => handleRename(s.id, name)}
                source={s.source}
                firstSeen={s.first_seen}
                entryCount={s.entry_count}
              />
            </div>
            <Badge variant="outline" className="text-xs w-fit">{s.source}</Badge>
            <div onClick={(e) => e.stopPropagation()} className="min-w-0">
              {s.project_name && s.project_id ? (
                <Link to={`/projects/${s.project_id}`}>
                  <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors w-fit">{s.project_name}</Badge>
                </Link>
              ) : s.project_name ? (
                <Badge variant="secondary" className="text-xs w-fit">{s.project_name}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">{formatDate(s.first_seen)}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{formatDate(s.last_seen)}</span>
            <span className="text-sm text-right tabular-nums">{s.entry_count}</span>
            <span className="text-sm text-right tabular-nums font-medium">{formatUSD(s.total_cost_usd)}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}
