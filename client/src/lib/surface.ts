/**
 * Surface helper — replacement for shadcn Card to avoid "card soup" anti-pattern.
 *
 * Use these className strings instead of <Card>/<CardHeader>/<CardContent> components.
 * The DS rule: vary padding/radius/border by context, not uniform like Card forces.
 *
 * Card primitive deletado em B7.1 — use surface.* helpers
 *
 * Reference: anti-ai-design-system anti-pattern #1 (Card soup).
 */

export const surface = {
  /** Primary container — full surface for major page sections (charts, summary). */
  primary: "bg-card border border-border rounded-lg",
  /** Section container with header+content split (titled blocks). */
  section: "bg-card border border-border rounded-md",
  /** Inline emphasis — lightweight box for nested data (rows, mini-stats). */
  inline: "bg-card/50 border border-border/50 rounded-sm px-4 py-3",
  /** Subdued — backgrounds for grouped controls (filter bars, footer info). */
  subdued: "bg-muted/40 border border-border/40 rounded-md px-4 py-3",
} as const;

/** Header row inside a `surface.section`. */
export const surfaceHeader = "px-5 py-3 border-b border-border";

/** Content area inside a `surface.section` (after a header). */
export const surfaceContent = "px-5 py-4";

/** Single-padding wrapper for `surface.primary` when no header. */
export const surfaceBody = "px-5 py-4";

/* ============================================================
   Typography utility recipes (ds-tokens 3.3 — gap small, no token)
   Use these strings directly in className for consistency across pages.
   ============================================================ */

/** Page header h2 recipe — used by all pages. */
export const textH2 = "text-xl font-semibold tracking-tight";

/** Subtitle below h2 — informational (count, period, filter). */
export const textSubtitle = "text-sm text-muted-foreground";

/** Display number (KPI cards, dashboard metrics). */
export const textKpi = "text-3xl font-semibold tabular-nums tracking-tight";

/** Caption — small labels, table headers. */
export const textCaption = "text-xs text-muted-foreground uppercase tracking-wider";
