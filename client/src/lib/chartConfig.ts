/**
 * Recharts tooltip styling — Wave 6.3 lift to canonical tokens.
 *
 * Drift fix: previously hardcoded hex (#1c1c2e/#2e2e44/#e2e2e2/#a0a0b8).
 * Now consumes --popover/--popover-foreground/--border/--muted-foreground
 * so tooltip respects light/dark theme + brand Artemis.
 */
export const TOOLTIP_PROPS = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--popover-foreground))",
    boxShadow: "var(--shadow-md, 0 4px 12px hsl(0 0% 0% / 0.15))",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
  itemStyle: { color: "hsl(var(--popover-foreground))" },
} as const;
