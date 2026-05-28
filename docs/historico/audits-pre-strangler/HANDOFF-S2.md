# Handoff Sessão 2 → Sessão 3

> **Data:** 2026-05-06
> **Branch:** `redesign/motion-ds-audit`
> **Status S2:** ✅ Waves 4-5 completas (Patrick autorizou seguir sem gate-per-wave)
> **Próxima Sessão (S3):** Wave 6 — Implementação visual page-by-page

---

## Estado da branch

```
audits/
  00-master-plan.md             (waves 0-5 ✅ done; 6-7 ⏸ pendente; backlog 8+ documentado)
  00-references.md              (Wave 0)
  01-strategy.md                (Wave 1)
  02-ux.md                      (Wave 2)
  03-motion.md                  (Wave 3)
  04-tokens.json                (Wave 4 — design.json)
  04-tokens.css                 (Wave 4 — CSS variables dark mode)
  04-tokens-spec.md             (Wave 4 — decisões + scorecard 117/120)
  04-wcag-report.md             (Wave 4 — 19 pairs, 18 pass)
  05-deltas-and-lift.md         (Wave 5 — lift map definitivo per component)
  05-component-architect.md     (Wave 5 — anatomy 7 components a CRIAR)
  HANDOFF-S1.md                 (handoff S1 anterior)
  HANDOFF-S2.md                 (este file)
  scripts/
    generate-tokens.mjs         (Wave 4 — Node script reproducible)
```

Doc total S1+S2: ~145KB markdown + 11KB JSON + 5KB CSS + 27KB JS = ~188KB. Zero código tracker modificado ainda. Branch só com docs + scripts.

---

## Decisões tomadas em S2 (locked-in pra S3+)

### Wave 4 — Tokens Artemis-fitted

- **Paleta literal aplicada** (Patrick passou completa Q1)
- **Primary efetivo dark mode = `#0848C5`** (blueDark Artemis ladder), não `#003899` (navy)
- **Navy `#003899`** fica `--brand-navy` decorative-only (logo, hero login, brand identity gestures)
- **Border = `#667085`** (Untitled gray-400) — bumped pra passar 3:1 vs surface
- **Foreground SEMPRE hue-tinted** (gray-050 = `#F2F4F7` hue 216°), nunca pure white (Iron Law canonical)
- **Focus ring usa `--accent`** (`#005EFF` vibrant blue), não primary
- **Typography:** IBM Plex Sans (display) + Inter (body) + Geist Mono (mono) — confirmadas Patrick
- **Mode:** dark only (Patrick Q5 decisão)
- **Motion canonical-aligned via aliases híbridos** (Q2):
  - `--motion-base = var(--motion-normal)` (200ms)
  - `--motion-decorative = var(--motion-page)` (400ms — era 480ms, ajusta -80ms)
  - `--ease-emphasized = var(--ease-out)` alias
  - `--ease-back` Wave 3 → renomeia pra `--ease-spring` canonical
- **Artemis extensions** (não-canonical):
  - `--motion-celebration` 800ms (FirstHit confetti)
  - `--motion-pulse-loop` 2s (WebhookPing)
  - `--brand-navy/blue-deep/dark/mid/light/vivid` ladder
- **WCAG validation:** 18/19 pares pass. 1 fail trade-off físico documentado (primary navy/blueDark vs dark bg adjacent — sempre AAA quando usado como fill+fg, falha como UI graphic standalone — solução: usa `--ring` accent pra bordas/focus).
- **Tokens reproducible via `audits/scripts/generate-tokens.mjs`** — Node puro, zero deps. Re-run anytime.

### Wave 5 — Lift map + Component architect

- **74 tracker components categorizados:** 7 ENCAIXAR + 32 MODIFICAR + 28 MANTÉM tracker-specific + 1 DELETE Wave 7 + 6 CRIAR Wave 6 + 1 CRIAR Wave 8 backlog
- **Reusa DS canonical sempre que possível** — `Button`, `Dialog`, `Drawer`, `Tooltip`, `FormField`, `AppTable`, `KpiGrid`, `Sidebar`, `PageHeader`, `EmptyState`, etc
- **Components a CRIAR têm anatomy completa** spec'd em `05-component-architect.md`
- **Bundle adicional Wave 6:** ~7KB (canvas-confetti only). Zero GSAP/Lottie/Three/Framer Motion.
- **Sub-waves Wave 6 ordem confirmada:** 6.1 Dashboard → 6.2 Sessions → 6.3 Analytics → 6.4 Login+Onboarding → 6.5 Settings → 6.6 Skills/SP (pending) → 6.7 Achievements+Streaks → 6.8 Cleanup → 6.9 Shell global

