import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/shared/FilterChip";

interface Props {
  /** Current gap value in minutes. */
  value: number;
  /** Callback when slider or preset chip changes value. */
  onChange: (next: number) => void;
  /** Minutes presets shown as chips below slider. Default `[15, 30, 60, 90, 120, 180]`. */
  presets?: number[];
  /** Slider min/max range. Default 0–500. */
  min?: number;
  max?: number;
}

/**
 * GapSlider — range input + preset chips for "max gap minutes" control.
 *
 * Extracted from SessionTimePage:194-231. Owns no internal state — fully
 * controlled by parent.
 */
export function GapSlider({
  value,
  onChange,
  presets = [15, 30, 60, 90, 120, 180],
  min = 0,
  max = 500,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Gap máximo</span>
          <Badge variant="secondary" className="tabular-nums">{value} min</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>Intervalos maiores que isso não contam como trabalho</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums w-8">{min}m</span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{max}m</span>
      </div>
      {/* Presets rápidos */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Presets:</span>
        {presets.map((v) => (
          <FilterChip
            key={v}
            label={v >= 60 ? `${v / 60}h` : `${v}m`}
            active={value === v}
            onClick={() => onChange(v)}
            variant="primary"
          />
        ))}
      </div>
    </div>
  );
}
