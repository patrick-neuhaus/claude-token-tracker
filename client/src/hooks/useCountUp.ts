import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Parse numeric prefix from string ("1.247" → 1247, "183" → 183, "$15133.49" → 15133.49).
 * Brazilian thousands "1.247" handled (dots removed before float parse).
 */
export function parseNumeric(v: string | number): number | null {
  if (v == null) return null;
  const str = String(v).replace(/[^\d.,-]/g, "");
  const n = parseFloat(str.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

/**
 * Format `current` to mirror `original` numeric pattern (preserves "1.247" thousands or plain).
 */
export function formatLike(original: string | number, current: number): string {
  const orig = String(original);
  const hasDotThousands = /^\d{1,3}(\.\d{3})+$/.test(orig);
  if (hasDotThousands) return current.toLocaleString("pt-BR").replace(",", ".");
  return String(current);
}

/**
 * useCountUp — shared count-up animation hook (Wave 6.3 extraction from StatCard).
 *
 * Animates 0→value when ref enters viewport. Respects prefers-reduced-motion.
 * Use for KPI cards, stat tiles, dashboard metrics. Numeric values only —
 * fallback to original string if parse fails.
 *
 * @param ref Element ref (animates when visible)
 * @param target Final value (string or number)
 * @param duration Animation ms (default 800)
 * @returns Display value (string or number)
 */
export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  target: string | number,
  duration = 800,
): string | number {
  const [display, setDisplay] = useState<string | number>(target);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const numeric = parseNumeric(target);
    if (numeric === null) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * numeric);
            setDisplay(formatLike(target, current));
            if (progress < 1) requestAnimationFrame(tick);
            else setDisplay(target);
          };
          requestAnimationFrame(tick);
          io.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, ref]);

  return display;
}
