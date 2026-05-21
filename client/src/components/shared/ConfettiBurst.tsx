import { useEffect, useRef } from "react";

interface Props {
  /** Number of particles. Default 16. */
  count?: number;
  /** Total animation duration ms. Default 1600. */
  duration?: number;
  /** Auto-unmount delay ms (parent should also clean state). Default 1800. */
  onComplete?: () => void;
  /** Token-based palette override. Default chart-1..5. */
  colors?: string[];
}

/**
 * ConfettiBurst — particle confetti motion (Wave 6.7a shared, extracted from
 * OnboardingWizard.DoneStep + reused in AchievementNotifier).
 *
 * Renders fixed inset-0 pointer-events-none overlay. Particles fall + rotate
 * via CSS keyframes with stagger by index. Auto-fires onComplete when total
 * duration elapses (parent unmounts).
 *
 * Respects prefers-reduced-motion: particles hidden, onComplete fires immediately.
 *
 * Use as:
 *   {showConfetti && <ConfettiBurst onComplete={() => setShowConfetti(false)} />}
 */
export function ConfettiBurst({
  count = 16,
  duration = 1600,
  onComplete,
  colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ],
}: Props) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!onComplete) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 0 : duration + 200;
    timerRef.current = window.setTimeout(onComplete, delay);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [duration, onComplete]);

  const particles = Array.from({ length: count });

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((_, i) => (
        <span
          key={i}
          className="confetti-particle"
          style={
            {
              "--c": colors[i % colors.length],
              "--x": `${(i / count) * 100}%`,
              "--delay": `${i * 40}ms`,
              "--dur": `${duration}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
