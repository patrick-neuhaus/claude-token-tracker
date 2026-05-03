# PLAN B — Spec consolidado pós Plan A audits

> Gerado por SDD Phase 2 em 2026-04-30. Consome 9 audits em `docs/audits/`.
> **Não implementar sem aprovação Patrick.** Spec só, código zero.
> Convenções: file paths absolutos quando críticos. Cada task em wave é fazível em 30min–2h. Ordem de waves importa.

---

## Contexto

9 audits (DS, UX, react-patterns, motion, arch-guard, dedup-scan, component-arch, ds-tokens, trident review) geraram **115 findings consolidados** após dedup cross-skill. Distribuição: **4 P0** (security + correctness + WCAG), **9 P1** (arquitetura + a11y crítica + bugs altos), **~40 P2** (drift + refactors + perf), **~62 P3** (polimento + dead code + cosmético).

Spec organiza em **8 waves (B0–B7)** que devem ser executadas em ordem por dependência: **security → correctness → tokens base → componentes shared → refactors → arquitetura → UX polish → cleanup**. Estimativa total: **18–22h** divididas em 6–8 sessões de 2–3h.

**Cross-skill dedups críticos:**
- UX F-08 ("retry inconsistente") = dedup-scan #1 (5 cópias ErrorState) = component-arch 3.1 — UM mesmo problema, único reporter conta (component-arch ganha por ter spec mais completo).
- UX F-15 (h1 ausente) + DS Δ9 (subtitle ausente) + dedup-scan #3 (PageHeader pattern) + component-arch 3.3 — todos resolvidos por `<PageHeader>`.
- UX F-01 (focus-visible chips) + component-arch 3.7 (FilterChip) — `<FilterChip>` já inclui focus-visible no spec.
- UX F-02 (rows kbd) + component-arch 3.5 (ClickableRow) — `<ClickableRow>` resolve.
- UX F-07 (limite 3 silencioso) + component-arch 3.7 — `disabled` prop em FilterChip.
- UX F-11 (toggle inconsistente) + component-arch 3.8 (ViewModeToggle) — resolvido.
- DS Δ1-3 (WCAG 3 tokens) = ds-tokens Section 4 — fix vem do report 08 (HSL específico).
- arch-guard V001 (achievements 3 cópias) + react-patterns P2.8 (notified.current bug) + react-patterns P1.2 (effect sync) — agrupar Wave B4 (mover catalog pro server resolve V001 + simplifica P2.8; P1.2 fica em Wave B3).
- trident BUG-04 (ALTER inline) + arch-guard V005 (migrations no boot) — UM mesmo problema, agrupado em Wave B4.
- trident BUG-13 (PII log) + BUG-12 (err.message log) — agrupar.

**Conflitos identificados (Patrick decide):**

| # | Conflito | Reporter A | Reporter B | Decisão Patrick |
|---|----------|------------|------------|-----------------|
| C1 | `<table>` HTML cru — DS Δ6 diz "migrar pra shadcn Table" mas DS Δ16 diz "padrão denso grid CSS é o north star" | DS Δ6 (P2 apply) | DS Δ16 (P2 skip — Wave futura) | **DECIDIDO (Patrick 2026-05-03):** portar `AppTable` do `anti-ai-design-system/presets/_shared/AppTable.tsx` (referência canônica do DS). Substitui ambas opções (NÃO shadcn cru, NÃO grid CSS denso). Wave B6 ou B5. |
| C2 | `--success` token: ds-tokens Section 4 propõe DOIS tokens (`--success` solid + `--success-display` separado pra text-on-dark); DS Δ2 propõe UM token escurecido | ds-tokens Section 4.2 | DS Δ2 | **DECIDIDO (Patrick 2026-05-03):** Opção B — 2 tokens (`--success` + `--success-display`, idem `--info`). Aplica em Wave B0.4 (3 WCAG). |
| C3 | Sidebar header re-organização (DS Δ4+5 quer eliminar header main e mover search pra sidebar) vs UX que não recomenda | DS Δ4+5 (P1 apply) | UX silencioso | **DECIDIDO (Patrick 2026-05-03):** aplicar — deletar main header, search vai pra sidebar. Wave B5. |
| C4 | Status variant tokens (`--status-*`) — ds-tokens Section 5.5 marca CONDICIONAL (só se criar StatusBadge) | ds-tokens 5.5 | component-arch não propõe StatusBadge | **DECIDIDO (Patrick 2026-05-03):** só quando tiver componente que consome — NOT NOW. |
| C5 | `analytics/Achievements.tsx` (265 LOC) — component-arch 1.3 sugere "DEAD CODE candidate" mas precisa verificação | component-arch A13 | grep zero importadores ✅ confirmado | **DECIDIDO (Patrick 2026-05-03):** ⚠️ **NÃO DELETAR** — diff B0.5 achou **13 badges órfãs** só nesse file (cache-80, calls-1000/5000/10000, cost-1000/5000/10000/25000/50000, marathon, megalodon, ultra-marathon, whale). Wave B7 revisada: PRIMEIRO mergear 13 badges em `AchievementsPage.tsx`, validar contagem total, ENTÃO deletar. Sem merge antes = perde conquistas. |
| C6 | `setInterval` em BudgetAlert vs `visibilitychange` (react-patterns P2.1) vs UX F-05 (mais ampla) | react-patterns P2.1 | UX F-05 | **DECIDIDO (Patrick 2026-05-03):** mini-bar inline (UX F-05). Wave B5. |

---

## Critical bugs (P0 — fix BEFORE qualquer outra coisa)

> Wave B0 inteira. 4 bugs. Estimativa 3h.

### BUG-01 — JWT_SECRET aceita placeholder (security, full auth bypass)

- **ID:** BUG-01
- **Source:** trident BUG-01
- **File:line:** `server/src/config/env.ts:9-21` + `.env.example:6`
- **Evidence:** `env.ts` só checa `if (!env[key])`. `.env.example` ship `JWT_SECRET=change-me-to-a-random-string-at-least-32-chars` que satisfaz check. Atacante com acesso ao repo (público) pode forjar token `super_admin` se Patrick deployar sem trocar.
- **Fix proposed:**
  ```ts
  // env.ts após check de presença
  if (env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be ≥32 chars");
  if (env.JWT_SECRET === "change-me-to-a-random-string-at-least-32-chars") {
    console.error("FATAL: JWT_SECRET still has placeholder value"); process.exit(1);
  }
  ```
