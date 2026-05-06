import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";

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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  register: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Wave 6.1 BYPASS — single-tenant mock user pra preview visual sem backend.
// Wave 7 cleanup formal: drop AuthProvider inteiro + LoginPage + auth routes server.
const MOCK_USER: User = {
  id: "mock",
  email: "preview@artemis.local",
  display_name: "Preview",
  webhook_token: "ck_mock_preview_token",
  role: "user",
  brl_rate: 5.0,
  plan_cost_usd: 200,
  daily_budget_usd: null,
  session_budget_usd: null,
  plan_start_date: null,
  weekly_reset_dow: 2,
  weekly_reset_hour: 15,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Wave 6.1 bypass — começa com MOCK_USER em vez de null
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [loading, setLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<User>("/auth/me");
      setUser(data);
    } catch {
      // Wave 6.1 bypass: backend off → mantém MOCK_USER em vez de null
      setUser(MOCK_USER);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post<{ status: string; token?: string; user?: User; message?: string }>(
        "/auth/login",
        { email, password },
      );
      if (res.status === "active" && res.token) {
        localStorage.setItem("token", res.token);
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
      const res = await api.post<{ status: string; token?: string; message?: string }>(
        "/auth/register",
        { email, password },
      );
      if (res.status === "active" && res.token) {
        localStorage.setItem("token", res.token);
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

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
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
