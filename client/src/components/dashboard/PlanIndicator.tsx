import { formatUSD } from "@/lib/formatters";
import { VALUE_COLORS } from "@/lib/constants";
import { CalendarClock, CreditCard, Target } from "lucide-react";
import { surface, surfaceHeader, surfaceContent } from "@/lib/surface";

const DOW_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

interface Props {
  totalCostUsd: number;
  planCostUsd: number;
  weeklyResetDow?: number;
  weeklyResetHour?: number;
  planStartDate?: string | null;
}

function getCycleProgress(planStartDate: string | null | undefined, weeklyResetDow: number) {
  const now = new Date();
  if (planStartDate) {
    const start = new Date(planStartDate);
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), start.getDate());
    if (cycleStart.getTime() > now.getTime()) cycleStart.setMonth(cycleStart.getMonth() - 1);
    const elapsed = Math.max(1, Math.floor((now.getTime() - cycleStart.getTime()) / 86400000) + 1);
    return { cycleDays: 30, elapsed: Math.min(30, elapsed), cycleType: "mês" as const };
  }
  const dow = now.getDay();
  const elapsed = ((dow - weeklyResetDow + 7) % 7) + 1;
  return { cycleDays: 7, elapsed, cycleType: "semana" as const };
}

function getNextReset(dow: number, hour: number): { label: string; daysLeft: number } {
  // Calcula próximo reset em BRT (simplificado — usa local timezone)
  const now = new Date();
  const currentDow = now.getDay();
  let daysUntil = (dow - currentDow + 7) % 7;
  if (daysUntil === 0 && now.getHours() >= hour) daysUntil = 7;

  const resetDate = new Date(now);
  resetDate.setDate(resetDate.getDate() + daysUntil);
  resetDate.setHours(hour, 0, 0, 0);

  const dayName = DOW_NAMES[dow];
  return { label: `${dayName} ${hour}h`, daysLeft: daysUntil };
}

function getBillingInfo(planStartDate: string, planCostUsd: number) {
  const start = new Date(planStartDate);
  const now = new Date();
  const months = Math.max(1,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) +
    (now.getDate() >= start.getDate() ? 1 : 0)
  );
  const totalPaid = months * planCostUsd;
  const nextPayment = new Date(start);
  nextPayment.setMonth(nextPayment.getMonth() + months);
  const dayOfMonth = start.getDate();
  return { months, totalPaid, dayOfMonth, nextPayment };
}

export function PlanIndicator({ totalCostUsd, planCostUsd, weeklyResetDow = 2, weeklyResetHour = 15, planStartDate }: Props) {
  const cost = Number(totalCostUsd) || 0;
  const plan = Number(planCostUsd) || 200;
  const pct = plan > 0 ? (cost / plan) * 100 : 0;
  const color = pct > 100 ? VALUE_COLORS.good : pct >= 50 ? VALUE_COLORS.medium : VALUE_COLORS.poor;

  // Daily target (R8b) — meta cumulativa pro ciclo atual
  const cycle = getCycleProgress(planStartDate, weeklyResetDow);
  const dailyTarget = plan / cycle.cycleDays;
  const cumulativeTarget = dailyTarget * cycle.elapsed;
  const cumulativeTargetPct = plan > 0 ? Math.min(100, (cumulativeTarget / plan) * 100) : 0;
  const targetDelta = cost - cumulativeTarget;
  const onPaceForTarget = cost <= cumulativeTarget;

  const message =
    pct > 100
      ? `Você está extraindo ${formatUSD(cost - plan)} a mais do que paga pelo plano!`
      : pct >= 50
        ? `Você está aproveitando ${pct.toFixed(0)}% do valor do plano.`
        : `Subaproveitamento: apenas ${pct.toFixed(0)}% do plano utilizado.`;

  const barWidth = Math.min(pct, 100);
  const resetInfo = getNextReset(weeklyResetDow, weeklyResetHour);
  const billing = planStartDate ? getBillingInfo(planStartDate, plan) : null;

  return (
    <div className={surface.section}>
      <div className={surfaceHeader}>
        <h3 className="text-sm font-medium">Valor do Plano</h3>
      </div>
      <div className={`${surfaceContent} space-y-3`}>
        <div className="flex justify-between text-sm gap-4">
          <span className="text-muted-foreground shrink-0">Uso API-equivalent</span>
          <span className="text-right tabular-nums font-medium">
            {formatUSD(cost)}
          </span>
        </div>
        <div className="flex justify-between text-sm gap-4">
          <span className="text-muted-foreground shrink-0">Custo do plano</span>
          <span className="text-right tabular-nums">
            {formatUSD(plan)}
          </span>
        </div>

        {/* Barra de progresso com marker de meta cumulativa (R8b) */}
        <div className="pt-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">Aproveitamento</span>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${barWidth}%`,
                backgroundColor: color,
                boxShadow: pct > 100 ? `0 0 12px ${color}80` : undefined,
              }}
            />
            {/* Daily target cumulative marker */}
            {plan > 0 && cumulativeTargetPct > 0 && cumulativeTargetPct < 100 && (
              <div
                className="absolute top-[-2px] bottom-[-2px] w-px bg-foreground"
                style={{ left: `${cumulativeTargetPct}%`, opacity: 0.7 }}
                title={`Meta cumulativa: ${formatUSD(cumulativeTarget)}`}
              />
            )}
          </div>
        </div>

        <p className="text-sm" style={{ color }}>
          {message}
        </p>

        {/* Daily target tracking (R8b) */}
        <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 text-xs space-y-0.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Meta diária</span>
              <span className="font-mono tabular-nums">{formatUSD(dailyTarget)} / dia</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                Acumulado · dia {cycle.elapsed} de {cycle.cycleDays}
              </span>
              <span className="font-mono tabular-nums">{formatUSD(cumulativeTarget)}</span>
            </div>
            <div className={`flex justify-between gap-2 font-medium ${onPaceForTarget ? "text-success" : "text-destructive"}`}>
              <span>{onPaceForTarget ? "↓ Abaixo da meta" : "↑ Acima da meta"}</span>
              <span className="font-mono tabular-nums">
                {onPaceForTarget ? "−" : "+"}{formatUSD(Math.abs(targetDelta))}
              </span>
            </div>
          </div>
        </div>

        {/* Info de reset semanal e billing */}
        <div className="border-t pt-3 mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Reset semanal
            </span>
            <span className="tabular-nums">
              Toda {resetInfo.label}{" "}
              <span className="text-muted-foreground">
                ({resetInfo.daysLeft === 0 ? "hoje" : resetInfo.daysLeft === 1 ? "amanhã" : `em ${resetInfo.daysLeft} dias`})
              </span>
            </span>
          </div>

          {billing && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Pagamento mensal
              </span>
              <span className="tabular-nums">
                Todo dia {billing.dayOfMonth}{" "}
                <span className="text-muted-foreground">
                  · {billing.months} {billing.months === 1 ? "mês pago" : "meses pagos"} ({formatUSD(billing.totalPaid)})
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