- **Critério aceite:** rodar server com `.env.example` literal → server crasha com mensagem clara. Rodar com secret válido (≥32 chars, custom) → boot OK. Test manual: `npm run dev` + verificar log.
- **Time:** 30min

### BUG-02 — cache_savings_usd math errada (correctness, ~3× over-reports Opus)

- **ID:** BUG-02
- **Source:** trident BUG-03
- **File:line:** `server/src/services/dashboardService.ts:47-51` + `server/src/services/analyticsService.ts:179-183`
- **Evidence:** SQL CASE usa deltas legacy (`13.5` Opus = $15-$1.5 do Opus 3/4.0/4.1; `0.72` Haiku = Haiku 3.5 legacy; `2.7` Sonnet = só esse correto). Pricing atual em `pricing.ts:34-49`: Opus 4.5+ é $5/$0.5 → delta correto = `4.5`. Haiku 4.5 é $1/$0.1 → delta = `0.9`. Resultado: dashboard mostra savings 3× inflado pra Opus, ~20% sub-reportado pra Haiku.
- **Fix proposed:** extrair `cacheSavingsDelta(model: string): number` em `server/src/utils/cacheSavings.ts` que importa `PRICING` de `pricing.ts` e retorna `pricing.input - pricing.cache_read`. Refatorar SQL pra usar `LEFT JOIN (VALUES ...)` com a tabela construída em runtime, OU mover o cálculo pra JS pós-query (recomendado, mais simples). Aplicar nos 2 sites.
- **Critério aceite:** computar manualmente savings em sessão Opus 4.7 conhecida e comparar com dashboard antes/depois. Diferença esperada: 3×. Test: query `SELECT SUM(cache_read) FROM entries WHERE model ILIKE 'opus%'` × 4.5/1e6 deve = novo `cache_savings_usd`.
- **Time:** 1h

### BUG-03 — ALTER TABLE inline em index.ts bypassa migration tracking

- **ID:** BUG-03
- **Source:** trident BUG-04 + arch-guard V005 (mesmo problema)
- **File:line:** `server/src/index.ts:14-27`
- **Evidence:** `await pool.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_budget_usd ...")` rodando no boot top-level. `package.json:11` tem `npm run migrate` separado mas índice não chama. Drop+recreate DB → ALTER throws (table não existe) → server não boota. Schema drift entre dev/prod.
- **Fix proposed:**
  1. Criar `server/migrations/008_add_budget_columns.sql` + `009_add_session_name.sql` com o conteúdo dos ALTERs.
  2. Remover bloco `index.ts:14-27` inteiro.
  3. Garantir `npm run migrate` rode antes de `npm start` (documentar no README + adicionar check em healthcheck OU extrair pra `setup-autostart-v2.ps1`).
- **Critério aceite:** `npm run migrate` aplica novas migrations idempotentes. Server boota sem rodar ALTERs. `migrations` table contém entries 008 e 009.
- **Time:** 45min

### BUG-04 — `--destructive` / `--success` / `--info` falham WCAG AA solid

- **ID:** BUG-04 (cluster de 3 fixes)
- **Source:** DS Δ1+Δ2+Δ3 + ds-tokens Section 4
- **File:line:** `client/src/index.css` linhas 153-159 (block `.dark`)
- **Evidence:** ratios computados (DS audit Section 4.5):
  - `--destructive: 0 70% 50%` + white = 3.99:1 (precisa 4.5)
  - `--success: 152 60% 50%` + white = 3.4:1
  - `--info: 217 85% 60%` + white = 3.6:1
- **Fix proposed:** aplicar overrides Section 5.1 do report 08 (HSL específico):
  ```css
  /* dark block, linha 153 */
  --destructive: hsl(0 70% 42%);                 /* 5.04:1 ✅ */
  --destructive-foreground: hsl(0 0% 100%);

  /* linha 155 */
  --success: hsl(152 70% 32%);                   /* 5.51:1 ✅ vs white */
  --success-foreground: hsl(0 0% 100%);
  --success-display: hsl(152 60% 55%);           /* novo: text-on-dark, 5.6:1 vs card */

  /* linha 159 */
  --info: hsl(217 80% 50%);                      /* 5.07:1 ✅ vs white */
  --info-foreground: hsl(0 0% 100%);
  --info-display: hsl(217 85% 65%);              /* novo: text-on-dark */
  ```
  Adicionar em `@theme inline` block (após `--color-info-foreground`):
  ```css
  --color-success-display: var(--success-display);
  --color-info-display: var(--info-display);
  ```
- **Critério aceite:**
  - Contrast checker (Chrome DevTools) em `Sidebar.tsx:48-58` (PlanCountdown success pill) → ≥4.5:1.
  - Botão Toaster destructive variant (forçar via `toast.error`) → ratio ≥4.5:1.
  - SkillsPage source filter chip ativo (`bg-info/15 text-info-display`) → ≥4.5:1.
  - Light mode (login page) inalterado.
- **Time:** 45min (5min CSS + 40min validação cross-pages)

---

## Waves de execução

### Wave B0 — P0 fixes (security + correctness + WCAG base)

> **Estimativa: 3h.** Bloqueante. Não inverter ordem com waves seguintes.

Tasks:

1. **B0.1** Fix BUG-01 (JWT_SECRET validation em `env.ts`). Atomic. 30min.
2. **B0.2** Fix BUG-02 (cache_savings_usd math). Criar `server/src/utils/cacheSavings.ts`, refatorar 2 sites em services. 1h.
3. **B0.3** Fix BUG-03 (migrations). Criar `migrations/008_*.sql` + `009_*.sql`. Remover bloco em `index.ts`. Atualizar README + autostart script. 45min.
4. **B0.4** Fix BUG-04 (3 WCAG tokens). Editar `client/src/index.css` per ds-tokens 5.1. Validar via DevTools. 45min.