---

## Components a CRIAR Wave 6 (specs em audits/05-component-architect.md)

| # | Component | Wave 6 sub-wave | Bundle |
|---|---|---|---|
| 1 | OnboardingWizard | 6.4 | 0KB (CSS + state machine) |
| 2 | PricingDrawer | 6.5 | 0KB (Radix Dialog wrapper) |
| 3 | StreakCounter | 6.7 | 0KB (CSS keyframe) |
| 4 | StreakLostScreen | 6.7 | 0KB (CSS transition) |
| 5 | WebhookPing | 6.1 | 0KB (CSS keyframes) |
| 6 | Confetti wrapper | 6.7 | +7KB (canvas-confetti) |
| 7 (BACKLOG) | TokenEditor | Wave 8 | +10KB (port TokenEditorPreview canonical) |

---

## Inputs pra S3 (Wave 6 — implementação)

### Aplicar tokens Wave 4

`audits/04-tokens.css` é drop-in replacement pra `client/src/index.css`. Wave 6 começa pelo:

```bash
# Wave 6.1 step 1
cp audits/04-tokens.css client/src/index.css.new
# Merge con index.css existente (preservar @tailwind base + reduced-motion gate)
```

### Tailwind config update

`client/tailwind.config.ts` precisa adicionar:
- `--brand-navy/blue-*` extensions
- `--motion-celebration/pulse-loop` extensions
- Confirma fontFamily `display`/`body`/`mono` apontam pros tokens

### Web fonts loader

Adicionar `index.html` ou via `@import` em CSS:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Inter:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Lift order per sub-wave

Cada sub-wave Wave 6 segue esta sequência:
1. Lê audits/05-deltas-and-lift.md categoria correspondente
2. Identifica components MODIFICAR + CRIAR pra essa wave
3. Implementa: rename props (signature mismatch), port .jsx → .tsx, adapter shims
4. Testa visual (dev server) + tsc check + a11y manual (keyboard tab + screen reader)
5. Commit atomic `feat(ux): wave 6.X <page> redesign`

### Components a CRIAR — Wave 6.4 specifically (Login + Onboarding)

**Maior risk Wave 6** — F7 (Wave 2 P1) + F1 (Wave 2 P0):
- LoginPage atual = 23 lines centered card sem branding (Wave 2 finding F7 P1)
- DS canonical `auth/LoginScreen.jsx` = 50/50 split com hero left + form right
- OnboardingWizard CRIAR = 4-step state machine (Wave 5 spec)
- Hero motion #18 stagger + wizard motion #11 horizontal slide

**Plano sub-wave 6.4:**
1. Setup web fonts (block 1 above)
2. Lift `auth/Login.jsx` canonical → `LoginPage.tsx` (50/50 split)
3. CRIAR `OnboardingWizard` component (audits/05-component-architect.md spec)
4. Wire LoginPage → onLoginSuccess → check localStorage onboardingComplete → trigger OnboardingWizard
5. Implement step state machine (Steps 1-4)
6. Hero motion #18 stagger CSS animation-delay
7. Wizard motion #11 slide horizontal CSS transitions
8. Reduced-motion fallback (Wave 3 spec)
9. WCAG keyboard nav + ARIA live + focus trap

---

## Risks Wave 6 (pivot points)

