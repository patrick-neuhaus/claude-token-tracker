import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatUSD, formatNumber } from "@/lib/formatters";

interface Entry {
  id: string;
  timestamp: string;
  source: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  total_tokens: number;
  cost_usd: number;
  session_name: string | null;
  session_id: string | null;
  session_db_id?: string | null;
}

interface Props {
  entries: Entry[];
}

// Cols: timestamp | source | model | input | output | cacheR | cacheW | total | cost | session
const COLS = "150px 100px minmax(160px,1.4fr) 80px 80px 80px 80px 90px 90px minmax(140px,1.5fr)";

export function EntriesTable({ entries }: Props) {
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      {/* Header */}
      <div
        className="grid gap-3 px-5 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: COLS }}
      >
        <span>Data/Hora</span>
        <span>Fonte</span>
        <span>Modelo</span>
        <span className="text-right">Input</span>
        <span className="text-right">Output</span>
        <span className="text-right">
          <Tooltip>
            <TooltipTrigger className="cursor-help underline decoration-dotted">Cache R</TooltipTrigger>
            <TooltipContent>Tokens lidos do cache — não cobrados como input normal</TooltipContent>
          </Tooltip>
        </span>
        <span className="text-right">
          <Tooltip>
            <TooltipTrigger className="cursor-help underline decoration-dotted">Cache W</TooltipTrigger>
            <TooltipContent>Tokens escritos no cache — armazenados para requests futuros</TooltipContent>
          </Tooltip>
        </span>
        <span className="text-right">Total</span>
        <span className="text-right">Custo</span>
        <span>Sessão</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {entries.map((e) => (
          <div
            key={e.id}
            className="grid gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors items-center"
            style={{ gridTemplateColumns: COLS }}
          >
            <span className="text-sm tabular-nums whitespace-nowrap">{formatDate(e.timestamp)}</span>
            <Badge variant="outline" className="text-xs w-fit">{e.source}</Badge>
            <span className="text-sm truncate" title={e.model}>{e.model}</span>
            <span className="text-sm text-right tabular-nums">{formatNumber(e.input_tokens)}</span>
            <span className="text-sm text-right tabular-nums">{formatNumber(e.output_tokens)}</span>
            <span className="text-sm text-right tabular-nums">{formatNumber(e.cache_read)}</span>
            <span className="text-sm text-right tabular-nums">{formatNumber(e.cache_write)}</span>
            <span className="text-sm text-right tabular-nums">{formatNumber(e.total_tokens)}</span>
            <span className="text-sm text-right tabular-nums font-medium">{formatUSD(e.cost_usd)}</span>
            <span className="text-sm truncate min-w-0">
              {e.session_db_id ? (
                <Link
                  to={`/sessions/${e.session_db_id}`}
                  className="text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2"
                  title={e.session_name || e.session_id || ""}
                >
                  {e.session_name || (e.session_id ? `${e.session_id.slice(0, 8)}...` : "-")}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {e.session_name || (e.session_id ? `${e.session_id.slice(0, 8)}...` : "-")}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
