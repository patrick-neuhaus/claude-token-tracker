import { format, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { MONTH_LABELS, DOW_LABELS_FULL, MS_PER_DAY } from "@/lib/constants";
import { formatShortDate } from "@/lib/formatters";

interface DayData {
  day: string;
  cost: number;
}

interface Props {
  data: DayData[];
  from?: string;
  to?: string;
}

const CELL = 24;
const GAP = 4;
const STEP = CELL + GAP;

export function ContributionGraph({ data, from, to }: Props) {
  const now = new Date();
  const dataMap: Record<string, number> = {};
  let maxCost = 0;
  for (const row of data) {
    const key = row.day.slice(0, 10);
    dataMap[key] = (dataMap[key] || 0) + row.cost;
    if (dataMap[key] > maxCost) maxCost = dataMap[key];
  }

  const startDate = from ? new Date(from) : new Date(now.getTime() - 90 * MS_PER_DAY);
  const endDate = to ? new Date(to) : now;

  const startSunday = startOfWeek(startDate, { weekStartsOn: 0 });
  const endSaturday = endOfWeek(endDate, { weekStartsOn: 0 });
  const weeks = eachWeekOfInterval({ start: startSunday, end: endSaturday }, { weekStartsOn: 0 });

  function getAlpha(cost: number) {
    if (cost === 0 || maxCost === 0) return 0.06;
    return 0.15 + (cost / maxCost) * 0.85;
  }

  // Labels de mês — posiciona acima da primeira semana de cada mês
  const monthLabels: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((weekStart, idx) => {
    const m = weekStart.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ idx, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  });

  const activeDays = Object.keys(dataMap).filter((k) => dataMap[k] > 0).length;
  const totalWidth = weeks.length * STEP;

  return (
    <div className="overflow-x-auto flex justify-center">
      <div style={{ minWidth: totalWidth + 40 }}>
        {/* Labels de mês */}
        <div className="flex mb-1" style={{ paddingLeft: 36 }}>
          {weeks.map((_, idx) => {
            const lbl = monthLabels.find((m) => m.idx === idx);
            return (
              <div key={idx} className="text-[11px] text-muted-foreground" style={{ width: STEP, minWidth: STEP }}>
                {lbl ? lbl.label : ""}
              </div>
            );
          })}
        </div>

        <div className="flex">
          {/* Labels de dia da semana — todos os 7 */}
          <div className="flex flex-col mr-1" style={{ gap: GAP, width: 32 }}>
            {DOW_LABELS_FULL.map((label, i) => (
              <div
                key={i}
                className="text-[11px] text-muted-foreground text-right pr-1"
                style={{ height: CELL, lineHeight: `${CELL}px` }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((weekStart, weekIdx) => {
              const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                return d;
              });

              return (
                <div key={weekIdx} className="flex flex-col" style={{ gap: GAP }}>
                  {days.map((day, dayIdx) => {
                    const key = format(day, "yyyy-MM-dd");
                    const cost = dataMap[key] || 0;
                    const alpha = getAlpha(cost);
                    const inRange = day >= startDate && day <= endDate;

                    return (
                      <div
                        key={dayIdx}
                        title={cost > 0 ? `${formatShortDate(key)}: $${cost.toFixed(2)}` : formatShortDate(key)}
                        className="rounded-sm"
                        style={{
                          width: CELL,
                          height: CELL,
                          background: inRange
                            ? `rgba(16,185,129,${alpha.toFixed(2)})`
                            : "rgba(16,185,129,0.03)",
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-2 mt-3" style={{ paddingLeft: 36 }}>
          <span className="text-[11px] text-muted-foreground">Menos</span>
          {[0.06, 0.25, 0.45, 0.65, 1].map((o) => (
            <div key={o} className="rounded-sm" style={{ width: 12, height: 12, background: `rgba(16,185,129,${o})` }} />
          ))}
          <span className="text-[11px] text-muted-foreground">Mais</span>
          {maxCost > 0 && (
            <span className="text-[11px] text-muted-foreground ml-2">· máx ${maxCost.toFixed(2)}/dia</span>
          )}
          <span className="text-[11px] text-muted-foreground ml-1">· {activeDays} dias ativos</span>
        </div>
      </div>
    </div>
  );
}
