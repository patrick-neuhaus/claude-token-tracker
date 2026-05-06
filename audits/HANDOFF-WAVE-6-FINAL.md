# Handoff — Wave 6 final (próxima sessão pós-/compact)

> **Branch:** `redesign/motion-ds-audit`
> **Último commit:** `8e23acd` (Wave 6.4c MOCK_USER removed)
> **Estado:** Waves 0-6.8 ✅ done (exceto 6.6 Skills pendency + 6.7b StreakCounter pendency)

## Resumo executivo

Tracker (`claude-token-tracker`) virando free-tool isca pra Studio Artemis. Visual primeiro (Waves 0-6) ✅ done. Auth real ativo (MOCK_USER bypass removido Wave 6.4c). Pronto pra Wave 8+ deploy VPS F-NEW-5.

## Commits Wave 6 (sessão pós-/compact 2026-05-06)

```
8e23acd feat(auth): wave 6.4c — remove MOCK_USER bypass + restore real auth
aebc16a feat(ux): wave 6.8 — cleanup pages (rounded-xl + chart tokens)
3a36680 feat(ux): wave 6.7a — achievements motion polish + ConfettiBurst shared
bca544e feat(ux): wave 6.5 — FormField canonical + Settings refactor
3703332 feat(ux): wave 6.4b — OnboardingWizard CRIAR + Wave 8+ backlog
2fb2a75 feat(ux): wave 6.4a — LoginPage 50/50 split canonical
d3ae11a feat(ux): wave 6.3 — analytics lift KpiBox/DeltaBadge/tooltip canonical
5c61e29 docs: wave 6.2 done — master plan estado atual
38375db feat(ux): wave 6.2 — sessions lift AppTable canonical
```

## Estado atual master plan

Ver `audits/00-master-plan.md` §"Estado atual" pra tabela completa.

| Wave | Status |
|---|---|
| 0-6.1 | ✅ done (sessão anterior) |
| 6.2 Sessions | ✅ done — AppTable canonical |
| 6.3 Analytics | ✅ done — KpiBox MetricCard + tooltip tokens |
| 6.4a LoginPage | ✅ done — 50/50 split brand+form |
| 6.4b Onboarding | ✅ done — Wizard 5 steps + AppLayout trigger |
| 6.4c MOCK_USER | ✅ done — auth real restaurada |
| 6.5 Settings | ✅ done — FormField canonical refactor |
| 6.6 Skills | ⏸ **PENDENCY** — Patrick decidir modelo a/b/c antes de lift |
| 6.7a Achievements | ✅ done — BadgeCard motion + ConfettiBurst shared |
| 6.7b Streak | ⏸ **PENDENCY** — backend signal `streak.lost_pending` (não existe) |
| 6.8 Cleanup | ✅ done — rounded-xl + chart tokens |

## Credenciais Patrick (auth real)

- **Email:** `patrick.studioartemis@gmail.com`
- **Senha:** `artemis2026` (reset Wave 6.4c via bcrypt $2a$12 hash)
- **User ID:** `b42baf99-6731-45d3-b1e3-5481f1ec72cc`
- **Webhook token:** `1a51c48f-4892-4ce7-ac9f-793410593069`
- **Role:** `super_admin`

## Validação visual pendente (Patrick relatório)

Patrick vai validar tela por tela e reportar bugs. Checklist:

1. **LoginPage** `/login` — split 50/50 navy panel + form
2. **Dashboard** `/dashboard` — SummaryCards count-up + charts brand
3. **Sessions** `/sessions` — AppTable canonical sort+click+keyboard
4. **Session Detail** `/sessions/:id` — chart cores tokens + StatCards display
5. **Projects** `/projects` — grid+list rounded-xl + sparkline chart-1
6. **Project Detail** `/projects/:id` — table wrapper rounded-xl
7. **Entries** `/entries` — filter bar rounded-xl + bg-card
8. **Analytics** `/analytics` — KpiBox 28px + tooltip canonical
9. **Achievements** `/achievements` — BadgeCard ease-spring overshoot + TierProgressBar milestones
10. **Settings** `/settings` — FormField canonical + erro/helper
11. **OnboardingWizard** — só dispara com `entry_count === 0` + `localStorage.onboarding_completed !== "true"` (Patrick tem 256 sessions → não dispara natural)

Smoke checks: light/dark toggle, sidebar collapse 272↔68px, GlobalSearch Cmd+K, console errors zero.

