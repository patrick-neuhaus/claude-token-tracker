import { Fragment, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SessionNameEditor } from "./SessionNameEditor";
import { useSessionEntries, useRenameSession } from "@/hooks/useSessions";
import { formatDate, formatUSD, formatBRL, formatTokens } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  project_name?: string | null;
}

interface Props {
  sessions: Session[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (col: string) => void;
}

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy?: string; sortDir?: "asc" | "desc" }) {
  if (sortBy !== col) return <ArrowUpDown className="inline ml-1 h-3.5 w-3.5 opacity-40" />;
  if (sortDir === "asc") return <ArrowUp className="inline ml-1 h-3.5 w-3.5" />;
  return <ArrowDown className="inline ml-1 h-3.5 w-3.5" />;
}

export function SessionsTable({ sessions, sortBy, sortDir, onSort }: Props) {
  const { user } = useAuth();
  const brlRate = Number(user?.brl_rate) || 5.5;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rename = useRenameSession();
  const { data: entries } = useSessionEntries(expandedId);

  function sortableHead(col: string, label: string, className?: string) {
    return (
      <TableHead className={`cursor-pointer select-none hover:text-foreground ${className ?? ""}`} onClick={() => onSort?.(col)}>
        {label}<SortIcon col={col} sortBy={sortBy} sortDir={sortDir} />
      </TableHead>
    );
  }

  function handleRename(id: string, name: string) {
    rename.mutate(
      { id, custom_name: name },
      {
        onSuccess: () => toast.success("Nome atualizado"),
        onError: () => toast.error("Erro ao renomear sessao"),
      },
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Fonte</TableHead>
          <TableHead>Projeto</TableHead>
          {sortableHead("first_seen", "Primeira")}
          {sortableHead("last_seen", "Última")}
          {sortableHead("entry_count", "Entradas", "text-right")}
          {sortableHead("total_cost_usd", "Custo USD", "text-right")}
          <TableHead className="text-right">Custo BRL</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <Fragment key={s.id}>
            <TableRow
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            >
              <TableCell className="w-8 px-2">
                {expandedId === s.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <SessionNameEditor
                  currentName={s.custom_name}
                  sessionId={s.session_id}
                  onSave={(name) => handleRename(s.id, name)}
                  source={s.source}
                  firstSeen={s.first_seen}
                  entryCount={s.entry_count}
                />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{s.source}</Badge>
              </TableCell>
              <TableCell>
                {s.project_name ? (
                  <Badge variant="secondary" className="text-xs">{s.project_name}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{formatDate(s.first_seen)}</TableCell>
              <TableCell className="text-sm">{formatDate(s.last_seen)}</TableCell>
              <TableCell className="text-right">{s.entry_count}</TableCell>
              <TableCell className="text-right">{formatUSD(s.total_cost_usd)}</TableCell>
              <TableCell className="text-right">{formatBRL(s.total_cost_usd, brlRate)}</TableCell>
            </TableRow>
            {expandedId === s.id && entries && (
              <TableRow>
                <TableCell colSpan={9} className="bg-muted/30 p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Horario</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead className="text-right">Input</TableHead>
                        <TableHead className="text-right">Output</TableHead>
                        <TableHead className="text-right">Cache</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{formatDate(e.timestamp)}</TableCell>
                          <TableCell>{e.model}</TableCell>
                          <TableCell className="text-right">{formatTokens(e.input_tokens)}</TableCell>
                          <TableCell className="text-right">{formatTokens(e.output_tokens)}</TableCell>
                          <TableCell className="text-right">{formatTokens(Number(e.cache_read) + Number(e.cache_write))}</TableCell>
                          <TableCell className="text-right">{formatUSD(e.cost_usd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
