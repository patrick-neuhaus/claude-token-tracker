import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSummary } from "@/hooks/useDashboard";
import { Sidebar } from "./Sidebar";
import { AchievementNotifier } from "@/components/analytics/AchievementNotifier";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ShortcutsOverlay } from "@/components/ShortcutsOverlay";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export function AppLayout() {
  const { user, loading, refreshUser } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Worker RR: onboarding flag agora vem do server (user_settings.onboarding_completed,
  // migration 021). Survives cross-device + powers "Refazer tour" reset em Settings.
  // Wizard dispara quando flag = false AND ainda não há entries (evita re-mostrar
  // depois que o user já viu dados rolarem).
  const { data: summary } = useSummary({ period: "month" });
  const showOnboarding =
    !!user &&
    !user.onboarding_completed &&
    !!summary &&
    summary.entry_count === 0;

  // Cmd+K / Ctrl+K — global search; "?" or Shift+/ — shortcuts overlay.
  // Skip when focus is in an input/textarea/contenteditable to not steal typing.
  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      // "?" overlay: only when not typing and no modifier other than Shift.
      if (
        (e.key === "?" || (e.key === "/" && e.shiftKey)) &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTyping(e.target)
      ) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Wave 6.4c — MOCK_USER bypass removed. Real auth restored.
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen">
      <Sidebar onSearchOpen={() => setSearchOpen(true)} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <ShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AchievementNotifier />
      {showOnboarding && (
        <OnboardingWizard onComplete={() => refreshUser()} />
      )}
    </div>
  );
}
