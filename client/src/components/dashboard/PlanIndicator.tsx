import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD, formatBRL } from "@/lib/formatters";
import { VALUE_COLORS } from "@/lib/constants";
import { CalendarClock, CreditCard } from "lucide-react";

const DOW_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

interface Props {
  totalCostUsd: number;
  planCostUsd: number;
  brlRate: number;
  weeklyResetDow?: number;
  weeklyResetHour?: number;
  planStartDate?: string | null;
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

export function PlanIndicator({ totalCostUsd, planCostUsd, brlRate, weeklyResetDow = 2, weeklyResetHour = 15, planStartDate }: Props) {
  const cost = Number(totalCostUsd) || 0;
  const plan = Number(planCostUsd) || 200;
  const pct = plan > 0 ? (cost / plan) * 100 : 0;
  const color = pct > 100 ? VALUE_COLORS.good : pct >= 50 ? VALUE_COLORS.medium : VALUE_COLORS.poor;

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
    <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Valor do Plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm gap-4">
          <span className="text-muted-foreground shrink-0">Uso API-equivalent</span>
          <span className="text-right tabular-nums font-medium">
            {formatUSD(cost)}{" "}
            <span className="text-muted-foreground font-normal">/ {formatBRL(cost, brlRate)}</span>
          </span>
        </div>
        <div className="flex justify-between text-sm gap-4">
          <span className="text-muted-foreground shrink-0">Custo do plano</span>
          <span className="text-right tabular-nums">
            {formatUSD(plan)}{" "}
            <span className="text-muted-foreground">/ {formatBRL(plan, brlRate)}</span>
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="pt-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">Aproveitamento</span>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${barWidth}%`,
                backgroundColor: color,
                boxShadow: pct > 100 ? `0 0 12px ${color}80` : undefined,
              }}
            />
          </div>
        </div>

        <p className="text-sm" style={{ color }}>
          {message}
        </p>

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
      </CardContent>
    </Card>
  );
}
