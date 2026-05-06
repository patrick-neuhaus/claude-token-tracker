# Wave 5 — Component Architect Spec (components a CRIAR)

> **Sessão:** 2 / **Wave:** 5 (Phase B) / **Status:** ✅ done
> **Skill:** `component-architect --plan`
> **Inputs:** audits/05-deltas-and-lift.md (lift map confirma quais CRIAR) + Wave 3 motion specs + Wave 4 tokens
> **Output:** anatomy + slots + variants + contratos a11y + states pra 6 components Wave 6 + 1 backlog Wave 8

---

## Princípios

1. **Slots semantic, props determinísticas.** Anatomy explícita, sem polymorphism mágico.
2. **Estados completos.** default / hover / active / focus / disabled / loading / error — todos declarados.
3. **A11y built-in.** ARIA roles, keyboard nav, focus management — não opt-in.
4. **Reduced-motion fallback** — Iron Law motion-design Wave 3.
5. **Reusa DS canonical primitives** — Dialog, Drawer, FormField, Button — nunca recria.
6. **Single responsibility** — wizard ≠ form ≠ confetti.

---

## 1) `OnboardingWizard` — Wave 6.4

### Função
4-step modal/page wizard pra prospect first-time. Walks user através de: source pick → install hooks → pricing review → personal goals.

**Trigger:** auto-open ao primeiro login pós-account-creation OU dismiss permanente via `localStorage.onboardingComplete`.

### Anatomy

```
<OnboardingWizard>
  ┌─────────────────────────────────────────────────────────┐
  │ <Header>  step indicator (●○○○) + title + close X      │
  │ <Body>    step content (slot)                          │
  │ <Footer>  back ◀  ◀ progress dots ▶  next ▶            │
  └─────────────────────────────────────────────────────────┘
```

### Slots

- `header.title` — string (e.g. "Welcome to Token Tracker")
- `header.subtitle` — string (e.g. "Step 1 of 4 · Set up tracking")
- `body` — ReactNode (renders current step component)
- `footer.actions` — primary CTA + secondary back button (auto-rendered, override opt-in)

### Steps (state machine)

| Step | Content | Required field |
|---|---|---|
| 1. **Source pick** | Multi-checkbox: Claude Code, Codex, claude.ai, Custom. Default: nenhum. | ≥1 selected |
| 2. **Install hooks** | Auto-render based on Step 1 selection. Code blocks copy-paste. Webhook URL + token shown. "I installed" CTA confirms. | bool ack |
| 3. **Pricing review** | Detected models from Step 1 + estimated pricing per token (Claude Sonnet $3/MTok input etc). User pode editar inline (CORE FLOW Wave 1 F2). | confirm |
| 4. **Personal goals** | Optional: monthly budget cap + alert threshold (% used) + streak goal. Skip OK. | (optional) |

### Props

```ts
interface OnboardingWizardProps {
  open: boolean;
  onComplete: (config: OnboardingConfig) => void;
  onSkip: () => void;
  initialStep?: 1 | 2 | 3 | 4;  // default 1
}

interface OnboardingConfig {
  sources: Array<'claude-code' | 'codex' | 'claude-ai' | 'custom'>;
  hooksInstalled: boolean;
  pricing: Record<string, { input: number; output: number; cache?: number }>;
  monthlyBudgetCap?: number;
  alertThreshold?: number;
  streakGoal?: number;
}
```

### Variants
- `position`: 'modal' (default desktop) | 'fullscreen' (mobile <768px) — auto-detect.

### Estados

