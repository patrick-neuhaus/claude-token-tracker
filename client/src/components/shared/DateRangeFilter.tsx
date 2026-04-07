import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DateRange {
  from?: string;
  to?: string;
  preset?: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: { value: string; label: string }[];
  className?: string;
}

const DEFAULT_PRESETS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Tudo" },
];

export function presetToRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  if (preset === "today") {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to };
  }
  if (preset === "7d") return { from: new Date(now.getTime() - 7 * 86400000).toISOString(), to };
  if (preset === "30d") return { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to };
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to };
  }
  return {}; // "all" ou qualquer outro = sem filtro
}

export function DateRangeFilter({ value, onChange, presets = DEFAULT_PRESETS, className = "" }: Props) {
  const hasAny = !!(value.from || value.to || value.preset);

  function selectPreset(p: string) {
    const range = presetToRange(p);
    onChange({ preset: p, ...range });
  }

  function handleFromChange(raw: string) {
    const from = raw ? new Date(raw).toISOString() : undefined;
    onChange({ from, to: value.to, preset: undefined });
  }

  function handleToChange(raw: string) {
    // "to" como fim do dia
    let to: string | undefined;
    if (raw) {
      const d = new Date(raw);
      d.setHours(23, 59, 59, 999);
      to = d.toISOString();
    }
    onChange({ from: value.from, to, preset: undefined });
  }

  function toDateInputValue(iso?: string) {
    if (!iso) return "";
    return iso.slice(0, 10);
  }

  function clear() {
    onChange({});
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Presets */}
      <div className="flex rounded-md border border-border overflow-hidden">
        {presets.map((opt) => (
          <button
            key={opt.value}
            onClick={() => selectPreset(opt.value)}
            className={`px-3 py-1.5 text-sm transition-colors ${
              value.preset === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Separador */}
      <div className="h-6 w-px bg-border" />

      {/* De / Até */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground text-xs">De</span>
        <input
          type="date"
          value={toDateInputValue(value.from)}
          onChange={(e) => handleFromChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        />
        <span className="text-muted-foreground text-xs">até</span>
        <input
          type="date"
          value={toDateInputValue(value.to)}
          onChange={(e) => handleToChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        />
      </div>

      {/* Limpar */}
      {hasAny && (
        <Button variant="ghost" size="sm" onClick={clear} className="h-8 gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