**Critério aceite global B0:**
- [ ] Server boota com `.env` válido, falha com `.env.example` literal
- [ ] Dashboard `cache_savings_usd` matches manual calculation
- [ ] DB fresh + `npm run migrate` + boot sem ALTERs inline
- [ ] 3 tokens WCAG passam ≥4.5:1 em DevTools

---

### Wave B1 — Tokens + Motion gate (foundation pra resto)

> **Estimativa: 1.5h.** Sem isso, Wave B2 cria componentes que ignoram `prefers-reduced-motion` (regressão a11y).

Tasks:

1. **B1.1** Adicionar motion tokens + reduced-motion gate global em `client/src/index.css` (após `@theme inline` block). Conteúdo exato em ds-tokens Section 3.1. ~31 linhas. 30min.
2. **B1.2** Adicionar `--success-display` e `--info-display` em `@theme inline` (já feito em B0.4 — verificar). 5min.
3. **B1.3** Refatorar `Skeleton` (`client/src/components/ui/skeleton.tsx`) — manter `animate-pulse` (gate global cobre). Adicionar `data-slot="skeleton"` se ainda não tem (gate global referencia esse seletor). 10min.
4. **B1.4** Fix motion item 2 (PlanIndicator) — `client/src/components/dashboard/PlanIndicator.tsx:91` trocar `transition-all duration-1000 ease-out` por `transition-[width] duration-300 ease-out`. 5min.
5. **B1.5** Fix motion items 4-6 (`transition-all` → props específicas):
   - `client/src/components/ui/badge.tsx:8` → `transition-colors`
   - `client/src/components/ui/button.tsx:7` → `transition-[color,background-color,border-color,transform,box-shadow]` (split — preserva translate em :active)
   - `client/src/components/settings/CsvImport.tsx:153` → `transition-colors`
   15min.
6. **B1.6** Fix motion item 3 (Achievements hover:scale) — `client/src/components/analytics/Achievements.tsx:229` + `client/src/pages/AchievementsPage.tsx:243-245` trocar `transition-all hover:scale-[1.02]` por `transition-colors hover:bg-card/80`. 10min.
7. **B1.7** Refatorar `client/src/lib/constants.ts:3-6` — `CHART_COLORS` usar `hsl(var(--chart-N))` per ds-tokens 3.4. Documentar `MODEL_COLORS` como exception (Anthropic-branded). 15min.
8. **B1.8** Adicionar text recipes em `client/src/lib/surface.ts` — `textH2, textSubtitle, textKpi, textCaption` per ds-tokens 3.3. 10min.

