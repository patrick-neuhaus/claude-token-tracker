import { useEffect, useState } from "react";
import { X, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/shared/NativeSelect";
import { displayModelName } from "@/lib/constants";
import {
  useCustomPricing,
  useUpsertPricing,
  useDeletePricing,
  type PricingOverride,
  type PricingRates,
} from "@/hooks/useCustomPricing";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SUPPORTED_MODELS = [
  "opus-4-7",
  "opus-4-6",
  "opus-4-5",
  "sonnet-4-6",
  "sonnet-4-5",
  "haiku-4-5",
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.3-codex",
];

const EMPTY_RATES: PricingRates = {
  input_rate: 0,
  output_rate: 0,
  cache_read_rate: 0,
  cache_write_rate: 0,
};

/**
 * Wave 7.3 (F-NEW-8) — PricingDrawer.
 *
 * Side panel right-anchored. User adds/edits/deletes per-model pricing
 * overrides (USD per 1M tokens). Apply to FUTURE entries (webhook insert
 * uses getEffectivePricing). Não recalcula custo histórico.
 */
export function PricingDrawer({ open, onClose }: Props) {
  const { data, isLoading } = useCustomPricing();
  const upsert = useUpsertPricing();
  const del = useDeletePricing();

  const overrides = data?.overrides ?? [];
  const [selectedModel, setSelectedModel] = useState<string>(SUPPORTED_MODELS[0]);
  const [rates, setRates] = useState<PricingRates>(EMPTY_RATES);
  const [error, setError] = useState<string | null>(null);

  // Quando muda model selecionado, pré-popula com override existente se houver.
  useEffect(() => {
    const existing = overrides.find((o) => o.model_key === selectedModel);
    if (existing) {
      setRates({
        input_rate: existing.input_rate,
        output_rate: existing.output_rate,
        cache_read_rate: existing.cache_read_rate,
        cache_write_rate: existing.cache_write_rate,
      });
    } else {
      setRates(EMPTY_RATES);
    }
    setError(null);
  }, [selectedModel, overrides]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function setRate(key: keyof PricingRates, raw: string) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      setRates((r) => ({ ...r, [key]: n }));
      setError(null);
    } else {
      setError("Valores devem ser números >= 0");
    }
  }

  async function handleSave() {
    if (Object.values(rates).some((v) => !Number.isFinite(v) || v < 0)) {
      setError("Verifica os valores antes de salvar");
      return;
    }
    try {
      await upsert.mutateAsync({ modelKey: selectedModel, rates });
      toast.success(`Override salvo pra ${displayModelName(selectedModel)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  async function handleDelete() {
    try {
      await del.mutateAsync(selectedModel);
      toast.success(`Override removido pra ${displayModelName(selectedModel)}`);
      setRates(EMPTY_RATES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  const hasOverride = overrides.some((o) => o.model_key === selectedModel);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Customizar pricing por modelo"
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Pricing customizado</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              USD por 1M tokens. Aplica em entries futuras.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Model picker */}
          <div className="space-y-2">
            <Label htmlFor="pricing-model">Modelo</Label>
            <NativeSelect
              id="pricing-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {SUPPORTED_MODELS.map((m) => (
                <option key={m} value={m}>
                  {displayModelName(m)}
                  {overrides.some((o) => o.model_key === m) ? " · custom" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Rates form */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rate-input">Input</Label>
              <Input
                id="rate-input"
                type="number"
                step="0.01"
                min={0}
                value={rates.input_rate}
                onChange={(e) => setRate("input_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-output">Output</Label>
              <Input
                id="rate-output"
                type="number"
                step="0.01"
                min={0}
                value={rates.output_rate}
                onChange={(e) => setRate("output_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-cache-read">Cache read</Label>
              <Input
                id="rate-cache-read"
                type="number"
                step="0.01"
                min={0}
                value={rates.cache_read_rate}
                onChange={(e) => setRate("cache_read_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-cache-write">Cache write</Label>
              <Input
                id="rate-cache-write"
                type="number"
                step="0.01"
                min={0}
                value={rates.cache_write_rate}
                onChange={(e) => setRate("cache_write_rate", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}

          {/* Existing overrides quick list */}
          {overrides.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">
                Overrides ativos ({overrides.length})
              </p>
              <div className="space-y-1">
                {overrides.map((o: PricingOverride) => (
                  <button
                    key={o.model_key}
                    type="button"
                    onClick={() => setSelectedModel(o.model_key)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent ${
                      selectedModel === o.model_key ? "bg-accent" : ""
                    }`}
                  >
                    <div className="font-medium">{displayModelName(o.model_key)}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      ${o.input_rate.toFixed(2)} in / ${o.output_rate.toFixed(2)} out
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && <p className="text-sm text-muted-foreground">Carregando overrides...</p>}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-muted/20">
          {hasOverride ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={del.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {del.isPending ? "Removendo..." : "Remover override"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}
