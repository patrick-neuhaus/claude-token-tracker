import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUSD, formatBRL, formatTokens } from "@/lib/formatters";

interface PeriodRow {
  label: string;
  cost_usd: number;
  tokens: number;
  entries: number;
}

interface Props {
  rows: PeriodRow[];
  brlRate: number;
}

export function PeriodTable({ rows, brlRate }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Resumo por Periodo</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead className="text-right">Custo USD</TableHead>
              <TableHead className="text-right">Custo BRL</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="font-medium">{r.label}</TableCell>
                <TableCell className="text-right">{formatUSD(r.cost_usd)}</TableCell>
                <TableCell className="text-right">{formatBRL(r.cost_usd, brlRate)}</TableCell>
                <TableCell className="text-right">{formatTokens(r.tokens)}</TableCell>
                <TableCell className="text-right">{r.entries.toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
