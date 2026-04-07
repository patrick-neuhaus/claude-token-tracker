import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { formatUSD } from "@/lib/formatters";
import { useState } from "react";

interface Props {
  todayCostUsd: number;
  dailyBudgetUsd: number | null | undefined;
}

export function BudgetAlert({ todayCostUsd, dailyBudgetUsd }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!dailyBudgetUsd || dailyBudgetUsd <= 0 || dismissed) return null;

  const pct = (todayCostUsd / dailyBudgetUsd) * 100;

  if (pct < 80) return null;

  const exceeded = pct >= 100;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${
        exceeded
          ? "border-red-500/50 bg-red-500/10 text-red-400"
          : "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
      }`}
    >
      {exceeded ? (
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p className="font-medium text-sm">
          {exceeded
            ? `Limite diário ultrapassado! ${formatUSD(todayCostUsd)} de ${formatUSD(dailyBudgetUsd)}`
            : `${pct.toFixed(0)}% do limite diário atingido — ${formatUSD(todayCostUsd)} de ${formatUSD(dailyBudgetUsd)}`}
        </p>
        {exceeded && (
          <p className="text-xs mt-0.5 opacity-80">
            Gasto de hoje excedeu em {formatUSD(todayCostUsd - dailyBudgetUsd)}
          </p>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
