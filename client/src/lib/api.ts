const BASE = "/api";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * SECURITY (Fase A A1): CSRF token guardado em memória (NÃO localStorage).
 *
 * Pattern:
 * - cookie httpOnly _csrf (secret, set pelo server em GET /api/auth/csrf-token)
 * - X-CSRF-Token header (token sincronizado, derivado server-side a partir do _csrf)
 * - csurf valida match em todo POST/PUT/PATCH/DELETE protegido
 *
 * Token vive em variável module-level. Sobrevive a navegação SPA mas não a
 * full reload — fetchCsrfToken() é chamado on-demand pela primeira request
 * state-changing pós-boot ou após 403 csrf_invalid.
 */
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  // Inflight dedup: múltiplas chamadas concorrentes compartilham a mesma promise.
  if (csrfTokenPromise) return csrfTokenPromise;

  csrfTokenPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/csrf-token`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        csrfToken = null;
        return null;
      }
      const body = (await res.json()) as { csrfToken?: string };
      csrfToken = body.csrfToken ?? null;
      return csrfToken;
    } catch {
      csrfToken = null;
      return null;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

/** Force re-fetch (after 403 csrf_invalid or logout). */
export function resetCsrfToken() {
  csrfToken = null;
  csrfTokenPromise = null;
}

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // SECURITY (Fase A A1): inject X-CSRF-Token em state-changing requests.
  // /auth/csrf-token e /auth/login etc estão em CSRF_SKIP_AUTH_PATHS do server,
  // mas enviar o header não quebra (server ignora se não validar).
  if (STATE_CHANGING.has(method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // SECURITY (Fase A A1): credentials:include exigido pra browser enviar
  // cookie httpOnly `auth_token` (signed) + `_csrf` (csurf secret) automático.
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    // Auth cookie missing/invalid. Nada a limpar local — cookie é httpOnly,
    // server-side limpou no logout/expiry. Caller decide redirect via context.
    throw new ApiError(401, "Unauthorized");
  }

  if (res.status === 403) {
    // CSRF token mismatch → invalida cache + propaga pro caller decidir retry.
    const body = await res.json().catch(() => ({}));
    if (body?.code === "csrf_invalid") {
      resetCsrfToken();
      throw new ApiError(403, body.message || "CSRF invalid", "csrf_invalid");
    }
    throw new ApiError(403, body.message || "Forbidden", body.code);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(res.status, body.message || "Request failed", body.code);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