## Próxima sessão — opções

### Opção A: Wave 8.0 — Deploy VPS Hostinger (F-NEW-5)

**Escopo:**
- Provisiona Docker Compose tracker em VPS Hostinger 72.60.152.11 (já existe, root SSH key)
- `pg_dump` local + `psql` restore pro VPS (migration 256 sessions Patrick)
- Express tsx server PORT=3002 + Vite build static
- Domain TBD (depende F-NEW-4 naming Artemis Tokenizer)
- HTTPS via Let's Encrypt (certbot ou Caddy)
- CI/CD: GitHub Action push → SSH deploy script

**Por quê agora:**
- Wave 6.4c MOCK_USER removido = pronto pra produção
- Validação demanda real (GitHub stars, Product Hunt) requer URL pública

**Risk:** infra setup pode dar bug específico (certbot config, DNS prop). 2-4h trabalho.

### Opção B: Wave 6.6 — Skills/SystemPrompts

**Escopo:** lift /skills + /system-prompts pages canonical.

**Bloqueador:** Patrick precisa decidir modelo a/b/c antes (qual UX skills page deve seguir — pendency S2). Sem decisão, lift gera retrabalho.

### Opção C: Wave 6.7b — StreakCounter + StreakLostScreen

**Escopo:** CRIAR StreakCounter big visual hero + StreakLostScreen overlay recovery.

**Bloqueador:** backend signal `streak.lost_pending` não existe. Frontend mock state OR backend feature add (tabela `streak_breaks` + endpoint).

### Opção D: Validação visual + bugs reportados Patrick

Patrick volta com relatório → fix bugs reportados. Wave dedicada apenas se bugs críticos. Menores → backlog.

### Opção E: F-NEW-4 — Naming overhaul (Artemis Tokenizer)

**Escopo:**
- Rename repo `claude-token-tracker` → `artemis-tokenizer` via `gh repo rename`
- Update package.json, branding strings (sidebar lockup, page title, README)
- Tagline "Plausible for any LLM. By Artemis."

**Por quê:** Wave 8.0 deploy precisa domain final → name escolhido antes do DNS.

**Risk:** baixo (rename é straightforward + GitHub redirect 301 auto). 30min trabalho.

## Recomendação técnica

Sequência: **D primeiro** (Patrick valida + reporta) → **E** (naming antes deploy) → **A** (deploy VPS).

Ordenar D antes de A evita debug em produção.

## Inputs e refs práticos

- **Master plan:** `audits/00-master-plan.md` §"Estado atual" + §"Backlog Wave 8+"
- **Backlog F-NEW-5/6/7/8:** `audits/00-master-plan.md` §"Backlog Wave futura"
- **Tokens canonical:** `client/src/index.css` (600+ linhas)
- **Surface helpers:** `client/src/lib/surface.ts`
- **Iron Laws:** edits SKILL.md/CLAUDE.md → prompt-engineer --validate (IL-1 hook V2 bloqueia). Edits .tsx/CSS livre.

## Dev environment

- **Preview server:** `token-tracker-anti-ai-ds` porta **3333** via `.claude/launch.json` global
- **Backend tsx:** `npm run dev -w server` porta **3002** (`.env` PORT)
- **Docker postgres:** `claude-token-tracker-db` (Up 6+ days)
  - User: `tracker` / Pass: `tracker_dev` / DB: `claude_token_tracker`
- **JWT_SECRET:** `ctt-local-secret-change-me-2026-03-28-random` (em `.env` root)
- **Auth:** real auth ativo (Wave 6.4c). Login via `/login` page com credentials acima.
- **Bug conhecido:** preview_screenshot timeout (Vite HMR busy). Workaround `preview_snapshot`.

## Maestro V2 routing recomendação

Próxima sessão, qualquer wave > 1 skill → invoca `maestro V2 --full` ANTES.

Wave 8.0 (deploy VPS) seria chain:
1. `vps-infra-audit` (validar VPS atual + Docker setup)
2. `supabase-db-architect` (migration data local→VPS strategy)
3. `executor` (implementação compose + nginx + SSL)

## Anti-patterns evitar

- Pular validação visual Patrick → debt acumulado
- Deploy VPS com MOCK_USER ainda ativo (resolved Wave 6.4c)
- Naming overhaul DEPOIS do deploy (DNS lock-in com nome ruim)
- Multi-tenant antes de validar demanda single-instance
