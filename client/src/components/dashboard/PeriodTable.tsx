import { Section } from "@/components/shared/Section";
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
    <Section title="Resumo por Período" flush>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
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
              <TableCell className="text-right tabular-nums">{formatUSD(r.cost_usd)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(r.cost_usd, brlRate)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatTokens(r.tokens)}</TableCell>
              <TableCell className="text-right tabular-nums">{r.entries.toLocaleString("pt-BR")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}
