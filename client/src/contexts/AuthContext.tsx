import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, resetCsrfToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
  display_name: string | null;
  webhook_token: string;
  role: string;
  brl_rate: number;
  plan_cost_usd: number;
  daily_budget_usd: number | null;
  session_budget_usd: number | null;
  plan_start_date: string | null;
  weekly_reset_dow: number;
  weekly_reset_hour: number;
  // Worker RR: server-persisted onboarding flag (migration 021).
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  register: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider — Fase A A1: cookie httpOnly auth (sem localStorage).
 *
 * Flow:
 * - Mount: chama GET /api/auth/me (browser envia auth_token cookie automático).
 *   200 → setUser; 401 → setUser(null) → AppLayout redirect /login.
 * - login(): POST /api/auth/login. Server seta cookie httpOnly. Body retorna user.
 *   Client guarda user em state, depois chama refreshUser pra hidratar completo.
 * - logout(): POST /api/auth/logout. Server clearCookie. Client reset state +
 *   reset CSRF token cache (próxima sessão pega novo).
 * - 401 de qualquer endpoint: api.ts joga ApiError(401); AppLayout/router
 *   redireciona /login na próxima render.
 *
 * Mudança vs Wave anterior:
 * - JWT NÃO está mais em localStorage. Cookie httpOnly NÃO é acessível por JS.
 * - Boot não tem "if token in localStorage" — chama /me sempre e deixa server
 *   decidir via cookie. Custo: 1 request extra no cold start anônimo (200ms).
 * - logout virou async (POST server-side).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<User>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post<{ status: string; user?: User; message?: string }>(
        "/auth/login",
        { email, password },
      );
      if (res.status === "active") {
        // Cookie já foi setado pelo server. Refresh CSRF cache pro próximo
        // POST (csurf gera novo secret na sessão recém-autenticada).
        resetCsrfToken();
        await refreshUser();
        return { status: "active" };
      }
      return { status: res.status, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { status: "error", message: err.message };
      }
      return { status: "error", message: "Connection failed" };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await api.post<{ status: string; user?: User; message?: string }>(
        "/auth/register",
        { email, password },
      );
      if (res.status === "active") {
        resetCsrfToken();
        await refreshUser();
        return { status: "active" };
      }
      return { status: res.status, message: res.message };
    } catch (err) {
      if (err instanceof ApiError) {
        return { status: "error", message: err.message };
      }
      return { status: "error", message: "Connection failed" };
    }
  };

  const logout = async () => {
    try {
      // Server clearCookie. Se POST falhar (network/CSRF), ainda assim limpa
      // state local — usuário não fica "preso" em UI logada com cookie expirado.
      await api.post("/auth/logout", {});
    } catch {
      // Silent — best-effort. Cookie pode permanecer até expirar (7d).
    } finally {
      resetCsrfToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
