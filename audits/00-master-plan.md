# Master Plan — Claude Token Tracker Redesign

> **Branch:** `redesign/motion-ds-audit`
> **Criado:** 2026-05-06
> **Estado:** Wave 0 pendente (aguardando arranque)
> **Goal:** transformar tracker de ferramenta interna do Patrick em **free tool isca pra Artemis** (público, single-tenant, prospect-facing) com visual de produto polido.

---

## Contexto

### O que é
Tracker = dashboard self-host pra rastrear uso de tokens Claude/Codex. Stack React+Vite + Express + PostgreSQL Docker. 16 pages. Já tem Geist + tokens 222° azul-cinza + reduced-motion gate.

### O que muda
| Antes | Agora |
|---|---|
| Ferramenta interna do Patrick | Isca de marketing pra Artemis |
| Single-user (Patrick) | Single-tenant público (qualquer dev baixa) |
| Audiência: power user | Audiência: prospect Artemis primeira vez |
| Admin necessário | Retira admin (cada um é dono próprio data) |
| Visual operational | Cara de aplicativo de verdade |
| Tokens 222° dark-only | Brand Artemis (navy #003899 + accent #005EFF + Untitled UI gray) |

### Constraints
- Visual primeiro (Waves 0-6)
- Refactor lógica/admin **no fim** (Wave 7, opcional sessão separada)
- Reuso máximo de components canonical do `anti-ai-design-system/ui_kits/default/` (61 components prontos)
- 3-4 sessões com handoff entre elas

### Brand Artemis confirmado
- **Primary:** `#003899` (navy)
- **Accent:** `#005EFF` (vibrant blue)
- **Secondary:** `#000000` (black)
- **Text:** `#667085` (gray-500)
- **Gray scale (Untitled UI):** `#F2F4F7`, `#EAECF0`, `#D0D5DD`, `#98A2B3`, `#667085`, `#475467`, `#344054`, `#182230`, `#101828`, `#0C111D`
- **Variantes blue:** `#0D419B`, `#0848C5`, `#1E93FF`, `#48B7FF`
- **Typography:** A confirmar via WebFetch `studioartemis.co` (Wave 0). Hipótese: IBM Plex Sans + Inter (idem `charming-solutions`).

---

## Princípios

1. **Plano vivo.** Cada wave fecha com gate Patrick. Pivot documentado se descoberta exigir mudança.
2. **Gates bloqueantes.** Skill nunca pula GATE. Patrick aprova antes de prosseguir.
3. **Handoff entre sessões.** `context-guardian --handoff` antes de `/clear`. Sessão N+1 abre fresh + lê `audits/HANDOFF-Sx.md`.
4. **Skill > opinião.** Decisões fundamentadas em rubric/heurística, não gosto.
5. **Reuso > criar.** Component canonical do CRM template antes de criar novo.
6. **Cara de IA.** Foreground sempre carrega hue. Pure `0 0% L%` proibido. Status pills hue-aligned.

---

## Visão geral — sessões e waves

| Sessão | Waves | Skills | Budget | Output principal |
|---|---|---|---|---|
| **S1** | 0, 1, 2, 3 | reference-finder, free-tool-strategy, ux-audit, motion-design | ~70% | strategy + ux findings + motion spec |
| **S2** | 4, 5 | ui-design-system, design-system-audit, component-architect | ~50% | tokens Artemis + lift map |
| **S3** | 6 | ui-design-system --apply | ~70% | implementação visual page-by-page |
| **S4 (cond.)** | 7 | trident, sdd | ~50% | refactor admin out + lógica fix |

---

## SESSÃO 1 — Strategy + Discovery

### Wave 0 — Brand confirm + reference scouting

**Objetivo:** travar identidade visual (typography Artemis) + mapear competidores (free claude trackers existentes) pra calibrar positioning depois.

**Inputs:**
- Paleta Artemis (já dada)
- URL `studioartemis.co`
- Memória project_crm_gaps_plan.md (charming-solutions usa IBM Plex Sans)

**Tools/skills:**
- WebFetch `studioartemis.co` (extrair font-family declarado, screenshot tom visual)
- `reference-finder --solution-scout "free claude codex token tracker dashboard public"` (1 query — CCSeva, ccusage, Plausible, Umami, Tinybird)

**Output:**
- `audits/00-references.md` — brand kit confirmado (paleta + typography) + 5 reference apps com prints + 3 padrões aplicáveis

**Gate:** Patrick valida brand confirmado → entra Wave 1

**Budget:** ~15%

**Pivot points:**
- Se studioartemis.co usa fonte ≠ IBM Plex/Inter → Wave 4 carrega font diferente
- Se reference apps revelam padrão crítico não previsto (ex: dark/light toggle) → adiciona ao escopo Wave 6

---

### Wave 1 — Strategy lock-in

**Objetivo:** definir ICP prospect, funnel tracker→Artemis, branding rules sutis (não invasivo), métricas de sucesso, positioning. Sem estratégia clara, audit visual fica especulativo.

**Inputs:**
- `audits/00-references.md`
- Paleta Artemis
- Estado atual tracker (16 pages, dark-only)

**Skill:** `free-tool-strategy`

**Output:** `audits/01-strategy.md` contendo:
- ICP prospect (dev/tech-lead que usa Claude Code intensivo)
- Funnel: download tracker → setup webhook → footer "by Artemis" link → site Artemis → contato
- Branding rules: footer fixo, accent color sutil, login screen com Artemis presence, sem CTA invasivo
- Success metrics: GitHub stars/forks, downloads, site visits via tracker, leads convertidos
- Positioning: "Artemis dá free tier técnico antes de pitch" (tipo Plausible vs Google Analytics)

**Gate:** Patrick valida positioning → entra Wave 2

**Budget:** ~15%

**Modelo:** Opus high + ultrathink (decisão estratégica cara)

**Pivot points:**
- Se ICP definido for muito nichado (ex: só CTOs) → Wave 2 ux-audit calibra pra esse público
- Se positioning aceitar gamification streaks como diferencial → Wave 2 recomenda implementar

---

### Wave 2 — UX audit prospect-first

**Objetivo:** auditar 16 pages com lente "dev prospect abrindo primeira vez, sem contexto Patrick". Identificar fricções de first-time experience, recomendar onboarding wizard sim/não, achar empty states que viram pitch.

**Inputs:**
- `audits/01-strategy.md` (ICP)
- 16 pages do tracker (Dashboard, Sessions, Analytics, Settings, Skills, SystemPrompts, Achievements, Login, etc.)
- README.md (atualmente é onde setup acontece)

**Skill:** `ux-audit` modo **Cognitive Walkthrough** (foco: novo usuário, learnability)

**Workflow:**
- Phase 1 contexto + triagem (skip — já mapeei narrative)
- Phase 2 percorrer 5 fluxos críticos (J0 onboarding, J1 olhar dashboard, J2 ver sessão cara, J3 entender mês, J7 configurar coletor)
- Phase 3 heurísticas Nielsen
- Phase 4 WCAG 2.2 AA
- Phase 5 estados (empty, error, loading, first-time, recurring)
- Phase 6 síntese severidade Nielsen 0-4 + critério aceite por finding

**Output:** `audits/02-ux.md` contendo:
- 5 fluxos percorridos com veredicto ✅/⚠️/❌
- Findings ordenados por severidade
- **Recomendação onboarding wizard** sim/não com justificativa
- **Recomendação gamification streaks** sim/não (responde pergunta da Sessão atual)
- Estados que viram pitch sutil (empty + onboarding)
- Findings encaminhados pra outras skills (motion-design / DS / component-architect)

**Gate:** Patrick valida findings P0/P1 → entra Wave 3

**Budget:** ~20%

**Modelo:** Sonnet high + think hard

**Pivot points:**
- Se onboarding wizard for recomendado → Wave 6 ganha sub-wave dedicada
- Se gamification streaks for sim → Wave 3 motion adiciona spec celebration motion + Wave 6 ganha sub-wave
- Se finding P0 atinge lógica (não visual) → escala pra Wave 7 (refactor)

---

### Wave 3 — Motion spec

**Objetivo:** spec executável de motion calibrada pra prospect-facing operational SaaS. P1 funcional dominante + P2 brand-heavy permitido em onboarding/login/celebrations.

**Inputs:**
- `audits/02-ux.md` (findings encaminhados pra motion)
- `index.css` atual (já tem motion tokens fast/base/slow/decorative + reduced-motion gate)
- Paleta Artemis

**Skill:** `motion-design --full`

**Workflow:**
- Phase 0 fast-forward (narrative validada Wave 0-2)
- Phase 1 lookup → SaaS operacional → references/01-funcional + references/13-microinteractions-canonical (Wave 9.1) + references/06-theoretical-foundations
- Phase 2 decision per padrão
- Phase 3 proposal embasamento teorico (gestalt + attention + scroll + easing)
- Phase 4 validation gate (BLOCKING — Patrick aprova)
- Phase 5 spec canonical executável

**Output:** `audits/03-motion.md` contendo:
- Specs por padrão (button-press, form-field-label-float, modal easeReverse, drawer, toast Sonner, tooltip)
- Charts entry (KPIs counter + chart line draw)
- Onboarding wizard motion (se Wave 2 recomendou)
- Achievement unlock motion (se gamification entrou)
- Login screen motion (P2 brand-heavy permitido)
- Reduced-motion fallback por padrão (Iron Law 3)
- Browser baseline + bundle cost por padrão

**Gate:** Patrick aprova specs → handoff S1→S2

**Budget:** ~15%

**Modelo:** Opus high + ultrathink (research-first consultivo)

**Pivot points:**
- Se Patrick rejeitar embasamento teorico Phase 3 → loop Phase 2 com novo modo (encaixar/modificar/criar)
- Se bundle cost estourar (ex: GSAP só pra fade) → Phase 4 corta

---

### ⏸ Handoff S1→S2

Após Wave 3 aprovada, gerar `audits/HANDOFF-S1.md`:
- Estado de cada wave
- Decisões tomadas (positioning, onboarding sim/não, gamification sim/não)
- Inputs pra S2 (paleta confirmada + typography + tokens existentes)
- Próximo passo: Wave 4 ui-design-system --generate

Cumulativo S1: ~70%. Limite seguro pré-/clear.

---

## SESSÃO 2 — Design system + lift plan

### Wave 4 — Design tokens Artemis-fitted

**Objetivo:** gerar `design.json` com tokens semantic-role baseados na paleta Artemis. Validar contraste WCAG nos pares reais. Definir motion-as-system (já existe, audita + adapta).

**Inputs:**
- Paleta Artemis confirmada Wave 0
- Typography confirmada Wave 0
- `audits/01-strategy.md` (constraints branding)
- `audits/03-motion.md` (motion-as-system já speccado)
- DS reference: `~/Documents/Github/anti-ai-design-system/colors_and_type.css` + `presets/default/tokens.css`

**Skill:** `ui-design-system --generate`

**Workflow:**
- Phase 1 inputs (seed = navy #003899, accent = vibrant blue, gray scale = Untitled UI, fonts = Wave 0, product type = operational SaaS public)
- Phase 2 color space OKLCH + 5 semantic role groups (action / brand / focus / surface / decorative)
- Phase 3 token generation: design.json + Tailwind config + CSS variables + breakpoints rem + 9 layout primitives
- Phase 4 states + motion (importa de Wave 3) + microinteractions
- Phase 5 review BLOCKING (contrast em todos pares + hit target 24×24 + reflow 320 + zoom 200%/400% + reduced motion + visual QA matrix)

**Output:**
- `audits/04-tokens.json` (design.json)
- `audits/04-tokens-spec.md` (scorecard maturity + contrast pairs measured + decisões registradas)

**Gate:** Patrick aprova scorecard → entra Wave 5

**Budget:** ~25% (heavyweight skill)

**Modelo:** Opus high + ultrathink

**Pivot points:**
- Se algum par bg+fg falhar AA → ajusta token, re-mede, registra delta
- Se navy `#003899` for muito escuro pra ser primary em dark mode tracker → bump pra `#0848C5` ou usa accent
- Se tracker fica forçado dark-only ou abre light mode também → decisão Patrick (hipótese: continua dark-only por job atual)

---

### Wave 5 — DS audit + component lift map

**Objetivo:** auditar tracker contra novo DS Artemis-fitted (Wave 4). Mapear pra cada page tracker quais components canonical do CRM template substituem inline.

**Inputs:**
- `audits/04-tokens.json` (DS Wave 4)
- Tracker atual (16 pages)
- 61 components canonical em `anti-ai-design-system/ui_kits/default/components/`
- `audit-snapshots/crm-2026-05-03/07-component-inventory.md` (inventory existente)

**Skills:** `design-system-audit --audit` + `component-architect --plan`

**Workflow:**
- Phase 1 context (já feito)
- Phase 2 inventory (tracker components vs DS components)
- Phase 3 spec diff
- Phase 4 coherence (tracker uso vs DS spec — adapta vs aplica vs skip)
- Phase 4.5 contrast audit (re-validar com tokens Wave 4)
- Phase 5 delta report
- Lift map: tracker `StatCard` → DS `dashboard/StatCard.jsx` etc.

**Output:**
- `audits/05-ds-deltas.md` — deltas com WHY HERE + apply/adapt/skip
- `audits/05-lift-map.md` — tabela "tracker component X → DS component Y" com signature mismatches anotadas

**Gate:** Patrick aprova deltas (per-delta) + lift map → handoff S2→S3

**Budget:** ~25%

**Modelo:** Sonnet high + think hard

**Pivot points:**
- Se signature mismatch crítico (ex: AppTable do DS usa grid CSS, tracker usa shadcn Table) → escolhe: adapta DS pro tracker OU adapta tracker pro DS
- Se mais de 5 components precisam adapter → Wave 6 ganha sub-wave de "component adapter layer"

---

### ⏸ Handoff S2→S3

`audits/HANDOFF-S2.md`. Cumulativo S2: ~50%.

---

## SESSÃO 3 — Implementação visual

### Wave 6 — Visual page-by-page

**Objetivo:** aplicar tokens Wave 4 + lift components Wave 5 nos arquivos do tracker. Page-by-page por **prioridade de jobs** (do mais frequente pro menos).

**Inputs:**
- Tudo de S1 + S2

**Skill:** `ui-design-system --apply` + edits diretos

**Sub-waves (ordem por job frequency):**

> **Pivot 2026-05-06 (#1):** Wave 6.9 (Shell global) movida pra Wave 6.0 ANTES de 6.1. Patrick: lift Sidebar canonical (UserMenu rodapé + theme toggle + collapse + brand) muda layout shell completo — sem isso 6.1+ ficam orbitando tokens em estrutura errada. Histórico §"Histórico de pivots".

| # | Page(s) | Job atendido | Por que essa ordem |
|---|---|---|---|
| **6.0** | `AppLayout` + `Sidebar` + `UserMenu` (CRIAR) + ThemeContext (CRIAR) | global | **Shell canonical FIRST** — sidebar com UserMenu rodapé (avatar + theme toggle + config + logout), collapse toggle, brand lockup. Sem isso, lift dashboard interno fica desencaixado. |
| 6.1 | `DashboardPage.tsx` + `dashboard/*` | J1 (~50x/dia) | Herói. Patrick olha 20-30x/dia. Maior alavancagem. |
| 6.2 | `SessionsPage.tsx` + `sessions/*` + `SessionDetailPage.tsx` | J2 | Segunda mais frequente. |
| 6.3 | `AnalyticsPage.tsx` + `analytics/*` | J3 + J4 | Mês + projeto. |
| 6.4 | `LoginPage.tsx` + onboarding wizard (se Wave 2 aprovou) | J0 onboarding | Primeira impressão prospect. P2 brand-heavy permitido. |
| 6.5 | `SettingsPage.tsx` + `settings/*` | J7 | Configurar coletor. Empty state vira pitch. |
| 6.6 | `SkillsPage.tsx` + `SystemPromptsPage.tsx` + detail pages | J6 | Showcase. Mostra que Artemis sabe das coisas. |
| 6.7 | `AchievementsPage.tsx` + gamification streaks (se Wave 2 aprovou) | J8 | Motion P2 celebration. |
| 6.8 | Demais (`ProjectsPage`, `ProjectDetailPage`, `EntriesPage`, `SessionTimePage`) | J4/J5 | Cleanup. |

**Gate per sub-wave:** screenshot before/after + Patrick valida → próxima sub-wave

**Output:** edits aplicados na branch `redesign/motion-ds-audit` + commits atomicos por sub-wave (`feat(ux): wave 6.X <page> redesign`)

**Budget:** ~70% S3 (pode estourar — divide em mais sessões se necessário)

**Modelo:** Sonnet medium + default (mechanical edits) | Sonnet high se sub-wave complexa

**Pivot points:**
- Se sub-wave 6.1 quebrar layout → pause + diagnóstico antes de seguir
- Se contrast falhar em runtime (DevTools) → volta Wave 4, ajusta token, re-aplica
- Se page rejeitada pelo Patrick (visualmente) → volta Wave 5, re-decide lift, re-aplica

---

### ⏸ Handoff S3→S4 (condicional)

Se Patrick decidir pular S4 (Wave 7), branch fica pronta pra merge. Senão handoff.

---

## SESSÃO 4 — Refactor + lógica (CONDICIONAL)

### Wave 7 — Admin out + lógica fix

**Objetivo:** remover admin/multi-user. Fix bugs de lógica (modelos não puxam, preço fixo → custom input). Cross-check com PLAN-B-SPEC.md (descarta findings agora cobertos).

**Inputs:**
- Branch S3 com visual completo
- `PLAN-B-SPEC.md` (audit prévio 2026-04-30)
- Tracker server (auth, routes/admin, role checks)

**Skills:** `sdd` Phase 1+2 (research → spec) + `trident --mode all-local` final review

**Workflow:**
- 7.1 SDD spec: refactor remoção admin + multi-user → single-tenant público
- 7.2 Implementação SDD waves
- 7.3 Lógica fix:
  - Modelos não puxam (debug código, DB, normalizer)
  - Preço fixo → user pode inputar próprio preço
- 7.4 trident review final
- 7.5 Cross-check PLAN-B-SPEC.md: cada finding antigo → mantém / cobertos / descarta

**Output:**
- Spec SDD em `docs/audits/07-refactor-spec.md`
- Edits server (auth, routes, schema)
- Edits client (admin page removed, settings ganha custom pricing)
- `audits/07-final-review.md`

**Gate:** trident final aprova + Patrick valida → branch ready pra merge master

**Budget:** ~50% S4

**Modelo:** Opus high (planning) + Sonnet (implement) — `/model opusplan`

**Pivot points:**
- Se SDD detectar refactor maior que esperado → divide em mais sessões
- Se lógica fix revelar bug crítico downstream → pausa, P0 fix isolado

---

## Pontos de pivot globais

Plano pode mudar em qualquer ponto se:

1. Patrick mudar premissa (ex: "não vai mais ser público")
2. Skill descobrir P0 não previsto
3. Budget de sessão estourar (divide wave em mais sessões)
4. Brand Artemis evoluir (ex: typography decidida nova)
5. Reference scouting (Wave 0) revelar competidor com feature crítica não prevista

**Como aplicar pivot:**
1. Documento aqui (seção "Histórico de pivots")
2. Confronto vocal com Patrick: "ajusta wave X porque Y. Aceita?"
3. Atualiza tabelas relevantes
4. Continua

---

## Cross-references

- `PLAN.md` — plano A original (audits paralelos 8 skills, 2026-05-03)
- `PLAN-B-SPEC.md` — SDD consolidou 115 findings em 8 waves B0-B7 (2026-04-30)
- `UX_AUDIT_SPEC.md` — UX comparado a Umami/Dub/OpenStatus (F1-F16)
- `~/Documents/Github/anti-ai-design-system/ui_kits/default/` — 61 components canonical CRM template
- `~/Documents/Github/anti-ai-design-system/audit-snapshots/crm-2026-05-03/` — chain audit prévia (5 skills)
- `~/Documents/Github/anti-ai-design-system/colors_and_type.css` — token sheet preset default
- `studioartemis.co` — site Artemis (typography reference Wave 0)

---

## Estado atual

| Wave | Status | Started | Completed | Output |
|---|---|---|---|---|
| 0 | ✅ done (approved) | 2026-05-06 | 2026-05-06 | `audits/00-references.md` |
| 1 | ✅ done (approved) | 2026-05-06 | 2026-05-06 | `audits/01-strategy.md` |
| 2 | ✅ done (approved) | 2026-05-06 | 2026-05-06 | `audits/02-ux.md` |
| 3 | ✅ done (gate skipped per autorização) | 2026-05-06 | 2026-05-06 | `audits/03-motion.md` |
| 4 | ✅ done (1 WCAG fail trade-off documentado) | 2026-05-06 | 2026-05-06 | `audits/04-tokens.{json,css}` + `04-tokens-spec.md` + `04-wcag-report.md` + `scripts/generate-tokens.mjs` |
| 5 | ✅ done | 2026-05-06 | 2026-05-06 | `audits/05-deltas-and-lift.md` + `05-component-architect.md` |
| 6.0 | ✅ done | 2026-05-06 | 2026-05-06 | Shell canonical lift (Sidebar + UserMenu + ThemeContext) |
| 6.1 | ✅ done | 2026-05-06 | 2026-05-06 | Dashboard internals (StatCard canonical + WebhookPing + chart tokens + surface rounded-xl) |
| 6.2 | ✅ done | 2026-05-06 | 2026-05-06 | Sessions lift (AppTable canonical port + SessionsTable refactor + drop ClickableRow/SortableTableHeader) |
| 6.3 | ✅ done | 2026-05-06 | 2026-05-06 | Analytics lift (KpiBox MetricCard anatomy + useCountUp shared + DeltaBadge tokens fix + TOOLTIP_PROPS tokens + textH2 canonical) |
| 6.4a | ✅ done | 2026-05-06 | 2026-05-06 | LoginPage 50/50 split canonical (brand panel + form panel + Artemis tagline) |
| 6.4b | ✅ done | 2026-05-06 | 2026-05-06 | OnboardingWizard CRIAR (5 steps + live detection + AppLayout trigger + confetti motion) |
| 6.4c | ⏸ pendente | — | — | MOCK_USER bypass cleanup (preparar deploy VPS — F-NEW-5 backlog) |
| 6.5 | ✅ done | 2026-05-06 | 2026-05-06 | FormField canonical + SettingsForm refactor (PricingDrawer pivotou pra F-NEW-8 backlog — requer schema novo) |
| 6.6 | ⏸ pendente | — | — | Skills/SystemPrompts (pendency: modelo a/b/c não decidido) |
| 6.7a | ✅ done | 2026-05-06 | 2026-05-06 | Achievements motion polish (ConfettiBurst shared + BadgeCard ease-spring overshoot + TierProgressBar milestones + AchievementNotifier confetti dispatch) |
| 6.7b | ⏸ pendente | — | — | StreakCounter + StreakLostScreen CRIAR (depende backend signal streak.lost_pending) |
| 6.8 | ✅ done | 2026-05-06 | 2026-05-06 | Cleanup pages (rounded-md → rounded-xl + chart hex hardcoded → tokens em ProjectsPage/ProjectDetailPage/EntriesPage/SessionDetailPage/DailyCostChart/CostBySourceChart/SessionTimeScatterChart/DailyCostAreaChart) |
| 7 | ⏸ pendente (condicional) | — | — | — |

---

## Histórico de pivots

### Pivot #1 — 2026-05-06 — Wave 6.9 → 6.0 (Shell first)

**Motivo:** após Wave 6.1 step 1 aplicar tokens Wave 4, Patrick reportou "não pega cara da Artemis". Investigação revelou que tokens estavam corretos mas Sidebar tracker tem layout estrutural diferente do CRM canonical (sem UserMenu rodapé, sem collapse, sem theme toggle, sem brand lockup top). Sub-wave 6.9 (Shell global) tava planejada pra fim — fazia sentido fazer ANTES porque shell define o invólucro de tudo.

**Mudança:**
- Wave 6.0 NOVA — Shell canonical lift (AppLayout decompose + Sidebar canonical pattern + UserMenu CRIAR + ThemeContext CRIAR)
- Wave 6.9 → removida (absorvida em 6.0)
- 6.1-6.8 inalteradas

**Trabalho preservado:** tokens Wave 4 + bypass auth Wave 6.1 step 2 + bug fixes (hsl wrappers, 401 no-redirect, proxy 3002) ficam. Não regride.

**Risk:** ThemeContext + collapse state machine introduzem state novo em useState — testar persistência localStorage entre reloads.

---

## Backlog Wave futura (Wave 8+)

Features identificadas durante S2 mas fora de escopo das waves atuais. Documentadas pra não esquecer.

### F-NEW-1: Token Editor in-app (user pode customizar paleta)

**Origem:** Patrick S2 Wave 4 — "se a pessoa quiser mudar a cor dele, ela consegue".

**Descrição:**
- Component TokenEditor embutido em /settings (ou /appearance) page
- User troca accent color → auto-deriva primary/ring/sidebar/decorative + WCAG validation real-time + preview live
- Reusa lógica `TokenEditorPreview` canonical (`anti-ai-design-system/ui_kits/default/components/showcase/TokenEditorPreview.jsx`):
  - `pickFg`, `contrastRatio`, `wcagBadge`, `hexToHsl`, `deriveFromAccent`, `clampForContrast`, `classifySeed`
- Persistência via localStorage (single-tenant) ou DB (Wave 7 single-tenant migration)
- Modo Basic (1 input → deriva tudo) + Advanced (todos tokens individualmente)
- Light/Dark/Auto toggle (Wave 4 dark-only foi MVP — Token Editor permite expandir)

**Por quê backlog (não Wave 6):**
- Wave 6 foco implementação visual core (16 pages + 6 components a criar)
- Token Editor é feature MAJOR (~3-4h dev) — desvia do core "tornar isca prospect-ready"
- Pode ser Wave 8 dedicada após launch inicial (validação de demanda)

**Dependências:** Wave 4 tokens semantic ✅, Wave 6 implementação visual base ✅, Wave 7 single-tenant migration (se persistência DB).

### F-NEW-2: Gamification XP unlock features

**Origem:** Patrick S2 Wave 4 — "daria pra fazer de um jeito que ele é travado e libera com tantos niveis de XP".

**Descrição:**
- Sistema XP gating progressive features:
  - **XP Lv 1-5 (default):** core tracker funcional (Dashboard, Sessions, Settings)
  - **XP Lv 5+:** Token Editor Basic mode unlock
  - **XP Lv 10+:** Token Editor Advanced mode unlock
  - **XP Lv 15+:** custom themes presets save/load
  - **XP Lv 20+:** export theme as CSS download
- XP earned via: streaks Duolingo-style (Wave 6.7) + sessions counted + days active
- UI: badge "Locked — Lv X to unlock" em tabs/buttons gated
- Empty state CTA "Track 5 days to unlock theme customization"

**Por quê backlog:**
- Gamification streaks core (Wave 6.7) é PILAR principal — sem ele não tem XP earning
- XP gating é "second-order delight" — funcionar core primeiro
- Patrick: "isso pode entrar depois"

**Dependências:** Wave 6.7 streaks/achievements ✅, F-NEW-1 Token Editor ✅, sistema XP backend (não existe atual).

### F-NEW-4: Naming overhaul (rename produto + repo)

**Origem:** Patrick S2 Wave 6.0 — "Claude Token Tracker" não comporta multi-LLM (Codex, claude.ai, future LLMs). Brand Artemis vira isca, nome precisa refletir.

**Descrição:**
- Brainstorm naming options Artemis-branded multi-LLM: "Artemis Tokenizer", "Artemis Tracker", "Artemis Meter", "Artemis Vault" — escolher após dia de pesquisa naming
- Rename repositório GitHub: `claude-token-tracker` → `<novo-nome>` via `gh repo rename` (GitHub auto-redirect 301)
- Update `package.json` name field + workspaces refs
- Update branding strings:
  - Brand lockup sidebar (`Claude Token Tracker` → novo)
  - Brand tag diagonal (`TRACKER` → outro signifier melhor)
  - Page `<title>` em `index.html`
  - README + docs
  - LoginPage hero copy
  - Webhook URLs label (cosmetic, endpoint mantém)
- Considerar tagline: "Plausible for any LLM. By Artemis."
- Domain considerations (se houver): `tokenizer.artemis.dev` ou similar

**Por quê backlog:**
- Naming é decisão estratégica (1 dia research) — não é spec UX
- Patrick: "só anota ela pra depois, a gente continua no plano principal"
- Wave 6 prioridade = visual polish core
- Rename pode esperar pós-launch validation
- Risk: rename antes do launch dá liberdade de mudar; rename pós-launch quebra SEO/links externos

**Dependências:** F-NEW-1 Token Editor pode ganhar nome alinhado também. Wave 7 single-tenant migration boa janela pra fazer rename junto (DB schema rename safe se feito ali).

### F-NEW-3: Light mode preset adicional

**Origem:** Wave 4 decisão dark-only puro (Patrick Q5).

**Descrição:**
- Adicionar preset light mode pra LoginPage hero ou tracker inteiro
- Reusa `_te_SURFACE_THEMES.light` do TokenEditorPreview canonical
- Toggle Light/Dark/Auto (Auto = system pref)

**Por quê backlog:**
- Wave 4 MVP é dark-only (developer tool noturno)
- Light mode = expansão pós-launch validação demanda

**Dependências:** F-NEW-1 Token Editor (que tem light mode toggle nativo) OU implementação separada.

### F-NEW-5: Deploy VPS hosted (Patrick instance oficial)

**Origem:** Patrick 2026-05-06 — "passa do local pra VPS, Docker com Postgres apontado pra esse servidor".

**Descrição:**
- Provisiona VPS Hostinger 72.60.152.11 (já existente) com Docker Compose tracker:
  - Service `db` Postgres já rodando local — port mapeada do servidor
  - Service `server` Express tsx — port 3002
  - Service `client` Vite build static → nginx OR servir via Express
- Migration data existente Patrick (~256 sessions, $15k cost) do Docker local pra VPS:
  - `pg_dump` local + `psql` restore VPS
  - OR mantém local + sync periodic (mais complexo)
- Domain: `tokenizer.artemis.dev` ou subdomain TBD (depende F-NEW-4 naming)
- HTTPS via Let's Encrypt (certbot ou Caddy)
- Hooks Patrick locais (Claude Code) ajustam webhook URL pro novo domain
- CI/CD: GitHub Action push → SSH deploy script

**Por quê backlog:**
- Wave 6.x foco visual polish — deploy é infra, fora de UX scope
- Wave 6.4c (intermediária) prepara remove MOCK_USER bypass + valida login real ANTES de deploy
- Deploy em VPS com data real = teste de fogo — quer estar visualmente pronto antes

**Dependências:** Wave 6.x ✅ (visual completo), Wave 6.4c MOCK_USER cleanup ✅, eventualmente F-NEW-4 naming (pra escolher domain final).

### F-NEW-6: Multi-tenant SaaS (terceiros usam tracker hosted Patrick)

**Origem:** Patrick 2026-05-06 — "usuário poderia ter o meu banco rodando e só manda pra lá sempre".

**Descrição:**
- Schema multi-tenant: cada user tem `tenant_id` em todas as tabelas (sessions, entries, hooks)
- RLS Postgres OU filtragem app-layer em todas queries (Drizzle middleware)
- User isolation: webhooks autenticados via JWT user-scoped (não trocar global secret)
- Free tier limits: max sessions/mês, max retention 30/60/90 dias
- Paid tier: unlimited + custom alerts (futuro monetização)
- Encryption design opcional:
  - **Server-side AES-256:** Patrick custódio (mais simples, responsabilidade legal)
  - **Client-side zero-knowledge:** user perde senha = perde dados (Bitwarden-style, mais complexo)
  - Recomendação: server-side com encrypted-at-rest Postgres + TLS in-transit + opt-in zero-knowledge premium
- Backup strategy: daily snapshots S3 + retention 30d
- Monitoring: Grafana dashboards + alerting (Patrick oncall)

**Por quê backlog:**
- Decisão estratégica (alinha Willy ANTES de iniciar — custo $$/mês infra + tempo Patrick + responsabilidade legal LGPD)
- Wave 6.x visual polish + Wave 7 single-tenant migration são pré-requisito (cleanup admin/multi-user code first)
- Validação demanda: SE 100+ self-hosters em 3 meses pós-launch, multi-tenant justifica. SE <20, mantém self-host puro.

**Dependências:** F-NEW-5 deploy VPS ✅, Wave 7 single-tenant cleanup ✅, decisão estratégica Willy ✅.

### F-NEW-7: Google OAuth + LGPD compliance

**Origem:** Patrick 2026-05-06 — "login com Google é interessante ter".

**Descrição:**
- Google OAuth via passport-google-oauth20 (Express) OR @react-oauth/google (client-side flow):
  - Recomendação: passport server-side (mais seguro, refresh tokens)
  - Setup: Google Cloud Console → OAuth Consent Screen + Authorized Redirect URI
  - Patrick instructions: criar projeto Cloud Console, OAuth client ID, copiar client_id+secret pra `.env` server
- Backend endpoint `/auth/google/callback` cria user OR link to existing email
- Schema: column `users.google_id` UNIQUE NULLABLE (link multiple identity providers)
- LGPD compliance docs (se hosted multi-tenant F-NEW-6):
  - Termos de uso + política de privacidade (template adapted)
  - Consentimento explícito antes de coletar token logs
  - Direito de exclusão: user requests "delete account" → cascade delete all data
  - Data export: GDPR/LGPD portability (JSON dump on request)
  - Encarregado de Dados (DPO) email se >250 users (lei brasileira)

**Por quê backlog:**
- Email/password auth atual ja funciona — Google OAuth é convenience
- LGPD só ativa se hosted multi-tenant (F-NEW-6 dependência)
- Wave 6.x foco visual — auth providers fora de scope

**Dependências:** F-NEW-5 deploy VPS ✅, F-NEW-6 multi-tenant SaaS (LGPD parte) ✅.

### F-NEW-8: PricingDrawer (custom rates per-model UI)

**Origem:** Wave 6.5 — pivotou pra backlog porque backend não suporta custom pricing.

**Descrição:**
- Schema novo: tabela `user_pricing_overrides` (user_id, model_key, input_rate, output_rate, cache_read_rate, cache_write_rate, ttl_5min_factor, created_at, updated_at)
- Backend lookup: `getModelPricing(userId, modelKey)` checa overrides primeiro, fallback PRICING hardcoded em config/pricing.ts
- Drawer canonical (lift `display/Drawer.jsx` anti-ai-design-system):
  - Side-out right, focus trap, ESC close, animation slide-in
  - Header: "Customizar pricing por modelo" + close X
  - Body: grid model picker (Sonnet/Opus/Haiku/GPT-5/etc) → form FormField rates
  - Footer: "Cancelar" + "Salvar overrides"
- SettingsPage adiciona link "Customizar pricing →" no surface section "Configurações"
- Upcoming use-case: contratos enterprise com Anthropic ($descontos), GPT models internos custos
- Reset opção: "Restaurar padrão" botão por modelo deleta override

**Por quê backlog (não Wave 6.5):**
- Backend mudança schema requerida (tabela nova + migration + endpoint CRUD)
- Wave 6.5 priorizou FormField canonical + Settings polish (entrega visual)
- Decisão estratégica: vale ROI? Maioria users usa rates default Anthropic — feature avançada

**Dependências:** Wave 7 single-tenant migration ✅, schema migration ✅, backend CRUD endpoints ✅.

---

### Como promover backlog → wave ativa

1. Patrick valida que feature paga aluguel pós-launch inicial
2. Adiciona como Wave 8/9/etc em este master-plan §"Visão geral"
3. Cria `audits/08-feature-X-spec.md` via skill apropriada (component-architect / sdd / etc)
4. Cumulativo S5+ planeja budget

---

## Próximo passo imediato

Arrancar **Wave 0** com:
- WebFetch `studioartemis.co` (typography + tom visual)
- `reference-finder --solution-scout "free claude codex token tracker dashboard"` (5 reference apps)

Output em `audits/00-references.md`. Gate: Patrick valida brand confirmed.
