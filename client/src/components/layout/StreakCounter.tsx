import { useEffect, useRef, useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { AnalyticsData } from "@/lib/types";

interface Props {
  collapsed: boolean;
}

/**
 * StreakCounter — Wave 6.7b. Lê `streaks.current_streak` do `/analytics`
 * endpoint (já existente, sem novo backend signal).
 *
 * Posicionamento: Sidebar footer acima do PlanCountdown. Esconde quando
 * `collapsed` (consistência com PlanCountdown). Tooltip mostra recorde
 * pessoal. Bump motion quando current_streak aumenta vs render anterior.
 *
 * StreakLostScreen: pendência separada (precisa backend signal
 * `streak.lost_pending` que não existe). Esta component só celebra streak
 * ativo — sem tela de "perdeu".
 */
export function StreakCounter({ collapsed }: Props) {
  const { data } = useAnalytics({});
  const analytics = data as AnalyticsData | undefined;
  const current = Number(analytics?.streaks?.current_streak ?? 0);
  const record = Number(analytics?.streaks?.record_streak ?? 0);

  const prev = useRef(current);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    const previous = prev.current;
    prev.current = current;
    if (current > previous && current > 0) {
      setBump(true);
      const id = setTimeout(() => setBump(false), 600);
      return () => clearTimeout(id);
    }
  }, [current]);

  if (collapsed) return null;
  if (current === 0) return null;

  const label = current === 1 ? "1 dia" : `${current} dias`;
  const tooltip = record > current
    ? `Recorde pessoal: ${record} dias`
    : "Tu tá no recorde — mantém aí";

  return (
    <div
      role="status"
      aria-label={`Streak atual: ${label}. ${tooltip}`}
      title={tooltip}
      className="rounded-md px-3 py-2 text-center text-xs font-medium"
      style={{
        marginBottom: 8,
        background: "hsl(var(--warning) / 0.15)",
        color: "hsl(var(--warning-text))",
        border: "1px solid hsl(var(--warning) / 0.3)",
      }}
    >
      <div
        className="flex items-center justify-center gap-1.5"
        style={{
          transform: bump ? "scale(1.15)" : "scale(1)",
          transition: "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <span aria-hidden="true">🔥</span>
        <span className="tabular-nums font-semibold">{label}</span>
        <span className="text-[10px] uppercase tracking-wide opacity-70">streak</span>
      </div>
    </div>
  );
}
