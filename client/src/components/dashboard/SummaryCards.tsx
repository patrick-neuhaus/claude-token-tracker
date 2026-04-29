import { DollarSign, Hash, FileText, MessageSquare, Zap } from "lucide-react";
import { formatUSD, formatTokens } from "@/lib/formatters";
import { surface } from "@/lib/surface";

interface Props {
  totalCostUsd: number;
  totalTokens: number;
  entryCount: number;
  sessionCount: number;
  totalCacheRead?: number;
  totalInput?: number;
  cacheSavingsUsd?: number;
}

export function SummaryCards({
  totalCostUsd, totalTokens, entryCount, sessionCount,
  totalCacheRead = 0, totalInput = 0, cacheSavingsUsd = 0,
}: Props) {
  const cacheRate = (Number(totalCacheRead) + Number(totalInput)) > 0
    ? (Number(totalCacheRead) / (Number(totalCacheRead) + Number(totalInput))) * 100
    : 0;

  const withoutCache = totalCostUsd + cacheSavingsUsd;

  const cards = [
    {
      label: "Custo Total",
      value: formatUSD(totalCostUsd),
      sub: cacheSavingsUsd > 0 ? `Sem cache: ${formatUSD(withoutCache)}` : undefined,
      icon: DollarSign,
      color: "text-success",
    },
    { label: "Total Tokens", value: formatTokens(totalTokens), icon: Hash, color: "text-info" },
    { label: "Entradas", value: Number(entryCount).toLocaleString("pt-BR"), icon: FileText, color: "text-chart-4" },
    { label: "Sessões", value: Number(sessionCount).toLocaleString("pt-BR"), icon: MessageSquare, color: "text-warning" },
    {
      label: "Cache Hit Rate",
      value: `${cacheRate.toFixed(1)}%`,
      sub: cacheRate > 50 ? "Ótimo aproveitamento" : "Cache pode melhorar",
      icon: Zap,
      color: cacheRate > 50 ? "text-success" : "text-warning",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`${surface.primary} flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card/80`}
        >
          <div className={`rounded-md bg-muted p-2 ${c.color}`}>
            <c.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-lg font-semibold tabular-nums">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground truncate">{c.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
