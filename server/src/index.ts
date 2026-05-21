import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import {
  csrfProtection,
  CSRF_SKIP_PREFIXES,
  CSRF_SKIP_AUTH_PATHS,
} from "./middleware/csrf.js";
import authRouter from "./routes/auth.js";
import webhookRouter from "./routes/webhook.js";
import dashboardRouter from "./routes/dashboard.js";
import sessionsRouter from "./routes/sessions.js";
import entriesRouter from "./routes/entries.js";
import settingsRouter from "./routes/settings.js";
import projectsRouter from "./routes/projects.js";
import adminRouter from "./routes/admin.js";
import importRouter from "./routes/import.js";
import analyticsRouter from "./routes/analytics.js";
import achievementsRouter from "./routes/achievements.js";
import skillsRouter from "./routes/skills.js";
import systemPromptsRouter from "./routes/systemPrompts.js";
import skillInvocationsRouter from "./routes/skillInvocations.js";
import skillAllowlistRouter from "./routes/skillAllowlist.js";
import toolInvocationsRouter from "./routes/toolInvocations.js";
import compactionsRouter from "./routes/compactions.js";
import healthRouter from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { cleanupExpired } from "./services/passwordResetService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// SECURITY (A2 P2-1): helmet sets standard hardening headers (HSTS, X-Frame, etc.)
// + a CSP que cabe no frontend servido (Lora/Poppins/Geist via Google Fonts,
// Vite dev WS on 5173).
//
// scriptSrc: 'self' apenas — sem 'unsafe-inline'. Onda 9 Worker BB moveu o
// FOUC theme bootstrap script de inline em index.html pra /theme-bootstrap.js
// (em client/public/, servido raw pelo Vite/Express).
//
// styleSrc: 'unsafe-inline' MANTIDO. Onda 9 Worker BB removeu inline <style>
// JSX tags (WebhookPing, ConfettiBurst → index.css) — sobrou 0 inline <style>.
// Porém ~40 components usam style={{...}} prop com valores dinâmicos
// (CSS variables, dimensões calculadas, cores HSL geradas em runtime). Esses
// também contam como inline style pra CSP. Remover 'unsafe-inline' completo
// exigiria refactor multi-onda + visual regression test em cada chart/card.
//
// TODO (P3 backlog gradual): cleanup component-a-component dos style={{...}}
// props dinâmicos remanescentes. Pattern target: extrair pra CSS class +
// passar valor via custom property no DOM ancestor (que ainda usa inline mas
// é um único hook por subtree, não dezenas). Hash-based CSP (sha256-...)
// inviável: hashes quebram a cada build Vite. Nonce-based inviável: frontend
// é SPA static sem injeção server-side. Approach correto = refactor gradual.
//
// Inline sites remanescentes (Onda 9): ContributionGraph (10), HeatmapWeekHour (3),
// charts/* (~15), Sidebar (6), OnboardingWizard (6), TokenEditor (2),
// PlanIndicator (4), DailyGoalBanner (2), outros isolados.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3002", "ws://localhost:5173"],
    },
  },
  crossOriginEmbedderPolicy: false, // permite mixed assets pra dev
}));

// SECURITY (Fase A A1): cookie-parser pra cookie httpOnly signed auth_token.
// Aplicado antes do CORS pra todos os handlers terem acesso a req.signedCookies.
// JWT_SECRET reused como signing secret (mesmo segredo de assinatura JWT,
// distinto do CSRF token).
app.use(cookieParser(env.JWT_SECRET));

// SECURITY (A2 P2-2 + Fase A A1): CORS origins via env (comma-separated).
// Default = dev pair. credentials:true exigido pra browser anexar cookie
// auth_token automático em fetch cross-origin (Vite dev 5173 → API 3002).
// allowedHeaders inclui X-CSRF-Token (Fase A) + X-Webhook-Token (collectors).
const allowedOrigins = (env.ALLOWED_ORIGINS ?? "http://localhost:3002,http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Webhook-Token", "X-CSRF-Token"],
  credentials: true,
}));
app.use(express.json({ limit: "16kb" }));

// SECURITY (Fase A A1): CSRF guard global montado ANTES dos routers.
// Skipa webhook (X-Webhook-Token), health, e auth públicas (login/register/
// forgot/reset/csrf-token). csurf internamente skipa GET/HEAD/OPTIONS, então
// requests safe passam sem validação mas o cookie _csrf é gerado se faltar.
// Detalhes do contrato + config em middleware/csrf.ts.
app.use((req, res, next) => {
  if (CSRF_SKIP_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }
  if (CSRF_SKIP_AUTH_PATHS.has(req.path)) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// BUG-03 fix: schema migrations now live in server/migrations/008-009.sql,
// applied via `npm run migrate`. Boot no longer ALTERs schema.

// Mount API routes (static imports — saves ~150-300ms cold start vs cold loop).
// authRouter monta /csrf-token internamente com csrfProtection aplicado direto
// (precisa gerar o cookie _csrf + retornar req.csrfToken() — não passa pelo
// guard global porque /api/auth/csrf-token está em CSRF_SKIP_AUTH_PATHS).
app.use("/api/auth", authRouter);
app.use("/api/webhook", webhookRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/import", importRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/system-prompts", systemPromptsRouter);
app.use("/api/skill-invocations", skillInvocationsRouter);
app.use("/api/skill-allowlist", skillAllowlistRouter);
app.use("/api/tool-invocations", toolInvocationsRouter);
app.use("/api/compactions", compactionsRouter);

// Health endpoint — sem /api prefix por convenção pra healthchecks externos
// (uptime monitors, docker healthcheck, k8s probes). Sem auth, sem rate limit.
app.use("/health", healthRouter);

// Serve static frontend in production
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Error handler
app.use(errorHandler);

// Password reset cleanup: drop tokens older than 7 days at startup + every 6h.
cleanupExpired()
  .then((n) => {
    if (n > 0) console.log(`[CLEANUP] dropped ${n} expired password reset tokens`);
  })
  .catch((err) => console.error("[CLEANUP] startup failed:", err));
setInterval(() => {
  cleanupExpired().catch((err) =>
    console.error("[CLEANUP] interval failed:", err),
  );
}, 6 * 60 * 60 * 1000);

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
