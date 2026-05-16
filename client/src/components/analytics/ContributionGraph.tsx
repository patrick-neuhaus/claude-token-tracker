import { useState } from "react";
import { format, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { X } from "lucide-react";
import { MONTH_LABELS, DOW_LABELS_FULL, MS_PER_DAY } from "@/lib/constants";
import { formatShortDate, formatUSD } from "@/lib/formatters";

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
  const [selected, setSelected] = useState<string | null>(null);
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

  function toggleDay(key: string) {
    setSelected((prev) => (prev === key ? null : key));
  }

  const selectedCost = selected ? dataMap[selected] || 0 : 0;
  const selectedDate = selected ? new Date(selected + "T00:00:00") : null;
  const selectedDow = selectedDate ? DOW_LABELS_FULL[selectedDate.getDay()] : null;

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
                    const isSelected = selected === key;

                    return (
                      <button
                        type="button"
                        key={dayIdx}
                        onClick={() => toggleDay(key)}
                        title={cost > 0 ? `${formatShortDate(key)}: $${cost.toFixed(2)}` : formatShortDate(key)}
                        aria-label={cost > 0 ? `${formatShortDate(key)}: $${cost.toFixed(2)}` : formatShortDate(key)}
                        aria-pressed={isSelected}
                        className={`rounded-sm transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isSelected ? "ring-2 ring-ring scale-110" : ""
                        }`}
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

        {/* Detail panel inline quando dia selecionado */}
        {selected && selectedDate && selectedDow && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" style={{ marginLeft: 36 }}>
            <span className="font-medium text-foreground">
              {selectedDow} · {formatShortDate(selected)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground tabular-nums">
              {selectedCost > 0 ? formatUSD(selectedCost) : "Sem atividade"}
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Fechar detalhe"
              className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
