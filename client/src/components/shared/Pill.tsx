import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillVariant = "ok" | "warn" | "err" | "neutral" | "info";

interface Props {
  variant?: PillVariant;
  /** Show inline 5px dot before content. Default true. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Pill — canonical CRM status badge with inline dot.
 * Anti-ai-design-system lift (Wave 8.2.4 R4).
 *
 * Variants map to status colors:
 *  - ok     → success (verde)
 *  - warn   → warning (amarelo)
 *  - err    → destructive (vermelho)
 *  - neutral → muted (cinza)
 *  - info   → primary (azul)
 *
 * Use for status-like data (active/paused, source, tier).
 * For numeric counts or tags, prefer Badge.
 */
export function Pill({ variant = "neutral", dot = true, className, children }: Props) {
  return (
    <span className={cn("pill", variant, className)}>
      {dot && <span className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
