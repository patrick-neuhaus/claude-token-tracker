import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAchievements } from "@/hooks/useAchievements";
import { ConfettiBurst } from "@/components/shared/ConfettiBurst";

const STORAGE_KEY = "achievements_seen";

function getSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/**
 * AchievementNotifier — Wave 6.7a polish (confetti burst on unlock).
 *
 * Consumes server-authoritative useAchievements hook. Detects newly unlocked
 * badges (vs localStorage seen set) and:
 * - Fires sonner toast per badge (max 5, +1 overflow toast)
 * - Mounts ConfettiBurst overlay 2s when at least 1 new badge detected
 *
 * Notes preserved from prior waves:
 * - First-time bootstrap (seen set empty) seeds without spamming toasts
 * - Timer ids tracked in ref + cleanup on unmount (BUG-15)
 * - notified.current REMOVED (P2.8) — relies on `seen` dedup only
 */
export function AchievementNotifier() {
  const { user } = useAuth();
  const { data } = useAchievements();
  const navigate = useNavigate();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user || !data) return;

    const currentUnlocked = data.badges.filter((b) => b.unlocked);
    const currentIds = currentUnlocked.map((b) => b.id);
    const seen = getSeen();
    const newBadges = currentUnlocked.filter((b) => !seen.has(b.id));

    // First-time bootstrap — seed without spamming toasts
    if (seen.size === 0 && currentIds.length > 0) {
      saveSeen(new Set(currentIds));
      return;
    }

    if (newBadges.length === 0) return;

    // Confetti burst (single trigger covers all unlocks in this batch)
    setShowConfetti(true);

    // Show toast per new badge (max 5) — track timer ids for cleanup
    const toShow = newBadges.slice(0, 5);
    toShow.forEach((badge, i) => {
      const timerId = setTimeout(() => {
        toast(`${badge.icon} Conquista desbloqueada!`, {
          description: badge.label,
          duration: Infinity,
          action: {
            label: "Ver conquistas",
            onClick: () => navigate("/achievements"),
          },
        });
      }, i * 800);
      timersRef.current.push(timerId);
    });

    if (newBadges.length > 5) {
      const overflowTimer = setTimeout(() => {
        toast(`...e mais ${newBadges.length - 5} conquistas!`, {
          duration: Infinity,
          action: {
            label: "Ver todas",
            onClick: () => navigate("/achievements"),
          },
        });
      }, 5 * 800);
      timersRef.current.push(overflowTimer);
    }

    // Save all current as seen
    const allSeen = new Set([...seen, ...currentIds]);
    saveSeen(allSeen);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [data, user, navigate]);

  if (!showConfetti) return null;

  return <ConfettiBurst onComplete={() => setShowConfetti(false)} />;
}
