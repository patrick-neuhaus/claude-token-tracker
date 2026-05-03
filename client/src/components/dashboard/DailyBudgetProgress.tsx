import { formatUSD } from "@/lib/formatters";

interface Props {
  todayCostUsd: number;
  dailyBudgetUsd: number | null | undefined;
}

/**
 * DailyBudgetProgress — mini-bar inline pra dashboard. Sempre visível quando
 * `dailyBudgetUsd` está setado. BudgetAlert continua mas só dispara ≥80%.
 * Resolve UX F-05 / C6 (presença persistente, sem precisar abrir alerta).
 */
export function DailyBudgetProgress({ todayCostUsd, dailyBudgetUsd }: Props) {
  if (!dailyBudgetUsd || dailyBudgetUsd <= 0) return null;

  const cost = Math.max(0, Number(todayCostUsd) || 0);
  const budget = Number(dailyBudgetUsd);
  const pct = (cost / budget) * 100;
  const clamped = Math.min(100, pct);

  let toneFg = "text-success";
  let toneBg = "bg-success";
  let toneBorder = "border-success/30";
  if (pct >= 100) {
    toneFg = "text-destructive";
    toneBg = "bg-destructive";
    toneBorder = "border-destructive/40";
  } else if (pct >= 80) {
    toneFg = "text-warning";
    toneBg = "bg-warning";
    toneBorder = "border-warning/40";
  }

  return (
    <div
      className={`rounded-md border ${toneBorder} bg-card px-4 py-2.5`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={`Limite diário: ${pct.toFixed(0)}% usado (${formatUSD(cost)} de ${formatUSD(budget)})`}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Limite diário</span>
        <span className={`tabular-nums font-medium ${toneFg}`}>
          {formatUSD(cost)} / {formatUSD(budget)} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${toneBg} transition-all duration-300`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
