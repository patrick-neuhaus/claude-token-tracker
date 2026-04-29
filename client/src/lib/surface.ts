/**
 * Surface helper — replacement for shadcn Card to avoid "card soup" anti-pattern.
 *
 * Use these className strings instead of <Card>/<CardHeader>/<CardContent> components.
 * The DS rule: vary padding/radius/border by context, not uniform like Card forces.
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
