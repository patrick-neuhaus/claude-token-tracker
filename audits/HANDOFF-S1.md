# Handoff Sessão 1 → Sessão 2

> **Data:** 2026-05-06
> **Branch:** `redesign/motion-ds-audit`
> **Status S1:** ✅ Waves 0-3 completas (gate per-wave skipped per autorização Patrick)
> **Próxima Sessão (S2):** Waves 4-5 — Design system + lift map

---

## Estado da branch

```
audits/
  00-master-plan.md         (waves 0-3 ✅ done; 4-7 ⏸ pendente)
  00-references.md          (Wave 0)
  01-strategy.md            (Wave 1)
  02-ux.md                  (Wave 2)
  03-motion.md              (Wave 3)
  HANDOFF-S1.md             (este file)
```

Doc total: ~75KB markdown. Zero código modificado. Branch só com docs adicionados.

---

## Decisões tomadas em S1 (locked-in pra S2+)

### Brand Artemis (Wave 0)
- **Paleta:** navy `#003899` primary, vibrant blue `#005EFF` accent, Untitled UI gray scale (10 stops), white `#FFFFFF`
- **Typography:** IBM Plex Sans (display) + Inter (body) — hipótese forte, Wave 4 confirma com Patrick antes de gerar tokens
- **Tom:** corporativo-estratégico, profissional, prático, sem floreios marketing
- **Identity gestures:** logo minimal geométrico, CTAs rounded, mídia profissional

### Posicionamento (Wave 1)
- **Tagline:** "Plausible pra Claude. Track LLM cost local, sem login."
- **Subhead:** "Track tokens e custos de Claude Code, Codex, claude.ai, ou qualquer LLM via hook customizável. Self-host docker. Dark mode. Open source."
- **ICP primary:** dev power user usando Claude Code 4+h/dia, $50+/mês LLM spend
- **Funnel:** GitHub/HN/Reddit → README/landing → trial 5 min → daily use → footer "by Artemis" → site referral → lead
- **Branding rules sutis:** footer em todas pages, login com Artemis presence, sem CTA invasivo, sem email gating
- **Distribution:** Product Hunt + HN "Show HN" + Reddit + Twitter + LinkedIn + dev.to
- **Métrica norte:** 1 lead qualificado/mês conversível em projeto Artemis

### Decisão Gamification: 🟢 PILAR PRINCIPAL (Wave 1 + Wave 2 confirmaram)
Streak counter + milestones (7/30/100/365 dias) + AchievementUnlock — entram no escopo S2/S3, não wave futura.

### Decisão Onboarding wizard: 🟢 OBRIGATÓRIO P0 (Wave 1 + Wave 2 F1)
Wizard 4 steps: source pick / install hooks / pricing review / personal goals + custom pricing detection runtime.

### Decisão Custom pricing: 🟢 CORE FLOW (Wave 1 + Wave 2 F2)
Não é setting avançado. Modal/drawer aparece ao detectar modelo desconhecido. Pricing por usuário (single-tenant). Cost retroativo recalcula.

### Tokens motion existentes ✅ mantidos (Wave 3)
`--motion-fast/base/slow/decorative` (100/200/320/480ms) + 3 cubic-beziers + reduced-motion gate. Wave 4 adiciona `--ease-back` + `--motion-celebration` + `--motion-pulse-loop`.

