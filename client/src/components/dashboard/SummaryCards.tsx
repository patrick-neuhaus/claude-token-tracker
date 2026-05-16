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
    <div className="kpis">
      <StatCard
        label="Custo Total"
        value={formatUSD(totalCostUsd)}
        sublabel={cacheSavingsUsd > 0 ? `Sem cache: ${formatUSD(withoutCache)}` : undefined}
      />
      <StatCard
        label="Total Tokens"
        value={formatTokens(totalTokens)}
      />
      <StatCard
        label="Entradas"
        value={Number(entryCount).toLocaleString("pt-BR")}
      />
      <StatCard
        label="Sessões"
        value={Number(sessionCount).toLocaleString("pt-BR")}
      />
      <StatCard
        label="Cache Hit Rate"
        value={`${cacheRate.toFixed(1)}%`}
        sublabel={cacheRate > 50 ? "Ótimo aproveitamento" : "Cache pode melhorar"}
      />
    </div>
  );
}
