import { Target, Sparkles, TrendingUp } from "lucide-react";
import { formatUSD } from "@/lib/formatters";

interface Props {
  todayCostUsd: number;
  planCostUsd: number;
  /** Cycle days. Default 30 (mensal). */
  cycleDays?: number;
}

/**
 * DailyGoalBanner — R8d gamification.
 *
 * Meta diária = plan / cycleDays. Tracker é "extrair valor do plano fixo",
 * então BATER a meta = aproveitamento. Estados:
 *  - >= target * 1.5: 🚀 aproveitamento máximo
 *  - >= target: 🎯 bateu meta
 *  - 0 < cost < target: ⏳ faltam $X
 *  - cost == 0 OR plan <= 0: hidden
 */
export function DailyGoalBanner({ todayCostUsd, planCostUsd, cycleDays = 30 }: Props) {
  const cost = Number(todayCostUsd) || 0;
  const plan = Number(planCostUsd) || 0;
  if (plan <= 0 || cost <= 0) return null;

  const target = plan / cycleDays;
  if (target <= 0) return null;

  const ratio = cost / target;
  const remaining = Math.max(0, target - cost);
  const surplus = Math.max(0, cost - target);

  let icon: typeof Target = Target;
  let toneFg = "text-warning";
  let toneBorder = "border-warning/40";
  let toneBg = "bg-warning/10";
  let title = "";
  let subtitle = "";

  if (ratio >= 1.5) {
    icon = Sparkles;
    toneFg = "text-success";
    toneBorder = "border-success/40";
    toneBg = "bg-success/10";
    title = "Aproveitamento máximo hoje!";
    subtitle = `Hoje extraiu ${formatUSD(cost)} (${(ratio * 100).toFixed(0)}% da meta diária de ${formatUSD(target)})`;
  } else if (ratio >= 1) {
    icon = TrendingUp;
    toneFg = "text-success";
    toneBorder = "border-success/40";
    toneBg = "bg-success/10";
    title = "Bateu a meta diária 🎯";
    subtitle = `+${formatUSD(surplus)} acima da meta de ${formatUSD(target)}/dia`;
  } else {
    icon = Target;
    toneFg = "text-warning";
    toneBorder = "border-warning/40";
    toneBg = "bg-warning/10";
    title = "Falta pouco pra meta diária";
    subtitle = `${formatUSD(cost)} de ${formatUSD(target)} — falta ${formatUSD(remaining)}`;
  }

  const Icon = icon;
  const progressPct = Math.min(150, ratio * 100);
  const fillPct = Math.min(100, ratio * 100);
  const overPct = Math.max(0, Math.min(50, progressPct - 100));

  return (
    <div className={`rounded-md border ${toneBorder} ${toneBg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${toneFg}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${toneFg}`}>{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden relative">
            <div
              className={`h-full ${ratio >= 1 ? "bg-success" : "bg-warning"} transition-all duration-300`}
              style={{ width: `${fillPct}%` }}
            />
            {ratio > 1 && (
              <div
                className="absolute top-0 h-full bg-success/40"
                style={{ left: "100%", width: `${overPct}%`, transform: "translateX(-100%)" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