| Risk | Probabilidade | Mitigação |
|---|---|---|
| AppTable signature mismatch quebra SessionsTable | High | Wave 6.2 BLOCKING dedicada migração. Adapter intermediário se necessário. |
| Charts canonical Chart.jsx não cobrir 100% Recharts variants | Medium | Wave 6.3 review: extender DS Chart se gap. Manter Recharts wrapper se cleaner. |
| LoginScreen 50/50 quebrar mobile (320-768px) | Medium | Wave 6.4 valida 320px reflow. Stack vertical breakpoint < 768. |
| OnboardingWizard state machine bugs | High | Wave 6.4 testes manuais 4 steps + validation per gate. |
| Component canonical .jsx → .tsx port introduz tipos errados | Medium | tsc check per lift + manual review props |
| Tokens Wave 4 introduzem regressão visual subtle | Low | Wave 6.1 visual QA matrix viewports primeiros |
| Bundle final excede ~50KB extra (Wave 4 spec) | Low | Auditar build após Wave 6.1. canvas-confetti substitui se necessário. |

---

## Pendências resolver no início de S3

### 1. Skills/SystemPrompts modelo (a/b/c) — diferida S1

Sub-wave 6.6 detalha Skills/SystemPrompts pages baseado em estado atual (provavelmente opção (b) showcase Patrick hardcoded — ângulo branding mais forte). Patrick decide concretamente quando chegar lá.

### 2. F-NEW-1 Token Editor in-app — backlog Wave 8

Patrick mencionou ideia + XP gating. Documentado em master-plan §"Backlog Wave futura". NÃO implementa Wave 6 — desvia do core.

### 3. Wave 7 lógica fix (condicional)

Master plan §"Wave 7" cobre:
- Refactor admin out (single-tenant migration)
- Bug pricing.ts modelos não puxam (já no working tree pre-existing edit)
- Custom pricing input (PricingDrawer Wave 6.5 cobre frontend, Wave 7 backend)
- trident final review

Wave 7 só inicia após Wave 6 visual completo + Patrick validar.

---

## Cumulativo S2

- **Budget atual:** ~50% projetado. Vou verificar context-guardian se passar 70% antes de S3.
- **Files criados:** 6 docs + 1 script + 1 CSS + 1 JSON
- **Commits S2:** 9243602 (S1 pendency) + 4a0e890 (Wave 4) + commit Wave 5 (próximo)

---

## Próximo passo (S3)

Patrick abre nova sessão fresh. Comando inicial:

> "S3 do redesign tracker. Lê audits/HANDOFF-S2.md + audits/00-master-plan.md. Arranca Wave 6.1 (Dashboard)."

Wave 6.1 (esperado output):
- `client/src/index.css` substituído por `audits/04-tokens.css` merged
- `client/tailwind.config.ts` updated com extensions
- Web fonts loaded em index.html
- Lift Dashboard components: StatCard/SummaryCards/Charts pra DS canonical
- WebhookPing CRIAR
- Visual QA + a11y validation

---

## Suggestion commit S2 (final)

```bash
cd "C:/Users/Patrick Neuhaus/Documents/Github/claude-token-tracker"
git add audits/
git commit -m "$(cat <<'EOF'
feat(audits): wave 5 — lift map + component architect

Cruza 74 tracker components atuais vs 61 canonical CRM template:
- 7 ENCAIXAR (lift direto)
- 32 MODIFICAR (lift + adapter shim)
- 28 MANTÉM tracker-specific
- 1 DELETE Wave 7 (admin)
- 6 CRIAR Wave 6 + 1 CRIAR Wave 8 backlog

Components a CRIAR (anatomy + slots + variants + props + states +
motion + a11y + bundle):
- OnboardingWizard (Wave 6.4) — 4-step wizard
- PricingDrawer (Wave 6.5) — modelo desconhecido detection
- StreakCounter (Wave 6.7) — sidebar bottom + bump motion
- StreakLostScreen (Wave 6.7) — empático sem motion punitiva
- WebhookPing (Wave 6.1) — empty state pulse loop
- Confetti wrapper (Wave 6.7) — canvas-confetti +7KB
- TokenEditor (Wave 8 BACKLOG) — in-app theme customizer

Bundle Wave 6: +7KB total (canvas-confetti). Zero GSAP/Lottie/Three.

Outputs:
- audits/05-deltas-and-lift.md       (lift map definitivo)
- audits/05-component-architect.md   (anatomy components a CRIAR)
- audits/HANDOFF-S2.md               (handoff S2 → S3)

Próximo: S3 Wave 6.1 (Dashboard) implementação visual.
EOF
)"
```
