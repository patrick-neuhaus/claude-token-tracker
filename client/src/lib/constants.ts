export const MS_PER_DAY = 86_400_000;

/**
 * CHART_COLORS — Recharts paleta consumindo --chart-1..5 do index.css.
 * Drift fix (ds-tokens 3.4): antes era hardcoded hex, agora segue tokens.
 * 5 cores principais + 5 fallbacks com alpha reduzido = 10 distinguíveis.
 */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",      // 217 80% 60% blue
  "hsl(var(--chart-2))",      // 152 55% 55% green
  "hsl(var(--chart-3))",      // 38 80% 62%  amber
  "hsl(var(--chart-4))",      // 280 55% 65% purple
  "hsl(var(--chart-5))",      // 340 65% 60% magenta
  "hsl(var(--chart-1) / 0.7)",
  "hsl(var(--chart-2) / 0.7)",
  "hsl(var(--chart-3) / 0.7)",
  "hsl(var(--chart-4) / 0.7)",
  "hsl(var(--chart-5) / 0.7)",
];

export const DOW_LABELS_FULL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DOW_LABELS_SPARSE = ["", "Seg", "", "Qua", "", "Sex", ""];
export const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Wave 6.1 — Artemis brand-aligned chart palette via tokens
export const MODEL_COLORS: Record<string, string> = {
  opus: "hsl(var(--chart-4))",      // purple
  sonnet: "hsl(var(--chart-1))",    // vibrant blue (brand)
  haiku: "hsl(var(--chart-2))",     // green
  outro: "hsl(var(--muted-foreground))",
};

export const SOURCE_COLORS: Record<string, string> = {
  "claude-code": "hsl(var(--chart-3))",         // amber
  "claude.ai": "hsl(var(--brand-blue-mid))",    // brand
  codex: "hsl(var(--chart-2))",                 // green
};

export const VALUE_COLORS = {
  good: "hsl(var(--success-display))",
  medium: "hsl(var(--warning))",
  poor: "hsl(var(--destructive))",
};

export function normalizeModelFamily(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("gpt")) return "outro";
  if (lower.includes("opus")) return "opus";
  if (lower.includes("sonnet")) return "sonnet";
  if (lower.includes("haiku")) return "haiku";
  return "outro";
}

export function getModelColor(raw: string): string {
  return MODEL_COLORS[normalizeModelFamily(raw)] || MODEL_COLORS.outro;
}
