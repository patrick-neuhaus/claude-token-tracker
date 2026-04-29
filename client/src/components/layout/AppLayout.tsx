import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { AchievementNotifier } from "@/components/analytics/AchievementNotifier";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { Search } from "lucide-react";

export function AppLayout() {
  const { user, loading } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
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

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-end gap-3 px-6 py-3 bg-background/80 backdrop-blur border-b border-border">
          <button
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 hover:bg-muted/60 border border-border rounded-md transition-colors min-w-[220px] justify-between"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Buscar...
            </span>
            <kbd className="font-mono text-[10px] border border-border rounded px-1 bg-background">Ctrl+K</kbd>
          </button>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <AchievementNotifier />
    </div>
  );
}
