import { surface } from "@/lib/surface";
import { GapSlider } from "./GapSlider";
import { toDateInputValue } from "@/lib/timeFormatters";
import { MS_PER_DAY } from "@/lib/constants";

interface Props {
  dayFrom: string;
  dayTo: string;
  gap: number;
  onDayFromChange: (next: string) => void;
  onDayToChange: (next: string) => void;
  onGapChange: (next: number) => void;
}

/**
 * SessionTimeFilters — preset row + date range + GapSlider, all bundled in
 * a `surface.section` panel.
 *
 * Extracted from SessionTimePage:141-232.
 */
export function SessionTimeFilters({
  dayFrom,
  dayTo,
  gap,
  onDayFromChange,
  onDayToChange,
  onGapChange,
}: Props) {
  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - days * MS_PER_DAY);
    onDayFromChange(toDateInputValue(from));
    onDayToChange(toDateInputValue(to));
  }

  function applyThisMonth() {
    const now = new Date();
    onDayFromChange(toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
    onDayToChange(toDateInputValue(now));
  }

  return (
    <div className={`${surface.section} px-5 py-4 space-y-4`}>
      {/* Presets + datas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => applyPreset(1)}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => applyPreset(7)}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
          >
            7 dias
          </button>
          <button
            onClick={() => applyPreset(30)}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
          >
            30 dias
          </button>
          <button
            onClick={applyThisMonth}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
          >
            Este mês
          </button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">De</span>
          <input
            type="date"
            value={dayFrom}
            max={dayTo}
            onChange={(e) => onDayFromChange(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground [color-scheme:dark]"
          />
          <span className="text-muted-foreground text-xs">até</span>
          <input
            type="date"
            value={dayTo}
            min={dayFrom}
            onChange={(e) => onDayToChange(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Gap slider */}
      <GapSlider value={gap} onChange={onGapChange} />
    </div>
  );
}
