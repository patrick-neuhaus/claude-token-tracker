# Resoluções de erros · Claude Token Tracker

Histórico de ações fechadas. Cada entry: data, ação ID, problema breve, solução aplicada, arquivos tocados, validação. Sessões futuras leem este doc + `catalogo-erros.md` pra contexto completo.

---

## 2026-05-19 → 2026-05-20 · Ondas 0-9 · 101 fixes aplicados

### Visão geral histórica

App tinha 112 problemas identificados via trident audit por 5 áreas (Backend API, Backend Infra, Frontend, Coletores, Deploy). Resolvidos em 9 ondas paralelas com workers delegate-only.

**Categorias resolvidas:**

#### Segurança / autenticação (Onda 1 + 4)

- Webhook token rotacionado: `1a51c48f-***` → `51ba3cc4-***`. Hash SHA-256 no DB, plain só em `.env` (gitignored). Endpoint `/api/auth/rotate-webhook-token` criado.
- Rate limit: 5 tentativas/15min em auth (login/register/reset), 3/hora em forgot password, 120/min em webhook.
- Bootstrap super_admin via env var `BOOTSTRAP_SUPER_ADMIN_EMAIL` (`patrick.studioartemis@gmail.com`).
- Senha policy: min 12 chars + maiúscula + minúscula + dígito.
- PowerShell injection fix em `register-codex-token-collector-task.ps1`.
- Helmet aplicado (CSP + HSTS + 10+ headers).
- CORS via `env.ALLOWED_ORIGINS`.
- BCRYPT_COST env-configurable.
- `assignSession` IDOR cross-user fechado (UPDATE com EXISTS check).
- `webhook.cost_usd` ignorado (server computa). 
- `/forgot-password` throttle por email (max 3 tokens válidos/h por user).
- `recordPreCompact` valida project ownership.
- `renameSession` Zod cap (trim + 1-100 chars).
- Project race condition fix (INSERT ON CONFLICT atomic, migration 018).
- Migration 016: webhook_token_hash + UNIQUE.
- Migration 019: webhook_token plain UNIQUE.
- Advisory lock em authService.register + migrate.ts.

#### Data integrity (Onda 2 + 6)

- Migration 017: `idx_unique_token_entry` oficializado + INTEGER→BIGINT em 9 colunas + FK CASCADE em token_entries/sessions.
- Pricing fix: `gpt-5.5-pro.cache_read` $30 → $3 (era 10× errado).
- Hook Claude usa timestamp real do transcript (era `datetime.now()` que duplicava em reset state).
- Atomic write `.last_sent_line.json` via tempfile + os.replace.
- Cache Hit Rate fix codex: backend normaliza `input_tokens` descontando cache_read na inserção. Migration 020 backfilla histórico. Hit rate codex 48% → 84-94% (real).
- `total_tokens` math drift: codex usa payload.total, claude usa input+output (cache em colunas separadas).
- Migration 020: backfill codex input_tokens normalization.
- Migrations 001-006, 013, 014: idempotente (`IF NOT EXISTS`).

#### Reliability / autostart (Onda 3 + 4)

- Único trigger no "Claude Token Tracker" (era 2, causava dup spawn 3001/3002).
- `start-tracker.bat` healthcheck pós-spawn + lock file em %TEMP%.
- Bat refactored sem `setlocal EnableDelayedExpansion` (causava trava silenciosa) — subroutines via `call` + GOTO.
- `CodexTokenCollector` LogonType=S4U + StartWhenAvailable=True.
- `docker compose up -d --no-recreate` na bat (não recria container PG existente).
- pg Pool error handler + statement_timeout 30s + connection_timeout 5s + application_name.
- Email Brevo retry exponencial (1s/2s/4s, 3 tries) em 5xx/timeout/network.
- Docker postgres healthcheck via `pg_isready`.
- Log rotation scheduled task daily 03h (rota > 10MB).
- Migrations advisory lock 8675309.

#### Perf / UX (Onda 5 + 6 + 7 + 8)

