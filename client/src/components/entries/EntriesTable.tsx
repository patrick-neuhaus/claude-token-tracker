import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Pill } from "@/components/shared/Pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";
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

function CacheTooltipHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="cursor-help underline decoration-dotted bg-transparent border-0 p-0 text-xs font-medium uppercase tracking-wider text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {label}
          </button>
        }
      />
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export function EntriesTable({ entries }: Props) {
  const columns: AppTableColumn<Entry>[] = [
    {
      key: "timestamp",
      header: "Data/Hora",
      width: "150px",
      render: (v) => <span className="tabular-nums whitespace-nowrap">{formatDate(v)}</span>,
    },
    {
      key: "source",
      header: "Fonte",
      width: "100px",
      render: (v) => <Pill variant="info">{v}</Pill>,
    },
    {
      key: "model",
      header: "Modelo",
      width: "minmax(160px,1.4fr)",
      render: (v) => <span className="truncate" title={v}>{v}</span>,
    },
    {
      key: "input_tokens",
      header: "Input",
      width: "80px",
      align: "right",
      mono: true,
      render: (v) => formatNumber(v),
    },
    {
      key: "output_tokens",
      header: "Output",
      width: "80px",
      align: "right",
      mono: true,
      render: (v) => formatNumber(v),
    },
    {
      key: "cache_read",
      header: <CacheTooltipHeader label="Cache R" hint="Tokens lidos do cache — não cobrados como input normal" />,
      width: "80px",
      align: "right",
      mono: true,
      render: (v) => formatNumber(v),
    },
    {
      key: "cache_write",
      header: <CacheTooltipHeader label="Cache W" hint="Tokens escritos no cache — armazenados para requests futuros" />,
      width: "80px",
      align: "right",
      mono: true,
      render: (v) => formatNumber(v),
    },
    {
      key: "total_tokens",
      header: "Total",
      width: "90px",
      align: "right",
      mono: true,
      render: (v) => formatNumber(v),
    },
    {
      key: "cost_usd",
      header: "Custo",
      width: "90px",
      align: "right",
      mono: true,
      render: (v) => <span className="font-medium">{formatUSD(v)}</span>,
    },
    {
      key: "session_name",
      header: "Sessão",
      width: "minmax(140px,1.5fr)",
      render: (_v, e) => (
        <span className="truncate min-w-0">
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
      ),
    },
  ];

  return <AppTable<Entry> columns={columns} data={entries} rowKey="id" />;
}
