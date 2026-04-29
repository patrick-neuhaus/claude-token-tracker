import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { formatUSD } from "@/lib/formatters";
import { useState, useEffect } from "react";

interface Props {
  todayCostUsd: number;
  dailyBudgetUsd: number | null | undefined;
}

function todayKey() {
  const d = new Date();
  return `dismissed_budget_alert_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BudgetAlert({ todayCostUsd, dailyBudgetUsd }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(todayKey()) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Reset dismiss se a data mudou (abriu o app no dia seguinte)
    const check = setInterval(() => {
      try {
        setDismissed(localStorage.getItem(todayKey()) === "1");
      } catch {
        /* noop */
      }
    }, 60_000);
    return () => clearInterval(check);
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(todayKey(), "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  }

  if (!dailyBudgetUsd || dailyBudgetUsd <= 0 || dismissed) return null;

  const pct = (todayCostUsd / dailyBudgetUsd) * 100;

  if (pct < 80) return null;

  const exceeded = pct >= 100;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-5 py-4 ${
        exceeded
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-warning/50 bg-warning/10 text-warning"
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
      <button onClick={handleDismiss} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Dispensar alerta">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