| State | Comportamento |
|---|---|
| default | Step 1 ativo, ◀ disabled, ▶ enabled if requirement met |
| validating | ▶ disabled + spinner durante webhook ping (Step 2 confirm), pricing fetch (Step 3) |
| step transition | Slide horizontal motion (Wave 3 spec #11) |
| error | Helper text vermelho + shake (motion #4) |
| reduced-motion | Crossfade 200ms (Wave 3 fallback) |

### A11y
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (header.title)
- Focus trap (Radix Dialog wrapper)
- ESC fecha (com confirmação se `step > 1`)
- Tab navigation entre fields + footer buttons
- ARIA live region anuncia mudança de step ("Step 2 of 4")
- Cada step input tem label associated (form-field-label-float Wave 3 #3)

### Motion (Wave 3 spec #11)
- Forward: cubic-bezier(0.2, 0, 0, 1) emphasized 320ms
- Back: cubic-bezier(0, 0, 0.2, 1) 320ms
- Reduced motion: crossfade 200ms

### Bundle cost
- Zero (CSS transitions + state machine via React useState/useReducer)

---

## 2) `PricingDrawer` — Wave 6.5

### Função
Drawer right-side aparece quando tracker detecta entry com modelo desconhecido (não em pricing.ts). User inputa pricing → tracker recalcula custo retroativo.

**Trigger:** entry recebida com `model NOT IN known_models` → emit event → drawer abre.

### Anatomy

```
<PricingDrawer>
  ┌─────────────────────────────────────────┐
  │ <Header>  "New model: gpt-4o-2026"     │
  │           "Add pricing to track cost"   │
  │           [×]                           │
  │                                         │
  │ <Body>                                  │
  │   ┌─ Pricing form ──────────────────┐  │
  │   │ Input  $/MTok    [____] USD     │  │
  │   │ Output $/MTok    [____] USD     │  │
  │   │ Cache  $/MTok    [____] (opt)   │  │
  │   │                                  │  │
  │   │ ☐ Recompute past entries (5)    │  │
  │   └──────────────────────────────────┘  │
  │                                         │
  │   <ReferenceLinks>                      │
  │     • OpenAI pricing page               │
  │     • Anthropic pricing page            │
  │                                         │
  │ <Footer>                                │
  │   [Skip] [Save pricing]                 │
  └─────────────────────────────────────────┘
```

### Slots

- `header.title` — auto: "New model: {modelName}"
- `header.subtitle` — auto: "Add pricing to track cost"
- `body` — form (auto-rendered)
- `footer.actions` — Save + Skip (auto)

### Props

```ts
interface PricingDrawerProps {
  open: boolean;
  modelName: string;
  detectedFrom?: 'claude-code' | 'codex' | 'claude-ai' | 'custom';
  unknownEntriesCount: number;
  onSave: (pricing: ModelPricing) => Promise<void>;
  onSkip: () => void;
}

interface ModelPricing {
  modelName: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cachePerMTok?: number;
  recomputeRetroactive: boolean;
}
```

### Estados

| State | Comportamento |
|---|---|
| default | Form vazio, Save disabled |
| filling | Save enabled when input + output > 0 |
| validating | Save spinner (button-loading-async Wave 3 #2) |
| success | Toast Sonner success "Pricing saved · 5 entries recomputed" + drawer fecha |
| error | Toast destructive + form preserva input |

### Motion (Wave 3 spec #7 modal/drawer)
- Open: cubic-bezier(0.2, 0, 0, 1) 320ms — translateX(100% → 0)
- Close: cubic-bezier(0, 0, 0.2, 1) 280ms (espelha)
- Reduced motion: snap (transition 0ms)

### A11y
- `role="dialog"` + `aria-modal="true"`
- ESC + click outside fecha (com confirm se form modified)
- Focus auto pro primeiro input
- Tab cycle dentro do drawer
- Number inputs com `inputmode="decimal"` mobile

### Bundle cost
- Zero (Radix Dialog/Drawer + form state)

---

## 3) `StreakCounter` — Wave 6.7

### Função
Persistent UI element (sidebar bottom) mostrando current streak. Bump motion no incremento (rollover meia-noite).

**Trigger:** sempre visible em sidebar pós-onboarding. Updates via polling/websocket.

### Anatomy

```
┌─ Sidebar bottom ──────────┐
│ ┌──────────────────────┐  │
│ │ 🔥 7 day streak      │  │
│ │ Keep going!          │  │
│ └──────────────────────┘  │
└──────────────────────────┘
```

### Slots
- `flame` — icon component (default: Flame from lucide)
- `label` — auto: "{N} day streak" (i18n)
- `subtitle` — varia por state (current/lost/at-risk)

### Props

```ts
interface StreakCounterProps {
  current: number;
  longest: number;
  state: 'current' | 'at-risk' | 'lost';
  lastEntryAt: Date | null;
  onClick?: () => void;  // navigates to /achievements
}
```

### Estados

| State | Comportamento |
|---|---|
| current (>0) | Flame icon orange + count tabular-nums + "Keep going!" |
| at-risk (24h-48h sem entry) | Flame icon yellow + count + "Add entry today!" |
| lost (current === 0) | Flame icon gray-400 (extinguished) + "Start a new streak!" + StreakLostScreen modal opt-in |
| zero (first ever, count 0) | Hide ou show "Start tracking to begin streak" |

### Motion (Wave 3 spec #14)
- Bump on increment: scale 1 → 1.15 → 1 + color flash 200ms — `--motion-decorative` 480ms (alias `--motion-page` 400ms Wave 4)
- Easing: ease-out
- Reduced motion: skip scale + skip color flash. Number troca instant.

### A11y
- `aria-live="polite"` anuncia "Streak: 7 days"
- `<button>` semantic se onClick definido (tabbable, ENTER/SPACE)
- Color contrast: orange flame vs sidebar bg passa 3:1+ (validate Wave 6.7)
- Tooltip on hover: "Last entry: 2 hours ago"

### Bundle cost
- Zero (CSS keyframe + React useEffect detect prev value)

---

## 4) `StreakLostScreen` — Wave 6.7

### Função
Modal/inline screen mostrado UMA VEZ quando user volta após perder streak. Mensagem empática, sem motion punitiva.

**Trigger:** entry on Dashboard with `streak.current === 0 && streak.previousValue > 0` AND não dismissed na sessão.

### Anatomy

```
┌─ Modal ────────────────────────────────────┐
│ ┌────────────────────────────────────────┐ │
│ │ 💧 (extinguished flame icon)          │ │
│ │                                        │ │
│ │ Strike one — back at it tomorrow.      │ │
│ │                                        │ │
│ │ Streak anterior: 12 dias.              │ │
│ │ Personal best: 23 dias.                │ │
│ │                                        │ │
│ │ [Reset and start fresh]                │ │
│ │                                        │ │
│ │ [Dismiss]                              │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Slots
- `icon` — auto (extinguished flame ou drop)
- `title` — "Strike one — back at it tomorrow."
- `description` — multi-line, mostra previous + best
- `actions` — Primary "Reset and start fresh" + secondary "Dismiss"

### Props

```ts
interface StreakLostScreenProps {
  open: boolean;
  previousStreak: number;
  longestStreak: number;
  onReset: () => void;
  onDismiss: () => void;
}
```

### Estados
- Default modal entrance (Wave 3 spec #16 — fade in 320ms ease-in-out, sem shake/red flash)
- Reduced motion: snap fade (opacity sem transition)

### Motion (Wave 3 spec #16)
- Entry: opacity 0 → 1 + 320ms ease-in-out
- **NÃO usa scale, shake, vibrate, red flashing**
- Reduced motion: snap

### A11y
- `role="alertdialog"` (não dialog) — mais sério
- `aria-labelledby` (title) + `aria-describedby` (description)
- Focus auto pro botão "Reset" (recovery option ganha foco)
- ESC dismiss
- Color: muted neutral, NÃO destructive (UX empático)

### Bundle cost
- Zero

---

## 5) `WebhookPing` — Wave 6.1

### Função
Empty state Dashboard quando user setup completed mas `entries.count === 0`. Pulse loop comunica "system active, aguardando webhook".

**Trigger:** Dashboard mount + `onboardingComplete && entries.count === 0`. Auto-stop on first entry → transition pra FirstHit celebration #13.

### Anatomy

```
┌─ Dashboard center ─────────────────────────┐
│              ●  (pulsing dot)              │
│                                            │
│      "Aguardando primeiro hit..."         │
│                                            │
│      Webhook configured · ✓               │
│      Token: ck_*****                       │
│                                            │
│      [Test webhook] [View setup]           │
└────────────────────────────────────────────┘
```

### Slots
- `dot` — pulsing visual (default green/accent)
- `title` — "Aguardando primeiro hit..."
- `subtitle` — webhook status + token preview
- `actions` — secondary buttons (test webhook + view setup)

### Props

```ts
interface WebhookPingProps {
  webhookUrl: string;
  tokenPreview: string;  // "ck_*****abc"
  onTestWebhook: () => void;
  onViewSetup: () => void;
  onFirstHit?: () => void;  // callback when entry detected
}
```

### Estados

| State | Comportamento |
|---|---|
| pulsing | Default — dot pulses, "aguardando..." |
| test-pending | Spinner no test button, dot pause |
| test-success | Toast Sonner + dot continues pulsing |
| test-fail | Toast destructive |
| first-hit (transitioning) | Dot stop pulse + transition to celebration confetti #13 |

### Motion (Wave 3 spec #12)
- Pulse loop: opacity 0.6 ↔ 1 + scale 1 ↔ 1.05 — `--motion-pulse-loop 2s` ease-in-out infinite
- Auto-stop: ao primeiro entry chegar
- Reduced motion: static dot (sem pulse), texto mantido

### A11y
- `role="status"` + `aria-live="polite"`
- Buttons keyboard accessible
- Pulse não atrapalha leitura (separado do texto)

### Bundle cost
- Zero (CSS keyframes)

---

## 6) `Confetti` (wrapper) — Wave 6.7

### Função
Wrapper pra `canvas-confetti` lib (~7KB gzipped MIT). Single-shot celebrations padronizadas (FirstHit, AchievementUnlock, StreakMilestone).

**Trigger:** chamado imperativamente via `<Confetti.fire />` ou `useConfetti()` hook.

### Anatomy
Não tem visual próprio — só dispara canvas overlay layer (z-index 9999, full viewport).

### API

```ts
// Component (declarative — opt-in fires when prop changes)
<Confetti
  fire={shouldFire}
  intensity="modest"  // 'modest' | 'medium' | 'big'
  origin={{ x: 0.5, y: 0.0 }}
  colors={[
    'hsl(var(--accent))',
    'hsl(var(--primary))',
    'hsl(var(--brand-blue-light))',
  ]}
  duration={800}
  onComplete={() => setFire(false)}
/>

// Hook (imperative)
const fire = useConfetti();
fire({ intensity: 'big', origin: { y: 0.0 } });
```

### Variants intensity

| Intensity | Particles | Spread | Duration |
|---|---|---|---|
| `modest` | 60-80 | 70° | 800ms (Wave 3 #13 default) |
| `medium` | 100-150 | 90° | 1000ms (AchievementUnlock #17) |
| `big` | 150-250 | 120° | 1500ms (StreakMilestone #15) |

### Estados

| State | Comportamento |
|---|---|
| inactive | Nothing rendered |
| firing | Canvas overlay + particles physics |
| reduced-motion | NÃO dispara — mostra apenas toast Sonner como fallback |

### Motion (Wave 3 specs #13/#15/#17)
- Driven by canvas-confetti lib physics
- Reduced-motion guard inside wrapper: detecta `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → skip fire

### A11y
- Confetti é decorative-only — `aria-hidden="true"` no canvas
- Substituto via Sonner toast garante não-visual users recebem feedback
- Não bloqueia interaction (canvas pointer-events: none)
- Cleanup obrigatório: `useEffect` return removes canvas ref

### Bundle cost
- `+7KB gzipped` (canvas-confetti MIT). Único bundle adicional Wave 6.

---

## 7) `TokenEditor` (BACKLOG Wave 8 — F-NEW-1)

### Função
In-app theme customizer. User troca accent → auto-deriva primary/ring/sidebar/decorative + WCAG validation real-time + preview live + export CSS.

**Trigger:** /settings page tab "Appearance" OR `XP >= 5` unlock if F-NEW-2 implementado.

### Reusa
`anti-ai-design-system/ui_kits/default/components/showcase/TokenEditorPreview.jsx` (640 lines) — port direto pra TS + integrar com tracker tokens.

### Anatomy mínima (detalhe Wave 8 spec)

```
<TokenEditor>
  Tabs: [Basic] [Advanced]
  
  Basic:
    - Color input (accent seed)
    - Light/Dark/Auto toggle (Wave 4 dark-only foi MVP, TokenEditor permite expand)
    - Derived swatches (primary, ring, decorative)
    - Accent fg override (advanced opt-in)
  
  Advanced:
    - All tokens individually (groups: Marca, Status, Sidebar, Surfaces)
  
  WCAG panel (real-time pairs ratio)
  Actions: [Reset] [Save theme] [Export CSS]
</TokenEditor>
```

### Pendency Wave 8
- Persistence: localStorage MVP, DB se Wave 7 single-tenant migration ativa
- XP gating (F-NEW-2): hidden até `xp >= 5`
- Light mode preset (F-NEW-3): se Patrick decidir adicionar

### Bundle cost
- ~10KB (TokenEditorPreview ported + chroma-js dep ~30KB OR replicate native helpers)

---

## Pre-delivery checklist Wave 5

- [x] Lift map definitivo per categoria (audits/05-deltas-and-lift.md)
- [x] Decisão ENCAIXAR/MODIFICAR/CRIAR per component (74 .tsx)
- [x] Components a CRIAR têm anatomy + slots + variants + props + estados + motion + a11y + bundle
- [x] Reduced-motion fallback declarado por component (Iron Law motion-design)
- [x] Boundaries respeitadas (componente reusa DS canonical primitives, não recria Dialog/Drawer/FormField etc)
- [x] Bundle cost projetado (~7KB Wave 6 +canvas-confetti, ~10KB Wave 8 backlog +TokenEditor)
- [x] Wave 6 sub-waves identificadas + ordem por job frequency
- [x] Risks Wave 6 documentados + mitigations
- [x] Tokens Wave 4 delta report incluído

---

## Próximo passo

Handoff S2 → S3 via `audits/HANDOFF-S2.md` com:
- Decisões Wave 4 + Wave 5 consolidadas
- Lift map + components a CRIAR refs
- Wave 6 sub-waves order
- Risks + mitigations
- Inputs concretos pra S3 implementação

S3 abre fresh + lê HANDOFF-S2 + arranca Wave 6.1 (Dashboard).
