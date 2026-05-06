import { DollarSign, Hash, FileText, MessageSquare, Zap } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { formatUSD, formatTokens } from "@/lib/formatters";

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
  totalCostUsd,
  totalTokens,
  entryCount,
  sessionCount,
  totalCacheRead = 0,
  totalInput = 0,
  cacheSavingsUsd = 0,
}: Props) {
  const cacheRate =
    Number(totalCacheRead) + Number(totalInput) > 0
      ? (Number(totalCacheRead) / (Number(totalCacheRead) + Number(totalInput))) * 100
      : 0;

  const withoutCache = totalCostUsd + cacheSavingsUsd;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        icon={DollarSign}
        label="Custo Total"
        value={formatUSD(totalCostUsd)}
        sublabel={cacheSavingsUsd > 0 ? `Sem cache: ${formatUSD(withoutCache)}` : undefined}
        iconColor="text-success-display"
      />
      <StatCard
        icon={Hash}
        label="Total Tokens"
        value={formatTokens(totalTokens)}
        iconColor="text-info-display"
      />
      <StatCard
        icon={FileText}
        label="Entradas"
        value={Number(entryCount).toLocaleString("pt-BR")}
        iconColor="text-chart-4"
      />
      <StatCard
        icon={MessageSquare}
        label="Sessões"
        value={Number(sessionCount).toLocaleString("pt-BR")}
        iconColor="text-warning"
      />
      <StatCard
        icon={Zap}
        label="Cache Hit Rate"
        value={`${cacheRate.toFixed(1)}%`}
        sublabel={cacheRate > 50 ? "Ótimo aproveitamento" : "Cache pode melhorar"}
        iconColor={cacheRate > 50 ? "text-success-display" : "text-warning"}
      />
    </div>
  );
}
