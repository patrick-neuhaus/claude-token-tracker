import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ConfirmEmailScreen } from "@/components/auth/ConfirmEmailScreen";
import { Activity, Sun, Moon } from "lucide-react";
import { api } from "@/lib/api";

type AuthMode = "login" | "register" | "forgot" | "reset" | "confirm";

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
  const { mode: themeMode, toggle: toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [mode, setMode] = useState<AuthMode>(tokenFromUrl ? "reset" : "login");

  // If user lands with ?token= but is already logged in, we still let them
  // reset (handy when patrick is signed in and clicks the link himself).
  useEffect(() => {
    if (tokenFromUrl && mode !== "reset") {
      setMode("reset");
    }
  }, [tokenFromUrl, mode]);

  function goLogin() {
    if (tokenFromUrl) {
      // Strip token from URL so we don't bounce back to reset mode.
      const next = new URLSearchParams(searchParams);
      next.delete("token");
      setSearchParams(next, { replace: true });
    }
    setMode("login");
  }

  if (loading) return null;
  if (user && !tokenFromUrl) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* Wave 7.5: Theme toggle fixed top-right (above brand panel + form) */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={themeMode === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        className="absolute top-4 right-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
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
          {mode === "login" && (
            <LoginForm
              onSwitch={() => setMode("register")}
              onForgot={() => setMode("forgot")}
            />
          )}
          {mode === "register" && <RegisterForm onSwitch={() => setMode("login")} />}
          {mode === "forgot" && (
            <ForgotPasswordForm
              onSubmit={async (email) => {
                await api.post("/auth/forgot", { email });
              }}
              onGoLogin={goLogin}
            />
          )}
          {mode === "reset" && (
            <ResetPasswordForm
              token={tokenFromUrl ?? undefined}
              onSubmit={async (password, token) => {
                if (!token) {
                  throw new Error("Token ausente. Use o link enviado por email.");
                }
                await api.post("/auth/reset", { token, password });
              }}
              onGoLogin={goLogin}
            />
          )}
          {mode === "confirm" && (
            <ConfirmEmailScreen
              status="success"
              onContinue={() => setMode("login")}
              onResend={() => setMode("forgot")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
