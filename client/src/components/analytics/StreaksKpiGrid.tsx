import { Flame, Trophy, Clock, Zap } from "lucide-react";
import { formatUSD, formatFullDate } from "@/lib/formatters";
import { KpiBox } from "./KpiBox";
import type { AnalyticsData } from "@/lib/types";

interface Props {
  streaks: AnalyticsData["streaks"];
  hourly: AnalyticsData["hourly"];
  topSessions: AnalyticsData["top_sessions"];
}

/**
 * StreaksKpiGrid — 3 KpiBox cards (streak / most-expensive day / cost-per-hour
 * or top-session fallback). Extracted from AnalyticsPage:298-309.
 */
export function StreaksKpiGrid({ streaks, hourly, topSessions }: Props) {
  if (!streaks) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KpiBox
        icon={<Flame className="h-4 w-4 text-warning" />}
        label="Streak Atual"
        value={`${streaks.current_streak ?? 0}`}
        suffix="dias"
        hint={`Recorde: ${streaks.record_streak ?? 0} dias · ${streaks.active_days_total ?? 0} dias ativos total`}
      />
      <KpiBox
        icon={<Trophy className="h-4 w-4 text-warning" />}
        label="Dia mais Caro"
        value={formatUSD(streaks.most_expensive_day_cost ?? 0)}
        hint={streaks.most_expensive_day ? formatFullDate(streaks.most_expensive_day) : "—"}
      />
      {hourly && (
        <KpiBox
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="Custo/Hora Ativa"
          value={formatUSD(hourly.cost_per_active_hour)}
          suffix="/h"
          hint={`${hourly.active_hours} horas ativas · hoje: ${formatUSD(hourly.cost_today)}`}
        />
      )}
      {!hourly && (
        <KpiBox
          icon={<Zap className="h-4 w-4 text-info" />}
          label="Sessão Mais Cara"
          value={formatUSD(topSessions?.[0]?.total_cost_usd ?? 0)}
          hint={topSessions?.[0]?.custom_name || topSessions?.[0]?.session_id?.slice(0, 12) || "—"}
        />
      )}
    </div>
  );
}