### Decisão Bundle motion (Wave 3): minimalista
- ✅ `canvas-confetti` (~7KB) — single-shot celebrations (#13, #15, #17)
- ❌ GSAP, Lottie, Rive, Framer Motion, Three.js — todos rejeitados

### Decisão técnica geral motion (Wave 3): CSS-first
- 11 padrões ENCAIXAR canonical Wave 9.1
- 4 padrões MODIFICAR (custom pricing drawer = CSS dual-cubic em vez de GSAP easeReverse)
- 6 padrões CRIAR ad-hoc (StreakCounter, FirstHit, etc.)
- Total bundle adicional: ~7KB (`canvas-confetti` apenas)

---

## Findings críticos (P0/P1 — entram em S3 implementação)

| ID | Finding | Severidade | Wave responsável |
|---|---|---|---|
| F1 | Onboarding wizard inexistente | P0 | S3 Wave 6 (sub-wave 6.4) |
| F2 | Custom pricing input por modelo inexistente | P0 | S3 Wave 6 + S4 Wave 7 (lógica) |
| F3 | Setup coletor 100% README-driven (sem wizard) | P0 | S3 Wave 6.4 |
| F4 | Streak counter inexistente | P1 | S3 Wave 6.7 |
| F5 | Dashboard sobrecarregado verticalmente | P1 | S3 Wave 6.1 |
| F6 | 4 componentes redundantes pra "tô estourando?" | P1 | S2 Wave 5 + S3 Wave 6.1 |
| F7 | LoginPage sem branding/credibilidade | P1 | S3 Wave 6.4 |
| F8 | Loading states inconsistentes | P2 | S3 Wave 6 (cross-page) |
| F9 | Filtros de data com 3 implementações | P2 | S3 Wave 6 (cross-page) |
| F11 | Empty Dashboard CTA fraco | P2 | S3 Wave 6.1 |
| F13 | Pricing reference ambíguo no Settings | P2 | S3 Wave 6.5 |
| F14 | Sessions row sem affordance clicável | P2 | S2 Wave 5 lift `data/AppTable.jsx` canonical |
| F12 | Achievement Notifier sem motion celebration | P2 | S3 Wave 6.7 |
| F10 | Sidebar mostra "Claude Token Tracker" + email user | P2 | S3 Wave 6.9 |
| F15-F16 | Loading raw + shortcuts no onboarding | P1 menor | S3 Wave 6 |

---

## Inputs pra S2 (Wave 4 — `ui-design-system --generate`)

### Inputs concretos
1. **Brand seed colors** — paleta Artemis confirmada
2. **Typography** — IBM Plex Sans + Inter (confirmar com Patrick antes de gerar)
3. **Product type** — operational SaaS public single-tenant prospect-facing
4. **Reference UI** — `~/Documents/Github/anti-ai-design-system/ui_kits/default/` (61 components canonical) + audit-snapshots/crm-2026-05-03/
5. **Constraints** — dark-only inicial (light mode opcional Wave 4 decide), accessibility AA baseline, brand-fitted Artemis
6. **Motion tokens existentes** (audits/03-motion.md §"Tokens motion existentes")

### Decisões pendentes pra Wave 4 confirmar com Patrick
- [ ] Typography exata (IBM Plex Sans + Inter ou outra fonte)
- [ ] Light mode entra (LoginPage usa light, resto dark) ou tracker é dark-only puro?
- [ ] Adicionar tokens motion novos (`--ease-back`, `--motion-celebration`, `--motion-pulse-loop`)?
- [ ] Pares de contraste WCAG AA pra validar com paleta Artemis (ver Wave 4 Phase 5 review)

### Phase 5 Wave 4 review BLOCKING
- Contrast em todos pares reais (text/foreground, focus-ring, surfaces)
- Hit target ≥ 24×24 CSS px
- Reflow 320 CSS px (no horizontal scroll)
- Zoom 200%/400%
- Reduced motion fallback (já implementado)
- Visual QA matrix 320/360/390/430/768/1024/1280/1366/1440/1920
- Edge case validation pra navy `#003899` (cor escura — pode falhar contraste em texto pequeno sobre dark bg)

---

## Inputs pra S2 (Wave 5 — `design-system-audit --audit` + `component-architect --plan`)

### Inputs concretos
1. **DS path:** `~/Documents/Github/anti-ai-design-system/`
2. **Tokens novos** Wave 4 (design.json gerado)
3. **Component inventory CRM template** — `audit-snapshots/crm-2026-05-03/07-component-inventory.md` lista 61 components canonical em pastas: auth (5), base (8), dashboard (4), data (3), display (16), forms (7), layout (5), navigation (6), screens (5), surfaces (2)
4. **Tracker components atuais** — `client/src/components/`: ErrorBoundary, RouteErrorBoundary, ShortcutsOverlay, achievements, admin, analytics, auth, charts, dashboard, entries, layout, markdown, projects, search, sessions, settings, shared, skills, ui

### Lift map preliminar (Wave 5 valida)
| Tracker component (atual) | DS canonical (substitui) | Razão |
|---|---|---|
| `shared/StatCard.tsx` | `dashboard/StatCard.jsx` | DS tem variante completa com trend |
| `sessions/SessionsTable.tsx` | `data/AppTable.jsx` | DS já testado em CRM, grid CSS |
| `layout/Sidebar.tsx` | `navigation/Sidebar.jsx` | DS tem 272/72px collapsible canonical |
| `layout/AppLayout.tsx` | `layout/AppLayout.jsx` + `layout/PageShell.jsx` | DS tem composição |
| `shared/PageHeader.tsx` | `layout/PageHeader.jsx` | DS tem display Lora + sub-copy |
| `shared/EmptyState.tsx` | `display/EmptyState.jsx` | signature mismatch (Wave 5 resolve) |
| `auth/LoginForm.tsx` | `auth/Login.jsx` | DS LoginScreen 50/50 split |
| `dashboard/SummaryCards.tsx` | `dashboard/KpiGrid.jsx` + `dashboard/MetricCard.jsx` | DS tem MetricGrid pattern |
| `ui/skeleton.tsx` | `display/Skeleton.jsx` | signature mismatch (Wave 5 resolve) |
| `ui/dialog.tsx` | `display/Dialog.jsx` | DS canonical com focus trap |
| `ui/tooltip.tsx` | `display/Tooltip.jsx` (Floating UI) | já alinhado |
| `ui/badge.tsx` | `display/Badge.jsx` + `display/StatusBadge.jsx` | StatusBadge separado pra cobertura status |

### Components a CRIAR (não existem em nenhum lado)
- `OnboardingWizard` (Wave 6.4) — 4 steps + state machine
- `PricingDrawer` (Wave 6.5) — modelo desconhecido detectado
- `StreakCounter` (Wave 6.7) — sidebar bottom + bump motion
- `StreakLostScreen` (Wave 6.7)
- `WebhookPing` (Wave 6.1) — empty state animated
- `Confetti` wrapper (Wave 6.7) — `canvas-confetti` integration

---

## Refresh tracker estado atual (snapshot pra S2)

### Stack técnica
- **Client:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Recharts + Sonner + React Query + React Router
- **Server:** Express + TypeScript + PostgreSQL (Docker)
- **Coletores:** Tampermonkey (claude.ai) + Python hook (Claude Code) + CLI collector (Codex)
- **Auth atual:** JWT + multi-user com role super_admin/admin (Wave 7 remove)

### Pages atuais (16)
LoginPage, DashboardPage, SkillsPage, SkillDetailPage, SystemPromptsPage, SystemPromptDetailPage, SessionsPage, SessionDetailPage, ProjectsPage, ProjectDetailPage, EntriesPage, AnalyticsPage, SessionTimePage, AchievementsPage, SettingsPage, AdminPage (vai ser removida Wave 7).

### Tokens existentes
- Cores: tokens 222° azul-cinza dark-only com variantes 4 (BUG-04 do PLAN-B aplicado: solid bg + display variants pra WCAG AA)
- Motion: completo (Wave 3 audit ✅)
- Sidebar: drama mais escura que main
- Geist Variable + Geist Mono já em uso (vai trocar pra IBM Plex Sans + Inter Wave 4)

---

## Risk register (S2 pode topar)

| Risco | Mitigação |
|---|---|
| Navy `#003899` contraste insuficiente em texto pequeno sobre dark bg | Wave 4 Phase 5 BLOCKING valida; ajusta luminosidade ou usa accent `#005EFF` como primary em dark mode |
| Typography hipótese errada (não é IBM Plex + Inter) | Wave 4 confirma com Patrick antes de Phase 3 generation |
| Components canonical CRM têm signature mismatch crítica com tracker | Wave 5 lift map identifica + Wave 6 implementa adapter layer |
| Bundle final excede ~50KB extra | Auditar build após Wave 6.1 implementação inicial; canvas-confetti substitui se necessário |
| AchievementNotifier existing tem motion incompatível | Wave 6.7 upgrade preserva API mas troca motion |

---

## Sugestão de commit S1

```bash
cd "C:/Users/Patrick Neuhaus/Documents/Github/claude-token-tracker"
git add audits/
git commit -m "$(cat <<'EOF'
docs(audits): wave 0-3 — strategy + ux + motion specs

S1 do redesign/motion-ds-audit completa (Waves 0-3).

Outputs:
- audits/00-master-plan.md   (master plan 7 waves, 3-4 sessões)
- audits/00-references.md    (brand Artemis + 4 reference apps)
- audits/01-strategy.md      (ICP + funnel + branding sutis)
- audits/02-ux.md            (16 findings Nielsen 0-4 prospect-first)
- audits/03-motion.md        (21 padrões spec canonical, ~7KB bundle)
- audits/HANDOFF-S1.md       (handoff pra S2)

Decisões locked:
- Posicionamento: "Plausible pra Claude"
- Gamification streaks = pilar principal
- Onboarding wizard 4 steps obrigatório
- Custom pricing = CORE flow runtime
- Bundle motion: ~7KB (canvas-confetti)
- Refactor admin/multi-user fica Wave 7

Próximo: S2 Wave 4 ui-design-system --generate
EOF
)"
```

---

## Próximo passo (S2)

Patrick abre nova sessão fresh. Comando inicial:

> "S2 do redesign tracker. Lê audits/HANDOFF-S1.md + audits/00-master-plan.md. Arranca Wave 4 ui-design-system --generate."

Wave 4 (esperado output): `design.json` + Tailwind config + CSS variables + 3 example components com tokens Artemis-fitted, validados WCAG AA.

Wave 5 (S2 segunda metade): `design-system-audit --audit` + `component-architect --plan` lift map.

Cumulativo S2: ~50% budget projetado. Termina com handoff S2→S3 pra implementação.
