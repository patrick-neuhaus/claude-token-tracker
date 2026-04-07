import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Hash, FileText, MessageSquare, Zap } from "lucide-react";
import { formatUSD, formatBRL, formatTokens } from "@/lib/formatters";

interface Props {
  totalCostUsd: number;
  totalTokens: number;
  entryCount: number;
  sessionCount: number;
  brlRate: number;
  totalCacheRead?: number;
  totalInput?: number;
}

export function SummaryCards({
  totalCostUsd, totalTokens, entryCount, sessionCount, brlRate,
  totalCacheRead = 0, totalInput = 0,
}: Props) {
  const cacheRate = (Number(totalCacheRead) + Number(totalInput)) > 0
    ? (Number(totalCacheRead) / (Number(totalCacheRead) + Number(totalInput))) * 100
    : 0;

  const cards = [
    {
      label: "Custo Total",
      value: formatUSD(totalCostUsd),
      sub: formatBRL(totalCostUsd, brlRate),
      icon: DollarSign,
      color: "text-green-400",
    },
    { label: "Total Tokens", value: formatTokens(totalTokens), icon: Hash, color: "text-blue-400" },
    { label: "Entradas", value: Number(entryCount).toLocaleString("pt-BR"), icon: FileText, color: "text-purple-400" },
    { label: "Sessoes", value: Number(sessionCount).toLocaleString("pt-BR"), icon: MessageSquare, color: "text-amber-400" },
    {
      label: "Cache Hit Rate",
      value: `${cacheRate.toFixed(1)}%`,
      sub: cacheRate > 50 ? "Otimo aproveitamento" : "Cache pode melhorar",
      icon: Zap,
      color: cacheRate > 50 ? "text-green-400" : "text-yellow-400",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-lg bg-muted p-2 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold">{c.value}</p>
              {c.sub && <p className="text-xs text-muted-foreground truncate">{c.sub}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
