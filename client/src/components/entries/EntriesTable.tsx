import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatUSD, formatBRL, formatNumber } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";

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
}

interface Props {
  entries: Entry[];
}

export function EntriesTable({ entries }: Props) {
  const { user } = useAuth();
  const brlRate = Number(user?.brl_rate) || 5.5;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Fonte</TableHead>
          <TableHead>Modelo</TableHead>
          <TableHead className="text-right">Input</TableHead>
          <TableHead className="text-right">Output</TableHead>
          <TableHead className="text-right">
            <Tooltip>
              <TooltipTrigger className="cursor-help underline decoration-dotted">Cache R</TooltipTrigger>
              <TooltipContent>Tokens lidos do cache — não cobrados como input normal</TooltipContent>
            </Tooltip>
          </TableHead>
          <TableHead className="text-right">
            <Tooltip>
              <TooltipTrigger className="cursor-help underline decoration-dotted">Cache W</TooltipTrigger>
              <TooltipContent>Tokens escritos no cache — armazenados para requests futuros</TooltipContent>
            </Tooltip>
          </TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">USD</TableHead>
          <TableHead className="text-right">BRL</TableHead>
          <TableHead>Sessao</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-sm whitespace-nowrap">{formatDate(e.timestamp)}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">{e.source}</Badge>
            </TableCell>
            <TableCell className="text-sm">{e.model}</TableCell>
            <TableCell className="text-right text-sm">{formatNumber(e.input_tokens)}</TableCell>
            <TableCell className="text-right text-sm">{formatNumber(e.output_tokens)}</TableCell>
            <TableCell className="text-right text-sm">{formatNumber(e.cache_read)}</TableCell>
            <TableCell className="text-right text-sm">{formatNumber(e.cache_write)}</TableCell>
            <TableCell className="text-right text-sm">{formatNumber(e.total_tokens)}</TableCell>
            <TableCell className="text-right text-sm font-medium">{formatUSD(e.cost_usd)}</TableCell>
            <TableCell className="text-right text-sm">{formatBRL(e.cost_usd, brlRate)}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
              {e.session_name || (e.session_id ? `${e.session_id.slice(0, 8)}...` : "-")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
