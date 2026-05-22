import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Extract clientX/clientY from a Mouse or Touch event (P2 mobile fix). */
export function getEventPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
  if ("touches" in e) {
    const t = e.touches[0] || e.changedTouches[0];
    if (t) return { x: t.clientX, y: t.clientY };
    return { x: 0, y: 0 };
  }
  return { x: e.clientX, y: e.clientY };
}

/**
 * useChartTooltip — pointer-following tooltip for SVG charts.
 *
 * Usage:
 *   const { tooltip, show, hide, anchor } = useChartTooltip();
 *   <svg onMouseLeave={hide} onTouchEnd={hide}>
 *     <rect
 *       onMouseMove={(e) => show(e, <div>...</div>)}
 *       onTouchStart={(e) => show(e, <div>...</div>)}
 *       onTouchMove={(e) => show(e, <div>...</div>)}
 *     />
 *   </svg>
 *   {anchor}  // renders the floating tooltip via portal
 */
export function useChartTooltip() {
  const [state, setState] = useState<TooltipState | null>(null);

  const show = useCallback((e: React.MouseEvent | React.TouchEvent, content: ReactNode) => {
    const { x, y } = getEventPos(e);
    setState({ x, y, content });
  }, []);

  const hide = useCallback(() => setState(null), []);

  const anchor = state ? <ChartTooltip state={state} /> : null;

  return { tooltip: state, show, hide, anchor };
}

function ChartTooltip({ state }: { state: TooltipState }) {
  const offset = 14;
  const maxW = 260;
  // viewport-aware positioning: flip left if too close to right edge
  const flipLeft = typeof window !== "undefined" && state.x + offset + maxW > window.innerWidth;
  const left = flipLeft ? state.x - offset - maxW : state.x + offset;
  const top = Math.max(8, state.y - 12);
  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-xs shadow-md"
      style={{ left, top, maxWidth: maxW }}
    >
      {state.content}
    </div>,
    document.body
  );
}
