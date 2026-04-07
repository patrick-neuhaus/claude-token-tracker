import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD, formatBRL } from "@/lib/formatters";
import { VALUE_COLORS } from "@/lib/constants";

interface Props {
  totalCostUsd: number;
  planCostUsd: number;
  brlRate: number;
}

export function PlanIndicator({ totalCostUsd, planCostUsd, brlRate }: Props) {
  const cost = Number(totalCostUsd) || 0;
  const plan = Number(planCostUsd) || 200;
  const pct = plan > 0 ? (cost / plan) * 100 : 0;
  const color = pct > 100 ? VALUE_COLORS.good : pct >= 50 ? VALUE_COLORS.medium : VALUE_COLORS.poor;

  const message =
    pct > 100
      ? `Voce esta extraindo ${formatUSD(cost - plan)} a mais do que paga pelo plano!`
      : pct >= 50
        ? `Voce esta aproveitando ${pct.toFixed(0)}% do valor do plano.`
        : `Subaproveitamento: apenas ${pct.toFixed(0)}% do plano utilizado.`;

  const barWidth = Math.min(pct, 100);

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Valor do Plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Uso API-equivalent</span>
          <span>
            {formatUSD(cost)} / {formatBRL(cost, brlRate)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Custo do plano</span>
          <span>
            {formatUSD(plan)} / {formatBRL(plan, brlRate)}
          </span>
        </div>
        <div className="relative">
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
          <span
            className="absolute right-0 -top-5 text-xs font-bold"
            style={{ color }}
          >
            {pct.toFixed(0)}%
          </span>
        </div>
        <p className="text-sm" style={{ color }}>
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
