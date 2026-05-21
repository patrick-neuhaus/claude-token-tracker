import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
// Eager (boot-critical): Login + Dashboard
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";

// lazyWithRetry: recupera de chunk-stale após deploy (browser cacheia hash velho).
// Quando hash do bundle muda e fetch falha, recarrega a janela uma vez pra puxar o index.html novo.
// Flag em sessionStorage evita loop infinito caso o erro seja outro (ex: 500, offline).
function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const reloadFlag = "__lazyChunkReloaded__";
    try {
      return await factory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkStale =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("error loading dynamically imported module") ||
        msg.includes("Importing a module script failed");
      if (isChunkStale && typeof window !== "undefined") {
        const alreadyReloaded = window.sessionStorage.getItem(reloadFlag) === "1";
        if (!alreadyReloaded) {
          window.sessionStorage.setItem(reloadFlag, "1");
          console.warn("[lazy] chunk stale, reloading window");
          window.location.reload();
          // pendência: reload acima já abortou, mas precisamos retornar algo válido pro TS
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

// Lazy (low-freq / heavy): tudo o que não é Dashboard nem Login.
// React.lazy precisa de default export — pages exportam named, então mapeamos no import dinâmico.
const SessionsPage = lazyWithRetry(() => import("@/pages/SessionsPage").then(m => ({ default: m.SessionsPage })));
const SessionDetailPage = lazyWithRetry(() => import("@/pages/SessionDetailPage").then(m => ({ default: m.SessionDetailPage })));
const SessionTimePage = lazyWithRetry(() => import("@/pages/SessionTimePage").then(m => ({ default: m.SessionTimePage })));
const EntriesPage = lazyWithRetry(() => import("@/pages/EntriesPage").then(m => ({ default: m.EntriesPage })));
const ProjectsPage = lazyWithRetry(() => import("@/pages/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazyWithRetry(() => import("@/pages/ProjectDetailPage").then(m => ({ default: m.ProjectDetailPage })));
const AnalyticsPage = lazyWithRetry(() => import("@/pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const AchievementsPage = lazyWithRetry(() => import("@/pages/AchievementsPage").then(m => ({ default: m.AchievementsPage })));
const SettingsPage = lazyWithRetry(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const AdminPage = lazyWithRetry(() => import("@/pages/AdminPage").then(m => ({ default: m.AdminPage })));
const SkillsPage = lazyWithRetry(() => import("@/pages/SkillsPage").then(m => ({ default: m.SkillsPage })));
const SkillDetailPage = lazyWithRetry(() => import("@/pages/SkillDetailPage").then(m => ({ default: m.SkillDetailPage })));
const SkillUsagePage = lazyWithRetry(() => import("@/pages/SkillUsagePage").then(m => ({ default: m.SkillUsagePage })));
const SystemPromptsPage = lazyWithRetry(() => import("@/pages/SystemPromptsPage").then(m => ({ default: m.SystemPromptsPage })));
const SystemPromptDetailPage = lazyWithRetry(() => import("@/pages/SystemPromptDetailPage").then(m => ({ default: m.SystemPromptDetailPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<RouteErrorBoundary routeName="Dashboard"><DashboardPage /></RouteErrorBoundary>} />
                <Route path="/skills" element={<RouteErrorBoundary routeName="Skills"><LazyRoute><SkillsPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/skills/:name" element={<RouteErrorBoundary routeName="Skill Detail"><LazyRoute><SkillDetailPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/skill-usage" element={<RouteErrorBoundary routeName="Skill Usage"><LazyRoute><SkillUsagePage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/system-prompts" element={<RouteErrorBoundary routeName="System Prompts"><LazyRoute><SystemPromptsPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/system-prompts/:id" element={<RouteErrorBoundary routeName="System Prompt Detail"><LazyRoute><SystemPromptDetailPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/sessions" element={<RouteErrorBoundary routeName="Sessions"><LazyRoute><SessionsPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/sessions/:id" element={<RouteErrorBoundary routeName="Session Detail"><LazyRoute><SessionDetailPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/projects" element={<RouteErrorBoundary routeName="Projects"><LazyRoute><ProjectsPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/projects/:id" element={<RouteErrorBoundary routeName="Project Detail"><LazyRoute><ProjectDetailPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/entries" element={<RouteErrorBoundary routeName="Entries"><LazyRoute><EntriesPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/analytics" element={<RouteErrorBoundary routeName="Analytics"><LazyRoute><AnalyticsPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/session-time" element={<RouteErrorBoundary routeName="Session Time"><LazyRoute><SessionTimePage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/achievements" element={<RouteErrorBoundary routeName="Achievements"><LazyRoute><AchievementsPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/settings" element={<RouteErrorBoundary routeName="Settings"><LazyRoute><SettingsPage /></LazyRoute></RouteErrorBoundary>} />
                <Route path="/admin" element={<RouteErrorBoundary routeName="Admin"><LazyRoute><AdminPage /></LazyRoute></RouteErrorBoundary>} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster theme="dark" position="bottom-right" />
        </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
