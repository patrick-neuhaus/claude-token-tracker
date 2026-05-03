import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAchievements } from "@/hooks/useAchievements";

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
 * AchievementNotifier — Wave B4.1 V001
 *
 * Consumes server-authoritative useAchievements hook. Detects newly unlocked
 * badges (vs localStorage history) and fires toast notifications.
 *
 * Note (P2.8 react-patterns): notified.current is REMOVED. Previously this
 * caused a one-shot effect that wouldn't re-notify on subsequent unlocks
 * during a session. Now relies on `seen` set deduplication only.
 */
export function AchievementNotifier() {
  const { user } = useAuth();
  const { data } = useAchievements();
  const lastSeenSize = useRef<number>(-1);

  useEffect(() => {
    if (!user || !data) return;

    const currentUnlocked = data.badges.filter((b) => b.unlocked);
    const currentIds = currentUnlocked.map((b) => b.id);
    const seen = getSeen();
    const newBadges = currentUnlocked.filter((b) => !seen.has(b.id));

    // First-time bootstrap — seed without spamming toasts
    if (seen.size === 0 && currentIds.length > 0) {
      saveSeen(new Set(currentIds));
      lastSeenSize.current = currentIds.length;
      return;
    }

    if (newBadges.length === 0) return;

    // Show toast per new badge (max 5)
    const toShow = newBadges.slice(0, 5);
    toShow.forEach((badge, i) => {
      setTimeout(() => {
        toast(`${badge.icon} Conquista desbloqueada!`, {
          description: badge.label,
          duration: Infinity,
          action: {
            label: "Ver conquistas",
            onClick: () => (window.location.href = "/achievements"),
          },
        });
      }, i * 800);
    });

    if (newBadges.length > 5) {
      setTimeout(() => {
        toast(`...e mais ${newBadges.length - 5} conquistas!`, {
          duration: Infinity,
          action: {
            label: "Ver todas",
            onClick: () => (window.location.href = "/achievements"),
          },
        });
      }, 5 * 800);
    }

    // Save all current as seen
    const allSeen = new Set([...seen, ...currentIds]);
    saveSeen(allSeen);
    lastSeenSize.current = allSeen.size;
  }, [data, user]);

  return null;
}