- React.lazy em 15 pages (bundle inicial 957 KB → 509 KB gzip).
- Vite manualChunks (react-vendor, recharts, react-query, markdown).
- Fonts preload async (`media="print" onload="all"`).
- `noUncheckedIndexedAccess: true` ativado (48 erros TS fechados em 12 files — type safety completa).
- Import CSV cap 5000 rows + transação + batch INSERT 500.
- `getSessionEntries` LIMIT 1000 + offset + X-Total-Count.
- Dashboard `ILIKE %%` → `=` exact match (index hit).
- Analytics windows unificado (90d default).
- sessionsService subquery → JOIN.
- GlobalSearch stale closure fix (`const myIdx = flatIdx`).
- PricingDrawer não apaga user input em refetch (useRef isolation).
- AchievementNotifier `useNavigate()` em vez de `window.location.href`.
- WebhookInfo clipboard `.then().catch()` + cleanup timer.
- SkillCard/GlobalSearch URL `encodeURIComponent`.
- ContributionGraph parse local (fixa drift UTC→BRT).
- FOUC theme dark fix em index.html (sync script externalizado pra `theme-bootstrap.js`).
- BadgeCard inline `<style>` → `index.css` (0 JSX style tags em todo client/src).
- 6 SVG charts ganharam aria-label.
- TokenEditor `safeBtoa` Unicode-safe.
- StatCard `useCountUp` early return quando animate=false.
- LoginPage URL mode init via useState initializer (useEffect removido).
- Codex collector mtime cache (~140× speedup, 4.24s → 0.03s).
- Tampermonkey DEBUG flag (off por default).
- `TOKEN_TRACKER_LOG_DIR` env override.
- React lazy chunk-stale retry (`lazyWithRetry` em 14 routes — recupera de browser cache stale).
- Dead code badges.ts deletado (140 linhas).
- Hooks deps corrigidas (OnboardingWizard, StreakCounter, TopToolsDonut).
- setTimeout cleanup em refs (WebhookInfo, OnboardingWizard).
- Static imports em index.ts (eliminou loop `await import()` em bootstrap).

#### Manutenção / docs (Onda 6 + 7 + 9)

- `errorHandler` retorna errorId UUID + log correlacionado.
- `pricing.ts` source links (Anthropic + OpenAI).
- `.env.example` completo (DB_POOL_MAX, NODE_ENV, ALLOWED_ORIGINS, BCRYPT_COST, BOOTSTRAP_SUPER_ADMIN_EMAIL, etc).
- `RUNBOOK.md` criado (troubleshoot operacional).
- `uninstall.ps1` criado.
- ExecutionPolicy Bypass justification comment.
- `register-codex-...ps1` header doc + pre-flight check.
- skillsService regex `VALID_SKILL_NAME` hardening (rejeita `..`).
- docker-compose: network explicit, mem_limit 2g, shm_size 256mb, logging rotation, postgres tuning (shared_buffers, work_mem, log slow queries).
- Repo cleanup: deletado `audits/` (392K), `docs/` (276K), `PLAN.md`, `PLAN-B-SPEC.md`, `UX_AUDIT_SPEC.md`, logs stale, `token_log.jsonl` (924K), siblings órfãos (~181MB), 2 branches Claude stale, worktree skill-tracking (já mergeada, 46 commits atrás do master).

### Stats fechamento Ondas 0-9

- 102 fixes aplicados de 112 findings
- 8 P0 mitigados, 20 P1, 27 P2, 47 P3
- 20 migrations aplicadas
- Build clean TS strict++
- Bundle inicial 509 KB (era 957 KB)
- 56k+ token entries, 880 sessions, 2 users
- Server up estável (PID muda a cada restart, atual 16408 porta 3002)
- 0 worktrees stale, 1 worktree única (master)

### Pendências não-trident descobertas durante ondas

- Branches locais `redesign/motion-ds-audit` + `session/cla-1` — Patrick decide se deleta
- Sessão custosa 11/05 ($2820 num único session_id gpt-5.5/Codex, 20+ entries em 18h) — Patrick fechou ("lfechou"), não investigado

---

## Template pra novas entries

Quando uma ação do `catalogo-erros.md` for resolvida, adicionar abaixo seguindo este formato:

```markdown
## YYYY-MM-DD · Onda N · Ação ID

**Problema (resumo):** 1-2 frases.
**Solução aplicada:** descrição do fix.
**Arquivos tocados:** lista de paths.
**Migration nova (se houver):** número + nome.
**Validação:** comando + output esperado/recebido.
**Worker:** ID do worker que fez.
**Caveats / TODOs futuros:** notas.
```

---

## Próximas entries (placeholder)

_Aguardando Onda 10 = Fase A iniciar. Resoluções A1-A7 serão registradas aqui após conclusão._
