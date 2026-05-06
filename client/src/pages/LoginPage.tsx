import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Activity } from "lucide-react";

/**
 * LoginPage — split-panel canonical (Wave 6.4a lift, anti-ai-design-system
 * auth/LoginScreen.jsx pattern).
 *
 * Anatomy:
 * - Left (lg+): brand panel — primary fill (Artemis navy) + logo + tagline
 * - Right: form panel — bg-background + LoginForm/RegisterForm
 * - Mobile: stack vertical, brand panel becomes minor header
 *
 * Auth logic preserved: LoginForm/RegisterForm own state. Single-tenant pivot
 * still applies (Wave 6.1 MOCK_USER bypass routes /dashboard before this page).
 */
export function LoginPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel (left on lg+, top header on mobile) */}
      <aside
        className="flex items-center justify-center px-6 py-8 lg:flex-1 lg:px-8 lg:py-12"
        style={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
        }}
      >
        <div className="text-center max-w-sm space-y-4 lg:space-y-6">
          <div className="inline-flex items-center gap-2 lg:flex-col lg:gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center lg:h-12 lg:w-12"
              style={{
                background: "hsl(var(--primary-foreground) / 0.12)",
                color: "hsl(var(--primary-foreground))",
              }}
              aria-hidden="true"
            >
              <Activity className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <h1
              className="text-xl font-semibold tracking-tight lg:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Claude Token Tracker
            </h1>
          </div>
          <p
            className="hidden lg:block text-base leading-relaxed"
            style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}
          >
            Plausible pra Claude. Acompanha quanto tu gasta em Claude Code, Codex,
            claude.ai ou qualquer LLM via hook customizável.
          </p>
          <div
            className="hidden lg:block text-xs font-medium uppercase tracking-widest"
            style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}
          >
            By Studio Artemis
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 bg-background">
        <div className="w-full max-w-md">
          {mode === "login" ? (
            <LoginForm onSwitch={() => setMode("register")} />
          ) : (
            <RegisterForm onSwitch={() => setMode("login")} />
          )}
        </div>
      </main>
    </div>
  );
}
