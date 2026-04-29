import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/skills" element={<SkillsPage />} />
                <Route path="/skills/:name" element={<SkillDetailPage />} />
                <Route path="/system-prompts" element={<SystemPromptsPage />} />
                <Route path="/system-prompts/:id" element={<SystemPromptDetailPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/sessions/:id" element={<SessionDetailPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/entries" element={<EntriesPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/session-time" element={<SessionTimePage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPage />} />
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
