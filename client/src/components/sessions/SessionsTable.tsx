import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Pill } from "@/components/shared/Pill";
import { ArrowRight } from "lucide-react";
import { SessionNameEditor } from "./SessionNameEditor";
import { formatDate, formatUSD } from "@/lib/formatters";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";

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
  /** Inline rename (id + new name). */
  onRename: (id: string, name: string) => void;
}

/**
 * SessionsTable — sessions list lifted to AppTable canonical (Wave 6.2).
 *
 * Boundary: pure presentational. Sort is server-controlled (parent owns
 * sortBy/sortDir state and server query). Click navigates via onRowClick.
 * SessionNameEditor and project Badge stop propagation locally to preserve
 * inline interactions.
 */
export function SessionsTable({ sessions, sortBy, sortDir, onSort, onRename }: Props) {
  const navigate = useNavigate();

  const columns: AppTableColumn<Session>[] = [
    {
      key: "custom_name",
      header: "Nome",
      width: "minmax(220px,2fr)",
      render: (_v, s) => (
        <div onClick={(e) => e.stopPropagation()} className="min-w-0">
          <SessionNameEditor
            currentName={s.custom_name}
            sessionId={s.session_id}
            onSave={(name) => onRename(s.id, name)}
            source={s.source}
            firstSeen={s.first_seen}
            entryCount={s.entry_count}
          />
        </div>
      ),
    },
    {
      key: "source",
      header: "Fonte",
      width: "100px",
      render: (_v, s) => <Pill variant="info">{s.source}</Pill>,
    },
    {
      key: "project_name",
      header: "Projeto",
      width: "minmax(140px,1.5fr)",
      render: (_v, s) => (
        <div onClick={(e) => e.stopPropagation()} className="min-w-0">
          {s.project_name && s.project_id ? (
            <Link to={`/projects/${s.project_id}`}>
              <Badge
                variant="secondary"
                className="text-xs hover:bg-secondary/80 transition-colors w-fit"
              >
                {s.project_name}
              </Badge>
            </Link>
          ) : s.project_name ? (
            <Badge variant="secondary" className="text-xs w-fit">
              {s.project_name}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "first_seen",
      header: "Primeira entrada",
      width: "150px",
      sortable: true,
      render: (v) => (
        <span className="text-sm text-muted-foreground tabular-nums">{formatDate(v)}</span>
      ),
    },
    {
      key: "last_seen",
      header: "Última atividade",
      width: "150px",
      sortable: true,
      render: (v) => (
        <span className="text-sm text-muted-foreground tabular-nums">{formatDate(v)}</span>
      ),
    },
    {
      key: "entry_count",
      header: "Entradas",
      width: "90px",
      align: "right",
      sortable: true,
      mono: true,
    },
    {
      key: "total_cost_usd",
      header: "Custo",
      width: "110px",
      align: "right",
      sortable: true,
      render: (v) => <span className="font-medium tabular-nums">{formatUSD(v)}</span>,
    },
    {
      key: "_arrow",
      header: "",
      width: "32px",
      render: () => (
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity justify-self-end" />
      ),
    },
  ];

  return (
    <AppTable<Session>
      columns={columns}
      data={sessions}
      rowKey="id"
      sortKey={sortBy}
      sortDir={sortDir ?? null}
      onSort={onSort}
      onRowClick={(row) => navigate(`/sessions/${row.id}`)}
    />
  );
}
