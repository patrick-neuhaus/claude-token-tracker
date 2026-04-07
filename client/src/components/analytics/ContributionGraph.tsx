import { format, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface DayData {
  day: string; // "2024-03-15"
  cost: number;
}

interface Props {
  data: DayData[];
  from?: string;
  to?: string;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DOW_LABELS = ["", "Seg", "", "Qua", "", "Sex", ""];

export function ContributionGraph({ data, from, to }: Props) {
  if (!data.length && !from && !to) return null;

  // Determina range
  const now = new Date();
  const dataMap: Record<string, number> = {};
  let maxCost = 0;
  for (const row of data) {
    const key = row.day.slice(0, 10);
    dataMap[key] = (dataMap[key] || 0) + row.cost;
    if (dataMap[key] > maxCost) maxCost = dataMap[key];
  }

  if (maxCost === 0) return null;

  // Calcula min/max dos dados reais para range do gráfico
  const allDays = Object.keys(dataMap).sort();
  if (!allDays.length) return null;

  const startDate = from ? new Date(from) : new Date(allDays[0]);
  const endDate = to ? new Date(to) : now;

  // Garante que startDate começa no domingo da semana
  const startSunday = startOfWeek(startDate, { weekStartsOn: 0 });
  const endSaturday = endOfWeek(endDate, { weekStartsOn: 0 });

  // Gera lista de semanas
  const weeks = eachWeekOfInterval({ start: startSunday, end: endSaturday }, { weekStartsOn: 0 });

  function getAlpha(cost: number) {
    if (cost === 0) return 0.06;
    return 0.15 + (cost / maxCost) * 0.85;
  }

  // Detecta onde mudam os meses para labels
  const monthLabelWeeks: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((weekStart, idx) => {
    const m = weekStart.getMonth();
    if (m !== lastMonth) {
      monthLabelWeeks.push({ idx, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Labels de mês */}
        <div className="flex mb-1 pl-8">
          {weeks.map((_, idx) => {
            const lbl = monthLabelWeeks.find((m) => m.idx === idx);
            return (
              <div key={idx} className="text-xs text-muted-foreground" style={{ width: 14, minWidth: 14 }}>
                {lbl ? lbl.label : ""}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0">
          {/* Labels de dia da semana */}
          <div className="flex flex-col gap-0.5 mr-1 pt-0.5">
            {DOW_LABELS.map((label, i) => (
              <div key={i} className="text-xs text-muted-foreground text-right" style={{ height: 13, lineHeight: "13px" }}>
                {label}
              </div>
            ))}
          </div>

          {/* Grid de quadrinhos */}
          {weeks.map((weekStart, weekIdx) => {
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + i);
              return d;
            });

            return (
              <div key={weekIdx} className="flex flex-col gap-0.5">
                {days.map((day, dayIdx) => {
                  const key = format(day, "yyyy-MM-dd");
                  const cost = dataMap[key] || 0;
                  const alpha = cost > 0 ? getAlpha(cost) : 0.06;
                  const isInRange = isWithinInterval(day, { start: startDate, end: endDate });

                  return (
                    <div
                      key={dayIdx}
                      title={cost > 0 ? `${key}: $${cost.toFixed(4)}` : key}
                      className="rounded-sm"
                      style={{
                        width: 13,
                        height: 13,
                        background: isInRange
                          ? `rgba(99,102,241,${alpha.toFixed(2)})`
                          : "transparent",
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-2 mt-2 pl-8">
          <span className="text-xs text-muted-foreground">Menos</span>
          {[0.06, 0.25, 0.45, 0.65, 1].map((o) => (
            <div key={o} className="rounded-sm" style={{ width: 12, height: 12, background: `rgba(99,102,241,${o})` }} />
          ))}
          <span className="text-xs text-muted-foreground">Mais</span>
          <span className="text-xs text-muted-foreground ml-2">· máx: ${maxCost.toFixed(2)}/dia</span>
        </div>
      </div>
    </div>
  );
}
