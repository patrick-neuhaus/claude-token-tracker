import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SessionsPage } from "@/pages/SessionsPage";
import { EntriesPage } from "@/pages/EntriesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AdminPage } from "@/pages/AdminPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AchievementsPage } from "@/pages/AchievementsPage";
import { SessionTimePage } from "@/pages/SessionTimePage";
import { SessionDetailPage } from "@/pages/SessionDetailPage";
import { SkillsPage } from "@/pages/SkillsPage";
import { SkillDetailPage } from "@/pages/SkillDetailPage";
import { SystemPromptsPage } from "@/pages/SystemPromptsPage";
import { SystemPromptDetailPage } from "@/pages/SystemPromptDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<RouteErrorBoundary routeName="Dashboard"><DashboardPage /></RouteErrorBoundary>} />
                <Route path="/skills" element={<RouteErrorBoundary routeName="Skills"><SkillsPage /></RouteErrorBoundary>} />
                <Route path="/skills/:name" element={<RouteErrorBoundary routeName="Skill Detail"><SkillDetailPage /></RouteErrorBoundary>} />
                <Route path="/system-prompts" element={<RouteErrorBoundary routeName="System Prompts"><SystemPromptsPage /></RouteErrorBoundary>} />
                <Route path="/system-prompts/:id" element={<RouteErrorBoundary routeName="System Prompt Detail"><SystemPromptDetailPage /></RouteErrorBoundary>} />
                <Route path="/sessions" element={<RouteErrorBoundary routeName="Sessions"><SessionsPage /></RouteErrorBoundary>} />
                <Route path="/sessions/:id" element={<RouteErrorBoundary routeName="Session Detail"><SessionDetailPage /></RouteErrorBoundary>} />
                <Route path="/projects" element={<RouteErrorBoundary routeName="Projects"><ProjectsPage /></RouteErrorBoundary>} />
                <Route path="/projects/:id" element={<RouteErrorBoundary routeName="Project Detail"><ProjectDetailPage /></RouteErrorBoundary>} />
                <Route path="/entries" element={<RouteErrorBoundary routeName="Entries"><EntriesPage /></RouteErrorBoundary>} />
                <Route path="/analytics" element={<RouteErrorBoundary routeName="Analytics"><AnalyticsPage /></RouteErrorBoundary>} />
                <Route path="/session-time" element={<RouteErrorBoundary routeName="Session Time"><SessionTimePage /></RouteErrorBoundary>} />
                <Route path="/achievements" element={<RouteErrorBoundary routeName="Achievements"><AchievementsPage /></RouteErrorBoundary>} />
                <Route path="/settings" element={<RouteErrorBoundary routeName="Settings"><SettingsPage /></RouteErrorBoundary>} />
                <Route path="/admin" element={<RouteErrorBoundary routeName="Admin"><AdminPage /></RouteErrorBoundary>} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster theme="dark" position="bottom-right" />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
