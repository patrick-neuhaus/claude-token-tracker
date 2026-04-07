import { format, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { MONTH_LABELS, DOW_LABELS_SPARSE, MS_PER_DAY } from "@/lib/constants";

interface DayData {
  day: string;
  cost: number;
}

interface Props {
  data: DayData[];
  from?: string;
  to?: string;
}

export function ContributionGraph({ data, from, to }: Props) {
  const now = new Date();
  const dataMap: Record<string, number> = {};
  let maxCost = 0;
  for (const row of data) {
    const key = row.day.slice(0, 10);
    dataMap[key] = (dataMap[key] || 0) + row.cost;
    if (dataMap[key] > maxCost) maxCost = dataMap[key];
  }

  // Sempre mostra pelo menos 90 dias — não esconde se poucos dados
  const startDate = from
    ? new Date(from)
    : new Date(now.getTime() - 90 * MS_PER_DAY);
  const endDate = to ? new Date(to) : now;

  const startSunday = startOfWeek(startDate, { weekStartsOn: 0 });
  const endSaturday = endOfWeek(endDate, { weekStartsOn: 0 });

  const weeks = eachWeekOfInterval({ start: startSunday, end: endSaturday }, { weekStartsOn: 0 });

  function getAlpha(cost: number) {
    if (cost === 0 || maxCost === 0) return 0.06;
    return 0.15 + (cost / maxCost) * 0.85;
  }

  // Labels de mês
  const monthLabelWeeks: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((weekStart, idx) => {
    const m = weekStart.getMonth();
    if (m !== lastMonth) {
      monthLabelWeeks.push({ idx, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  });

  // Contagem de dias ativos
  const activeDays = Object.keys(dataMap).filter((k) => dataMap[k] > 0).length;

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
            {DOW_LABELS_SPARSE.map((label, i) => (
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
                  const alpha = getAlpha(cost);
                  const inRange = day >= startDate && day <= endDate;

                  return (
                    <div
                      key={dayIdx}
                      title={cost > 0 ? `${key}: $${cost.toFixed(2)}` : key}
                      className="rounded-sm"
                      style={{
                        width: 13,
                        height: 13,
                        background: inRange
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
          {maxCost > 0 && (
            <span className="text-xs text-muted-foreground ml-2">· máx: ${maxCost.toFixed(2)}/dia</span>
          )}
          <span className="text-xs text-muted-foreground ml-2">· {activeDays} dias ativos</span>
        </div>
      </div>
    </div>
  );
}