**Critério aceite global B1:**
- [ ] DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` → Skeleton vira cor estável, Achievements hover não escala, modals abrem instant
- [ ] PlanIndicator anima em ~300ms (não 1s)
- [ ] Charts no Dashboard usam tokens (consistency com index.css)

---

### Wave B2 — Component extractions (eficient order, low → high blast radius)

> **Estimativa: 4h.** Resolve dedup-scan + UX F-01/F-02/F-07/F-08/F-11. Ordem importa: extrair primeiro reduz blast radius dos próximos.

Tasks (ordem rígida):

1. **B2.1 `<ErrorState>`** — criar `client/src/components/shared/ErrorState.tsx`. Spec exato em component-arch 3.1. Migrar 7 call sites:
   - `client/src/pages/SkillsPage.tsx:135-146`
   - `client/src/pages/SkillDetailPage.tsx:40-49`
   - `client/src/pages/SystemPromptsPage.tsx:84-92`
   - `client/src/pages/SystemPromptDetailPage.tsx:24-33`
   - `client/src/pages/DashboardPage.tsx:56-66`
   - `client/src/pages/SessionDetailPage.tsx:65` (corrige misuse de EmptyState)
   - `client/src/pages/SessionTimePage.tsx:250` (mesmo)
   - **Resolve:** UX F-08 + dedup #1 + 2 misuses semantic
   - 45min.

2. **B2.2 `<SortableTableHeader<TCol>>`** — criar `client/src/components/shared/SortableTableHeader.tsx`. Spec component-arch 3.2. Migrar 3 call sites:
   - `client/src/pages/SkillsPage.tsx:105-123`
   - `client/src/pages/SystemPromptsPage.tsx:54-72`
   - `client/src/components/sessions/SessionsTable.tsx:31-56`
   - 30min.

3. **B2.3 `<SkeletonGrid>` + `<SkeletonRows>`** — criar `client/src/components/shared/SkeletonGrid.tsx`. Spec component-arch 3.6. Migrar 10 call sites:
   - DashboardPage, SessionsPage, SessionTimePage, SessionDetailPage, ProjectDetailPage, AnalyticsPage, AchievementsPage, EntriesPage, AdminPage, ProjectsPage
   - 45min.

4. **B2.4 `<MarkdownDocPanel>`** — criar `client/src/components/shared/MarkdownDocPanel.tsx`. Trivial. 2 call sites:
   - `client/src/pages/SkillDetailPage.tsx:104-108`
   - `client/src/pages/SystemPromptDetailPage.tsx:64-66`
   - 15min.

5. **B2.5 `<FilterChip>` + `<FilterChipGroup<T>>`** — criar `client/src/components/shared/FilterChip.tsx`. Spec component-arch 3.7 (focus-visible inline + disabled aria + variant `info|warning|primary`). Migrar 6 call sites:
   - `client/src/pages/SkillsPage.tsx:182-192,198-209,216-228`
   - `client/src/pages/AnalyticsPage.tsx:124-137` (com `disabled={selected.length===3 && !selected.includes(p.id)}` resolve UX F-07)
   - `client/src/pages/SessionTimePage.tsx:217-232`
   - **Resolve:** UX F-01 (chips) + UX F-07 + dedup #5
   - 45min.

6. **B2.6 `<ViewModeToggle<T>>`** — criar `client/src/components/shared/ViewModeToggle.tsx`. Spec component-arch 3.8. Migrar 3 call sites:
   - SkillDetailPage, SystemPromptDetailPage, ProjectsPage Grid/List
   - **Resolve:** UX F-11 + dedup #12
   - 30min.

7. **B2.7 `<ClickableRow>`** — criar `client/src/components/shared/ClickableRow.tsx`. Spec component-arch 3.5 (discriminated mode `link` vs `button`). Migrar 3 sites com `<div onClick>` → `<Link>`:
   - `client/src/components/sessions/SessionsTable.tsx:88-122`
   - `client/src/pages/ProjectsPage.tsx:136-170` (refator de `<button>`)
   - **Caveat:** `<TableRow onClick>` em `ProjectDetailPage:415-447` e `ProjectsPage:190-218` (list view) — manter como está em B2 (precisa migrar pra grid CSS — Wave futura ou não migrar). Adicionar `tabIndex={0} role="link" onKeyDown={handleEnterSpace}` como mitigação intermediária a11y se Patrick aprovar.
   - **Resolve:** UX F-02 + parte F-01
   - 45min.

8. **B2.8 `<PageHeader>`** — criar `client/src/components/shared/PageHeader.tsx`. Spec component-arch 3.3 (promove h2 → h1 — resolve UX F-15). Migrar 11 pages:
   - SkillsPage, SystemPromptsPage, DashboardPage, EntriesPage, SessionsPage, SessionTimePage, ProjectsPage, SettingsPage, AchievementsPage, AdminPage, AnalyticsPage
   - Adicionar subtitle informacional onde DS Δ9 pediu (Dashboard "Mês: X · Y sessões", Sessões "X sessões · $Y", etc.) — pode ser feito incrementalmente call-by-call.
   - **Resolve:** dedup #3 + DS Δ9 + UX F-15
   - 45min.

9. **B2.9 `<DetailHeader>`** — criar `client/src/components/shared/DetailHeader.tsx`. Spec component-arch 3.4. Migrar 2 pages:
   - SkillDetailPage, SystemPromptDetailPage
   - 30min.

**Critério aceite global B2:**
- [ ] Build passa (server tsc + client vite)
- [ ] Cada page migrada renderiza visualmente igual ou melhor
- [ ] Tab navigation em SkillsPage chips, ViewModeToggle, ClickableRow → ring visível em dark
- [ ] axe DevTools não reporta 2.4.7 em SkillsPage/SystemPromptsPage/SessionsTable
- [ ] Cada page tem 1 `<h1>` (PageHeader resolve)

---

### Wave B3 — Refactors monolíticos

> **Estimativa: 3h.** Depende de Wave B2 (usa shared components). Não fazer em paralelo com B2 (mesmos files).

Tasks:

1. **B3.1 `pages/AnalyticsPage.tsx` (459 → ~140 LOC)** — spec component-arch 4.1:
   - Extrair `components/analytics/DeltaBadge.tsx` (já inline na linha 27)
   - Extrair `components/analytics/KpiBox.tsx` OU consolidar com StatCard adicionando prop `suffix`
   - Extrair `components/analytics/ProjectComparison.tsx` (linhas 81-194)
   - Extrair `components/analytics/HeatmapWeekHour.tsx` (heatmap manual 335-364)
   - Extrair `components/analytics/PeriodComparisonGrid.tsx` (3 cards mês×mês)
   - Extrair `components/analytics/StreaksKpiGrid.tsx` (3 KpiBox)
   - Fix react-patterns P1.3 inline: `key={s.session_id}` em vez de `key={i}` na linha 447
   - 1h.

2. **B3.2 `pages/ProjectDetailPage.tsx` (519 → ~170 LOC)** — spec component-arch 4.2:
   - Extrair `components/projects/ProjectHeaderEditable.tsx` (inline edit name/desc)
   - Extrair `components/shared/InlineEditableText.tsx` (atom reusable)
   - Extrair `components/charts/ModelPieChart.tsx` (ZERO-DIFF entre ProjectDetailPage:344-362 e SessionDetailPage:201-225 — extract once, reuse 2x)
   - Extrair `components/charts/DailyCostAreaChart.tsx`
   - Extrair `components/projects/AddSessionDialog.tsx`
   - Fix react-patterns P1.2: 2 `useEffect` sync state (linhas 88-98) → usar `key={project.id}` no Input ou inline computation
   - 1h.

3. **B3.3 `pages/SessionTimePage.tsx` (372 → ~170 LOC)** — spec component-arch 4.3:
   - Extrair `components/sessions/SessionTimeFilters.tsx` (date + gap slider + presets — usa FilterChip do B2.5)
   - Extrair `components/sessions/GapSlider.tsx`
   - Extrair `components/sessions/SessionTimeScatterChart.tsx`
   - Mover helpers (`formatDuration`, `dayStartIso`) pra `lib/timeFormatters.ts`
   - 30min.

4. **B3.4 `pages/AchievementsPage.tsx` (275 → ~80 LOC)** — spec component-arch 4.4:
   - **DEPENDS ON Wave B4 V001** (achievement catalog server-side). Se B4 já fez, page só renderiza data do server. Se ainda não, refactor parcial: extrair `BADGE_DEFINITIONS` pra `client/src/lib/badges.ts` como passo intermediário.
   - Extrair `components/achievements/TierProgressBar.tsx`
   - Extrair `components/achievements/BadgeCategorySection.tsx`
   - Extrair `components/achievements/BadgeCard.tsx`
   - Documentar TIER_STYLES como intentional warm exception (DS Δ15)
   - 30min.

5. **B3.5 `components/sessions/SessionsTable.tsx` (127 → ~70 LOC)** — spec component-arch 4.5:
   - Boundary fix: receber `onRowClick` + `onRename` via props em vez de `useNavigate` + `useRenameSession` inline
   - Usar `<SortableTableHeader>` (B2.2) e `<ClickableRow>` (B2.7)
   - Fix react-patterns P1.4 inline closure: estabilizar handler via `useCallback` em SessionsPage parent
   - SessionsPage debounce search input 250ms (também resolve P2.1 via causa raiz)
   - 30min.

**Critério aceite global B3:**
- [ ] AnalyticsPage abre e mostra os mesmos charts/sections
- [ ] ProjectDetailPage edita nome inline funciona
- [ ] SessionTimePage scatter renderiza
- [ ] AchievementsPage mostra mesmas conquistas
- [ ] SessionsTable hot path: digitar no search lag < 100ms (debounce + boundary fix)

---

### Wave B4 — Architecture cleanup

> **Estimativa: 3h.** Resolve P0/P1 arch-guard.

Tasks:

1. **B4.1 V001 — Achievement catalog server-side (P0 arch-guard)**:
   - Criar `server/src/services/achievementsService.ts` com BADGE_DEFINITIONS (consolidar 70 do AchievementsPage + verificar drift com Achievements.tsx que vai morrer em B7)
   - Criar `server/src/routes/achievements.ts` com `GET /api/achievements` retornando `{ unlocked: [{id, label, tier, icon, progress, target}], totalUnlocked, byTier }`
   - Mount em `index.ts` (`app.use("/api/achievements", authMiddleware, achievementsRoutes)`)
   - Criar `client/src/hooks/useAchievements.ts` (React Query)
   - AchievementsPage e AchievementNotifier consomem hook em vez de computeBadges local
   - Resolve V001 + V003 (cache_hit_rate fica server side se moveu daí também) + V015 + react-patterns P2.8 (notified.current fica obsoleto — server marca seen via endpoint dedicated)
   - 1.5h

2. **B4.2 V008 — Hardcoded paths → env vars (P1 arch-guard)**:
   - Criar `server/src/config/env.ts` exports `SKILLFORGE_DIR, OMC_DIR, BUILTIN_CACHE, FIXES_FILE` com defaults razoáveis + `.env.example` documentado
   - Refatorar `skillsService.ts:5-8` e `systemPromptsService.ts:21-53`
   - 30min

3. **B4.3 V004 — Service layer extraction (P1 arch-guard)**:
   - Criar `server/src/services/sessionsService.ts` com `listSessions, getSessionDetail, getSessionEntries, renameSession`
   - Criar `server/src/services/entriesService.ts` com `listEntries, exportCsv`
   - Refatorar `routes/sessions.ts` e `routes/entries.ts` pra delegate
   - Mover super_admin check de `routes/admin.ts:23-31` pra `usersService` (criar) ou `settingsService`
   - 1h

4. **B4.4 V006 + V007 — Utils extraction (P1 arch-guard)**:
   - Criar `server/src/utils/filterBuilders.ts` exports `buildEntryFilters, buildSessionFilters` (resolve dedup-scan #6 transversal A6)
   - Criar `server/src/utils/csvExporter.ts` exports `serializeEntriesToCsv`
   - 30min

**Critério aceite global B4:**
- [ ] Achievements page idêntica ao antes (server retorna mesmo data)
- [ ] AchievementNotifier dispara toast em conquista nova durante session (corrige notified.current bug)
- [ ] Server roda em outra máquina trocando só `.env` (paths não-Patrick)
- [ ] `routes/sessions.ts` e `routes/entries.ts` < 80 linhas cada (delegando pra services)
- [ ] CSV export endpoint funciona idêntico

---

### Wave B5 — UX polish

> **Estimativa: 2h.** Findings UX não cobertos pelas waves anteriores.

Tasks:

1. **B5.1 F-04 — Empty state diferenciar noData vs noResults**:
   - Editar `pages/SessionsPage.tsx:135`, `pages/EntriesPage.tsx:135`, `pages/ProjectsPage.tsx`, `pages/SkillsPage.tsx`, `pages/SystemPromptsPage.tsx`
   - Quando `hasActiveFilters && data?.entries.length === 0` → mostrar `<EmptyState message="Nenhuma sessão com esses filtros" action={<Button onClick={clearFilters}>Limpar filtros</Button>} />`
   - Histórico vazio → CTA settings
   - 45min

2. **B5.2 F-05 — Mini-bar inline pra daily budget no Dashboard**:
   - Editar `components/dashboard/SummaryCards.tsx` adicionar `<DailyBudgetProgress />` inline quando `dailyBudgetUsd` setado
   - `BudgetAlert.tsx` continua mostrando só ≥80%
   - Trocar `setInterval` por `visibilitychange` listener (resolve react-patterns P2.1)
   - 30min

3. **B5.3 F-06 — Error suggestion + aria-invalid em forms**:
   - Editar `components/settings/SettingsForm.tsx`:
     - `onError: (err) => toast.error(err?.message || "Erro ao salvar")`
     - Validação inline antes submit (HTML5 `min/max/step` + state local de erros)
     - `aria-invalid="true"` em inputs com erro
   - Editar `components/sessions/SessionNameEditor.tsx` mesmo pattern
   - Aplicar em outras mutations (ProjectsPage Dialog, etc.)
   - **Resolve UX F-06 + arch-guard V013 (validation parcial — schema compartilhado fica out-of-scope)**
   - 30min

4. **B5.4 F-09 — `?` shortcut overlay**:
   - Criar `components/ShortcutsOverlay.tsx` com Dialog listando Cmd+K, Esc, ↑↓, etc.
   - Adicionar listener em `AppLayout.tsx` pra `?` ou `Shift+/`
   - 15min

5. **B5.5 F-10 — Botão Copiar em SystemPromptDetail + SkillDetail**:
   - Adicionar `<Button variant="ghost" onClick={() => navigator.clipboard.writeText(content)}><Copy/></Button>` ao lado de ViewModeToggle
   - Toast "Copiado"
   - aria-label "Copiar conteúdo"
   - 15min

6. **B5.6 F-12 — GlobalSearch top em mobile**:
   - Editar `components/search/GlobalSearch.tsx:160` — `top-[20%]` → `top-4 sm:top-[20%]`
   - 5min

7. **B5.7 F-13 — Tooltip Cache R/W keyboard**:
   - Editar `components/entries/EntriesTable.tsx:43-52` — wrapping `<TooltipTrigger asChild><button type="button">Cache R</button></TooltipTrigger>`
   - 10min

8. **B5.8 F-14 — Typo "este mes" → "este mês"**:
   - Editar `components/dashboard/MonthNarrative.tsx:45,47`
   - 2min

9. **B5.9 BUG-14 (trident) — "aplicacao" → "aplicação"**:
   - Editar `components/ErrorBoundary.tsx:20`
   - 1min

10. **B5.10 Dashboard subtitles informacionais (DS Δ9 não cobertos em B2.8)**:
   - Adicionar subtitles concretos em PageHeader callsites (Dashboard "Mês: X · Y sessões", Sessões "X sessões · $Y no período", etc.)
   - 15min

**Critério aceite global B5:**
- [ ] Filtrar SessionsPage até zerar → mensagem com "Limpar filtros"
- [ ] Dashboard mostra mini-bar daily budget sempre que setado
- [ ] Submeter Settings com hour=25 → input `aria-invalid="true"` + erro inline
- [ ] `?` abre overlay shortcuts
- [ ] Copy button funciona em SystemPromptDetail + toast
- [ ] axe não reporta 3.3.3 ou 2.4.7

---

### Wave B6 — Anti-patterns transversais (server + client)

> **Estimativa: 2h.** Quick wins arquiteturais.

Tasks:

1. **B6.1 asyncHandler middleware (dedup-scan #11 + transversal A6)**:
   - Criar `server/src/utils/asyncHandler.ts`
   - Refatorar 5 routes em `skills.ts:17-20,32-35,52-55` + `systemPrompts.ts:12-15,26-29` pra usar wrapper
   - Validar que `errorHandler.ts` mounted em `index.ts` (V010 partial)
   - 30min

2. **B6.2 Cache TTL pattern dedup (dedup-scan #13)**:
   - Criar `server/src/utils/ttlCache.ts` exports `createTTLCache<T>` (versão simpler — só `isFresh(ts, ttl)`)
   - Refatorar `skillsService.ts:44-48` e `systemPromptsService.ts:75-78`
   - 20min

3. **B6.3 SOURCE_COLOR (skill) dedup (dedup-scan #9)**:
   - Mover `SOURCE_COLOR` de `SkillsPage.tsx:18-22` e `SkillDetailPage.tsx:13-17` pra `client/src/lib/skillColors.ts` (novo)
   - Renomear pra `SKILL_SOURCE_BADGE_CLS` (evita colisão com `SOURCE_COLORS` em constants.ts)
   - 15min

4. **B6.4 formatDate shadow (dedup-scan #10 + A5)**:
   - Adicionar `formatBytes(b: number): string` em `client/src/lib/formatters.ts`
   - Estender `formatDate` em `lib/formatters.ts` pra aceitar `string | null`
   - Remover declarações locais em `SystemPromptsPage.tsx:13-23`
   - 15min

5. **B6.5 useLocalStorage hook (component-arch A11)**:
   - Criar `client/src/hooks/useLocalStorage.ts` exports `useLocalStorage<T>(key, defaultValue)`
   - Refatorar `BudgetAlert.tsx:16-22` e `ProjectsPage.tsx:30-37`
   - 20min

6. **B6.6 React Query keys factory (arch-guard V017 + react-patterns P3.2)**:
   - Criar `client/src/lib/queryKeys.ts` exports `qk.dashboard.summary(filters)`, `qk.analytics.achievements()`, etc.
   - Refatorar hooks em `useDashboard.ts`, `useSessions.ts`, `useEntries.ts`, etc.
   - 30min

7. **B6.7 Trident BUG-12+13 — Sanitize PII logs**:
   - `server/src/routes/auth.ts:21` — `console.log("[AUTH] Register attempt:", maskEmail(req.body?.email))`
   - `server/src/routes/webhook.ts:62-64` — log `err.code` + class name, não full message
   - 15min

**Critério aceite global B6:**
- [ ] Routes skills/systemPrompts < 30 linhas cada (asyncHandler resolve)
- [ ] `useLocalStorage` reusado em BudgetAlert + ProjectsPage
- [ ] Logs auth não vazam email completo
- [ ] formatDate consolidado, sem shadows

---

### Wave B7 — Dead code + bundle

> **Estimativa: 1.5h.** Cleanup. Executar APÓS confirmar via grep que nada usa.

Tasks:

1. **B7.1 Deletar `client/src/components/ui/card.tsx`** (DS Δ14 + component-arch A13 — confirmado 0 imports). Adicionar nota em `lib/surface.ts` header. 5min.

2. **B7.2 Deletar `client/src/components/analytics/Achievements.tsx`** (component-arch A13 — confirmado 0 imports após Wave B4 mover catalog). 5min.

3. **B7.3 Deletar `client/src/components/dashboard/PeriodTable.tsx`** (component-arch A13 — comentário em DashboardPage:10 já confirma "removido"). 5min.

4. **B7.4 Verificar + deletar shadcn primitives unused**:
   - `client/src/components/ui/dropdown-menu.tsx` (266 LOC) — `Grep "from .*dropdown-menu"` antes
   - `client/src/components/ui/scroll-area.tsx` (52 LOC) — idem
   - 15min

5. **B7.5 Bundle splitting investigation**:
   - Rodar `npm run build` em `client/`
   - Verificar 1.28MB warning
   - Identificar candidates: Recharts (lazy load por chart?), Fuse.js (só GlobalSearch — code-split?), MarkdownView (só detail pages)
   - **NÃO implementar** — só relatório com 2-3 split candidates priorizados
   - 30min

6. **B7.6 Trident BUG-15 — setTimeout cleanup em AchievementNotifier**:
   - **NOTA:** se Wave B4 fez achievements server-side, AchievementNotifier provavelmente foi reescrito. Re-avaliar nessa wave.
   - Se ainda existe: track timer ids em ref, cleanup em useEffect return
   - 10min

7. **B7.7 Trident BUG-08, BUG-09, BUG-11 (P2/P3 trident)**:
   - BUG-09 (`any[]` → `unknown[]`) — `settingsService.ts:21`, `dashboard.ts:11`. 15min.
   - BUG-11 (`pool.max` env-driven) — `database.ts:6`. 5min.
   - BUG-08 — não fix (não é bug atual). Documentar em `package.json engines`. 5min.

8. **B7.8 react-patterns P3.4 — ErrorBoundary granular**:
   - Criar `<RouteErrorBoundary>` wrapper
   - Aplicar em `App.tsx:42-58` por rota
   - 20min

9. **B7.9 react-patterns P3.1 — Remover useCallback excess em CsvImport**:
   - Editar `components/settings/CsvImport.tsx:61-132` — manter só os que de fato passam pra children memoizados
   - 10min

**Critério aceite global B7:**
- [ ] Build passa
- [ ] Bundle size delta documentado (provavelmente -700-1000 LOC com dead code)
- [ ] Erro em DashboardPage não crasha SettingsPage (route boundary)
- [ ] Bundle investigation report no FINAL deste arquivo (B7.5)

---

## Critérios de aceite globais

- [ ] **Build:** `npm run build` em server/ + client/ sem errors/warnings (exceto bundle size)
- [ ] **Smoke:** auth login + dashboard load + skills list + system-prompts list + sessions detail + entries CSV export — todos OK
- [ ] **WCAG AA gates:**
  - 3 tokens fixed (B0.4) → ≥4.5:1
  - `prefers-reduced-motion` gate global (B1.1) → DevTools emulate test
  - `focus-visible` em chips (B2.5 FilterChip) → axe limpo em SkillsPage
  - Keyboard parity em rows (B2.7 ClickableRow) → Tab + Enter funciona em SessionsTable
  - Error suggestion em forms (B5.3) → aria-invalid + inline message
  - h1 semantic (B2.8 PageHeader) → 1 h1 por route
- [ ] **No regression:** rotas existentes (12 pages) renderizam mesma data, mesma navegação
- [ ] **Performance:** SessionsPage search lag < 100ms (B3.5 debounce + boundary)
- [ ] **Trident re-run:** invocar `trident --mode all-local` após Wave B7 → P0+P1 count = 0

---

## Out of scope (parking lot)

Items conscientemente NÃO inclusos no Plan B (Wave futura ou descartados):

- **Backend N+1 queries** — não pegou em audit (não há ORM com lazy loading; queries são raw)
- **Bundle real splitting** — B7.5 só investiga, não implementa (precisa profile real)
- **Multi-user features** — admin section dormente; auditoria contextual em "single-user"
- **Edit SKILL.md no dashboard** — read-only mantido (escopo discovery viewer)
- **Status variant tokens (`--status-*`)** — C4 conflito resolvido como NOT NOW (encyclopedia drift)
- **Migrar tables de shadcn → grid CSS denso (DS Δ16)** — Wave futura grande, north star documentado
- **react-hook-form + zod migration** — react-patterns P3.6, manter useState ad-hoc
- **Suspense + useSuspenseQuery** — react-patterns P3.5, opcional cosmético
- **AppTable shared do anti-ai-design-system** — DS Δ6.2 marca opcional
- **Mobile drawer pra sidebar** — UX recomendou decidir "desktop-only" oficial; Patrick decide
- **Achievement TOC scroll-spy** — UX F-16 não-crítico
- **CORS env config (BUG-02 trident)** — fica P1 mas low-priority pra single-user localhost. Documentar em README. Implementar quando deploy real.
- **arch-guard V010 (errorHandler proper)** — parcial via B6.1; full classes/codes fica out-of-scope
- **arch-guard V011 (auth grouping em index.ts)** — refactor invasivo, manter padrão atual (per-file `router.use(authMiddleware)`)
- **arch-guard V013 (Zod schema compartilhado client+server)** — precisa monorepo setup OU package shared (out-of-scope)
- **arch-guard V014 (model normalization shared)** — display-only, low priority
- **arch-guard V016 (charts dir reorg)** — feature folder mantido
- **trident BUG-05 (sortBy whitelist hardening)** — já mitigated, comment é suficiente
- **trident BUG-06 (parseCostUsd silent coerce)** — borderline; documentar comportamento atual
- **trident BUG-07 (total_tokens recompute)** — defensive coding, low priority pra single-user
- **trident BUG-10 (timezone parsePeriod)** — depende de prod environment (server geralmente roda Brazil-local em VPS)
- **DS Δ16 (table system unification)** — Wave futura

---

## Riscos

1. **Order rigidez:** B0 antes de B1 antes de B2 — não inverter. Wave B0 fixa security antes de qualquer touch em código de feature. Wave B1 estabelece tokens base que B2 components consomem (especialmente reduced-motion gate).

2. **Wave B2 + B3 paralelismo perigoso:** B3 refatora pages que B2 ainda está migrando. Executar B2 100% antes de iniciar B3.

3. **Wave B4 V001 (achievement catalog migration):**
   - Risco quebrar AchievementNotifier — testar isoladamente
   - Migration server-side precisa preservar TODAS as 70 conquistas com mesmo IDs (drift entre `Achievements.tsx` 30 e `AchievementsPage.tsx` 70 — usar AchievementsPage como source of truth)
   - localStorage key `achievement_seen_v1` (ou similar) — server endpoint pra mark-seen pode invalidar; mitigação: keep client-side seen tracking durante transição

4. **Wave B7.4 (dead code shadcn):** verificar grep antes — re-importar é trivial, mas não regredir UI primitives que algum componente novo possa precisar.

5. **B5.2 (BudgetAlert refactor) + B6.5 (useLocalStorage):** dependência — B6.5 antes facilita B5.2.

6. **Build break window:** após cada wave, `npm run build` em ambos. Se quebrar, `git stash` + investigate (não emendar próxima wave).

7. **Trident re-run reveal:** após B7, novo trident pode achar findings emergentes (refactors introduzem novos paths). Reservar 1h pra triagem follow-up.

8. **Lock-in IL-10 (Patrick rules):** este projeto NÃO está em FIXES-APLICADOS.md (não é skill skillforge). IL-10 não dispara. Edit livre.

---

## Estimativa total

| Wave | Tasks | Tempo |
|------|-------|-------|
| B0 — P0 fixes | 4 | 3h |
| B1 — Tokens + Motion | 8 | 1.5h |
| B2 — Component extractions | 9 | 4h |
| B3 — Refactors monolíticos | 5 | 3h |
| B4 — Architecture cleanup | 4 | 3h |
| B5 — UX polish | 10 | 2h |
| B6 — Anti-patterns transversais | 7 | 2h |
| B7 — Dead code + bundle | 9 | 1.5h |
| **TOTAL** | **56 tasks** | **~20h** |

**Splits sugeridos:**
- Sessão 1 (3h): Wave B0 completo
- Sessão 2 (3h): Wave B1 + B2.1-B2.4 (extractions baixo risco)
- Sessão 3 (3h): B2.5-B2.9 (extractions UX-críticas)
- Sessão 4 (3h): Wave B3 (refactors)
- Sessão 5 (3h): Wave B4 (architecture)
- Sessão 6 (2h): Wave B5 (UX polish)
- Sessão 7 (2h): Wave B6 + B7 (cleanup)

**Recomendação:** após cada sessão, `/clear` (per token-hygiene rules) + `git commit` por wave (rollback granular). Trident re-run após B4, B5, B7 (catch regressões cedo).

---

## Pre-implementation checklist (gate antes de começar Wave B0)

- [ ] Patrick aprovou conflitos C1-C6 explicitamente OU revisou propostas
- [ ] Backup do DB local (Wave B0.3 mexe em migrations)
- [ ] `git status` clean OU branch dedicada `plan-b/wave-b0`
- [ ] `.env` real existe (não usar `.env.example` literal — Wave B0.1 vai falhar boot)
- [ ] DevTools com axe extension instalada (Wave B0.4 + B2 + B5 validam)
- [ ] `npm install` em ambos client/ e server/ atualizado
- [ ] Trident run inicial salvo (baseline pra comparar pós-Wave B7)

---

**Próximo passo:** Phase 3 SDD (Implement) com `/clear` + leitura deste spec como sole source of truth. NÃO improvisar — se ambíguo, parar e perguntar.

---

## B7.5 Bundle Splitting Report

**Baseline (pós-B7 deletes):** `dist/assets/index-DlHjAQj7.js` = **1,274.30 kB** (gzip: 376.55 kB). Vite warn limite 500 kB.

**Análise:** bundle único, sem code-splitting de rota nem de lib pesada. Top 3 candidates priorizados (ordem de impacto/esforço):

### 1. Recharts — top priority (alto impacto, esforço médio) — Recharts ~150-200 kB minified

**Onde é usado** (8 arquivos, todos charts):
- `pages/AnalyticsPage.tsx` — line + bar
- `pages/ProjectsPage.tsx` — area
- `pages/SessionDetailPage.tsx` — area
- `components/charts/ModelPieChart.tsx`, `DailyCostAreaChart.tsx`
- `components/dashboard/CostByModelChart.tsx`, `CostBySourceChart.tsx`, `DailyCostChart.tsx`
- `components/sessions/SessionTimeScatterChart.tsx`
- `components/analytics/ProjectComparison.tsx`

**Split strategy:** route-level lazy import via `React.lazy()` + `<Suspense fallback>`. Pages que renderizam charts (Analytics, Projects, SessionDetail, Dashboard) viram chunks separados. Login/Settings/Admin não baixam Recharts.

**Ganho estimado:** ~150-200 kB removido do main bundle (Dashboard ainda carrega em rota direta, mas Settings/Login economizam 100% desse cost). Em pages sem chart (Login, Settings, Admin, Entries), redução é integral.

**Esforço:** 30-45min. Trocar 14 imports diretos `import { DashboardPage }` por `const DashboardPage = lazy(() => import("./pages/DashboardPage"))`. Wrap `<Routes>` em `<Suspense>`.

### 2. React-Markdown + remark-gfm — segunda prioridade (médio impacto, esforço baixo) — ~80-100 kB

**Onde é usado** (2 arquivos, só skill detail):
- `components/markdown/MarkdownView.tsx` — única consumidora real de `react-markdown`
- `pages/SkillDetailPage.tsx` — única page que renderiza
- `components/shared/MarkdownDocPanel.tsx` — wrapper sobre MarkdownView

**Split strategy:** lazy import do `MarkdownView` dentro do `SkillDetailPage`. SkillsPage (lista) não baixa. SystemPromptDetailPage também consome via MarkdownDocPanel — mesma rota-level split serve.

**Ganho estimado:** ~80-100 kB. Skills list (rota mais visitada) economiza tudo. Detail só baixa quando navegado.

**Esforço:** 15-20min. `const MarkdownView = lazy(() => import("@/components/markdown/MarkdownView").then(m => ({ default: m.MarkdownView })))`.

### 3. Fuse.js — terceira prioridade (baixo impacto, esforço baixo) — ~12-15 kB

**Onde é usado** (3 arquivos):
- `pages/SkillsPage.tsx` — busca dentro da lista de skills
- `components/search/GlobalSearch.tsx` — global cmd+k
- `components/skills/SkillSearch.tsx` — busca dentro de skill detail

**Split strategy:** dynamic import on-demand quando usuário foca input de busca. `GlobalSearch` é usada via cmd+k (modal) — perfeito candidato. `SkillsPage` carrega sempre (busca é UI principal), mas pode `await import("fuse.js")` no primeiro keystroke.

**Ganho estimado:** ~12-15 kB. Pequeno em absolutos mas barato (zero risco de regressão de UX se feito on-focus).

**Esforço:** 15min. Fuse é tree-shakeable mas modal-only carrega em todo render — mover pra dynamic import elimina cost.

### Total estimado de ganho

Implementando 1+2+3: **~250-310 kB** de redução do main bundle (~20-25%). Bundle main fica ~960-1020 kB, Dashboard chunk ~150 kB, SkillDetail chunk ~80 kB. Atinge spec do Vite (chunks <500 kB) em 80% das rotas.

**Implementar:** Wave futura (não em B7) — splitting de Recharts é o de melhor ROI mas requer testar todos charts pós-lazy. Recomendo Wave C1 dedicada com regression test manual de cada page.
