import { Sparkles } from "lucide-react";
import { formatUSD } from "@/lib/formatters";
import { normalizeModelFamily } from "@/lib/constants";
import { parseISO, format } from "date-fns";

interface Props {
  totalCostUsd: number;
  planCostUsd: number;
  entryCount: number;
  sessionCount: number;
  byModel: Array<{ model: string; cost_usd: number }>;
  bySource: Array<{ source: string; cost_usd: number }>;
  daily: Array<{ day: string; cost_usd: number }>;
}

export function MonthNarrative({
  totalCostUsd, planCostUsd, entryCount, sessionCount,
  byModel, bySource, daily,
}: Props) {
  const cost = Number(totalCostUsd) || 0;
  const plan = Number(planCostUsd) || 200;
  const pct = plan > 0 ? ((cost / plan) * 100).toFixed(0) : "0";

  // Dominant model
  const modelSorted = [...byModel].sort((a, b) => Number(b.cost_usd) - Number(a.cost_usd));
  const topModel = modelSorted[0];
  const topModelName = topModel ? normalizeModelFamily(topModel.model) : null;
  const topModelPct = topModel && cost > 0 ? ((Number(topModel.cost_usd) / cost) * 100).toFixed(0) : "0";

  // Dominant source
  const sourceSorted = [...bySource].sort((a, b) => Number(b.cost_usd) - Number(a.cost_usd));
  const topSource = sourceSorted[0];
  const topSourceLabel = topSource?.source === "claude-code" ? "Claude Code" : "claude.ai";
  const topSourcePct = topSource && cost > 0 ? ((Number(topSource.cost_usd) / cost) * 100).toFixed(0) : "0";

  // Busiest day
  const dailySorted = [...daily].sort((a, b) => Number(b.cost_usd) - Number(a.cost_usd));
  const busiestDay = dailySorted[0];
  const busiestDayLabel = busiestDay ? (() => { try { return format(parseISO(busiestDay.day), "dd/MM"); } catch { return busiestDay.day.slice(0, 10); } })() : null;

  // Build narrative
  const parts: string[] = [];

  if (cost > plan) {
    parts.push(`Você extraiu ${formatUSD(cost)} em valor API-equivalent este mes — ${pct}% do seu plano de ${formatUSD(plan)}.`);
  } else if (cost > 0) {
    parts.push(`Você está em ${formatUSD(cost)} este mes (${pct}% do plano de ${formatUSD(plan)}).`);
  }

  if (topModelName) {
    const capitalized = topModelName.charAt(0).toUpperCase() + topModelName.slice(1);
    parts.push(`${capitalized} é seu modelo principal (${topModelPct}% do custo).`);
  }

  if (topSource && bySource.length > 1) {
    parts.push(`${topSourceLabel} responde por ${topSourcePct}% do uso.`);
  }

  if (busiestDay && busiestDayLabel) {
    parts.push(`Dia mais intenso: ${busiestDayLabel} (${formatUSD(busiestDay.cost_usd)}).`);
  }

  parts.push(`${sessionCount} sessões e ${entryCount} chamadas no período.`);

  if (parts.length <= 1) return null;

  return (
    <div className="rounded-lg border border-info/30 bg-gradient-to-r from-info/10 via-chart-4/10 to-success/10 px-5 py-4 flex items-start gap-3">
      <Sparkles className="h-5 w-5 text-info mt-0.5 shrink-0" />
      <p className="text-sm leading-relaxed text-foreground/90">
        {parts.join(" ")}
      </p>
    </div>
  );
}
