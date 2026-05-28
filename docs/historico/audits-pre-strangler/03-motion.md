# Wave 3 — Motion Spec (motion-design --full)

> **Sessão:** 1 / **Wave:** 3 / **Status:** ✅ done (gate skipped per autorização Patrick "pode seguir sem medo")
> **Skill:** `motion-design --full`
> **Phase 4 validation gate:** explicitly skipped — Patrick autorizou seguir S1 sem gate-per-wave; specs ficam disponíveis pra revisão posterior.
> **Deliverables:** spec canonical 21 padrões + embasamento teorico P2 + tokens audit + bundle cost.

---

## Phase 0 — Session narrative (fast-forward)

Consolidado das Waves 0-2. Não re-pergunto.

> Tracker = operational SaaS single-tenant prospect-facing, dark-only desktop primário (1280-1920+). Persona = dev power user (4+h/dia Claude Code, $50+/mês LLM spend) primeira vez baixando como free tool isca pra Studio Artemis. Brand: navy `#003899` + accent `#005EFF` + Untitled UI gray + IBM Plex Sans + Inter. Frequência alta pra Patrick (J1 ~50x/dia) mas first-time crítico (J0 prospect onboarding). Pilares: P1 funcional DOMINANTE; P2 brand-heavy permitido APENAS em login/onboarding/celebrations/streaks. P3/P4 não cabem.

---

## Phase 1 — Pattern lookup

**Lookup map → SaaS operacional:** `references/01-funcional-estrutural.md` (DOMINANTE) + `references/06-theoretical-foundations.md` + `references/13-microinteractions-canonical.md` (Wave 9.1 — 18 patterns canonical).

**Patterns primários encontrados:**
- microinteractions canonical: 1, 2, 3, 4, 5, 6, 8, 9, 10
- modal easeReverse: 7
- form-field-label-float: 3
- form-validation-feedback: 4
- toast-sonner: 5 (já em uso)
- tooltip-floating-ui: 6
- button-press-compress: 1
- button-loading-async: 2
- skeleton: 8

**Patterns ad-hoc (não canonical Wave 9.1, criar do zero):**
- WebhookPing pulse (12)
- FirstHit celebration (13)
- StreakCounter bump (14)
- StreakMilestone (15)
- StreakLost screen (16)
- AchievementUnlock (17)
- LoginPage hero entrance (18) — adapta `references/02-vetorial-branding`
- Chart entry (19)
- KPI delta micro-interaction (20)
- PageHeader entrance (21)
- OnboardingWizard transitions (11)

---

## Phase 2 — Decisões por padrão (encaixar/modificar/criar)

| # | Padrão | Modo | Source/Justificativa |
|---|---|---|---|
| 1 | button-press-compress | **ENCAIXAR** | Wave 9.1 canonical match perfeito |
| 2 | button-loading-async | **ENCAIXAR** | Wave 9.1 canonical |
| 3 | form-field-label-float | **ENCAIXAR** | Wave 9.1 canonical |
| 4 | form-validation-feedback | **ENCAIXAR** | Wave 9.1 canonical |
| 5 | toast-sonner | **ENCAIXAR** | Sonner já em uso (`AppLayout.tsx:64`) |
| 6 | tooltip-floating-ui | **ENCAIXAR** | Radix já é dep (shadcn TooltipProvider em `App.tsx:5`) |
| 7 | modal/drawer easeReverse | **MODIFICAR** | easeReverse 2026 é GSAP-specific. Bundle 50KB ~ não paga aluguel. Substituir por CSS dual-cubic-bezier (forward/back invertido). |
| 8 | skeleton consistent | **ENCAIXAR** | Pattern padrão CSS pulse |
| 9 | sidebar nav active | **ENCAIXAR** | CSS transition simples |
| 10 | KPI count-up | **MODIFICAR** | `react-countup` (~3KB) ou impl manual rAF — NÃO GSAP |
| 11 | OnboardingWizard transitions | **CRIAR** | Slide horizontal CSS transform — não tem canonical |
| 12 | WebhookPing pulse | **CRIAR** | CSS `@keyframes pulse` simples — paga aluguel "system active" |
| 13 | FirstHit celebration | **CRIAR** | `canvas-confetti` (~7KB gzipped) + toast Sonner. Single-shot, modesto. |
| 14 | StreakCounter bump | **CRIAR** | CSS keyframe scale 1→1.15→1 + color flash. Decorative 480ms (token existente). |
| 15 | StreakMilestone | **CRIAR** | Modal Radix + canvas-confetti + sound opt-in. |
| 16 | StreakLost screen | **CRIAR** | Fade in 320ms + texto empático estático. Sem motion punitivo. |
| 17 | AchievementUnlock | **MODIFICAR** | `AchievementNotifier` já existe — upgrade com confetti reuse de #13 |
| 18 | LoginPage hero entrance | **CRIAR** | CSS animation-delay stagger — não precisa GSAP |
| 19 | Chart entry | **MODIFICAR** | Recharts tem prop `animationDuration` nativo — só configurar |
| 20 | KPI delta arrow | **CRIAR** | CSS keyframe scale + color flash 200ms |
| 21 | PageHeader entrance | **ENCAIXAR** | CSS fade in 200ms ease-out (route transition) |

**Score geral:** 21/21 padrões catalogados. 11 encaixar (Wave 9.1 canonical) + 4 modificar + 6 criar. Zero requer GSAP. Zero requer Three.js/WebGL.

**Decisão técnica global:** **CSS transitions/keyframes (90%) + WAAPI pontual (5%) + canvas-confetti (5%)**. Bundle adicional projetado: **~10KB** (`canvas-confetti` ~7KB + `react-countup` ~3KB ou impl manual zero).

---

## Phase 3 — Embasamento teorico (P2 decorativos)

> Cada padrão P2 declara princípio violado se não existir + alternativa rejeitada.

### LoginPage hero entrance (#18)
- **Gestalt common fate:** elementos entram juntos (tagline + bullets + form) = pertencem ao mesmo grupo. Stagger 60ms reforça grupo sem perder simultaneidade.
- **Attention economy:** first-fold dev prospect ancora qualidade percebida em <2s. Estática = parece WIP.
- **Easing semantics:** ease-out 200ms transmite "decisão concluída, produto pronto". Ease-in seria errado (começa lento, parece emperrado).
- **Anti-pattern evitado:** scale(0) entrada porque parece spawn de jogo barato. Use `opacity 0 → 1 + translateY(8px → 0)` que comunica "subi pro lugar".

### OnboardingWizard transitions (#11)
- **Gestalt continuity:** slide horizontal preserva continuidade espacial — wizard avança X positivo. Reverse (back) pra X negativo. Mental model = stack horizontal.
- **Easing semantics:** emphasized cubic-bezier(0.2, 0, 0, 1) para forward = sistema decisivo. Reverse usa cubic-bezier(0, 0, 0.2, 1) = decisivo na entrada do destino.
- **Anti-pattern evitado:** crossfade puro porque perde direcionalidade do progresso (next vs back fica idêntico).

### WebhookPing pulse (#12)
- **Attention economy + Visibility of system status (Nielsen #1):** pulse comunica "checkando webhook... aguardando primeira métrica". Sem motion = parece travado.
- **Iron Law 8 inverse (loop = ruído) NÃO aplica:** loop subtle paga aluguel ao explicar wait state. Auto-pause após primeiro hit (não é decoração permanente).
- **Easing semantics:** ease-in-out infinito 2s = respiração calma, não ansiedade. Linear seria mecânico, ease-bounce seria ansioso.

### FirstHit celebration (#13)
- **Attention economy:** marco emocional raro (1× por usuário). Vale celebração modesta. Confetti 60-80 partículas, não 500.
- **Easing semantics:** ease-out emphasized 800ms = "chegou, agora descansa". Single-shot, não loop.
- **Anti-pattern evitado:** confetti excessivo (>200 partículas) porque vira festa de aniversário. Modesto = "achievement unlocked, segue jogo".

### StreakCounter bump (#14)
- **Common fate + state change:** número incrementa = state change. Bump scale 1→1.15→1 + color flash comunica "isso mudou agora, não é estático".
- **Iron Law 1 paga aluguel:** sem bump, user não nota incremento (number swap visualmente igual).
- **Easing semantics:** ease-out 480ms decorative = celebra mas não atrapalha. Spring/bounce overshoot = excesso de drama pra evento diário.

### StreakMilestone (#15)
- **Attention economy:** marco RARO (7/30/100/365 dias). Justifica delight permitido. Modal interrompe propositalmente — paga aluguel ao demarcar conquista.
- **Easing semantics:** modal entry ease-out 320ms + confetti seguido. Sound opt-in (default off pra prospect-first não assustar).
- **Anti-pattern evitado:** modal sem dismiss claro porque vira prison. Manter X visível + ESC + click outside.

### StreakLost screen (#16)
- **Empatia > punição:** fade in 320ms texto "Strike one — back at it tomorrow". SEM motion negativa (shake, glitch, vermelho piscando).
- **Easing semantics:** linear ou ease-in-out neutro. Ease-out = celebra (errado). Ease-in = drama (errado).
- **Anti-pattern evitado:** vibrate/shake porque perpetua sentimento de fracasso no body. Mensagem sóbria = retorno mais provável.

### AchievementUnlock (#17)
- **Common fate + closure:** badge revela + confetti = grupo de elementos celebra mesmo evento.
- **Reuse #13 confetti params:** consistência visual entre FirstHit e Achievement.
- **Easing semantics:** badge entry com `--ease-back` cubic-bezier(0.34, 1.56, 0.64, 1) = overshoot tátil "saltou pra dentro".

---

## Phase 5 — Spec canonical por padrão

### Spec template referência

```
Padrão | Pilar | Modo | Frequência/Origem
Função observável (Iron Law 1)
Trigger | Duração | Easing | Propriedades
Reduced motion fallback (Iron Law 3)
Técnica | Stack | Browser baseline | Asset KB
Critério aceite (compactado)
```

---

### #1 button-press-compress

```
Pilar 1 | ENCAIXAR Wave 9.1 | dezenas/dia | ponteiro+teclado
Função: tactile feedback de press, confirma click recebido
Trigger: :active | 100ms press, 200ms release | press: ease-out, release: --ease-back cubic-bezier(0.34,1.56,0.64,1) | scale, transform
Reduced motion: scale(1) sempre, sem transição. Manter cor de :active.
CSS transition + :active pseudo-class | nativo | baseline ES2018+ | 0KB
Aceite: 60fps, scale exato 0.97, sem layout shift, focus-visible preserva ring.
```

### #2 button-loading-async

```
Pilar 1 | ENCAIXAR Wave 9.1 | ocasional | ponteiro
Função: anti-double-submit + visibilidade de status assíncrono
Trigger: data-loading=true | spinner 600ms linear infinite | linear (loop) | rotate transform
Reduced motion: spinner gira lentamente (1.5s) — não eliminar (Iron Law 8 inverse: comunica wait). aria-busy="true" mantém.
CSS keyframe rotate + data-loading attr | nativo + Sonner toast on done | baseline | 0KB
Aceite: width preservada (não pula), disabled durante loading, success/error toast em response.
```

### #3 form-field-label-float

```
Pilar 1 | ENCAIXAR Wave 9.1 | dezenas/dia | ponteiro+teclado
Função: label como placeholder até foco, sobe pra label tradicional ao :focus / :not(:placeholder-shown)
Trigger: :focus, :not(:placeholder-shown) | 150ms | cubic-bezier(0.2, 0, 0, 1) | translateY, scale (label), color
Reduced motion: snap-to-end (label vai pra posição final sem transição). Função preservada (label sempre visível).
CSS-only via :placeholder-shown | nativo | baseline | 0KB
Aceite: label nunca sumir (WCAG 1.3.1 + 3.3.2), focus ring visível, placeholder texto vazio (" ") pra :placeholder-shown matchear.
```

### #4 form-validation-feedback

```
Pilar 1 | ENCAIXAR Wave 9.1 | ocasional | sistema (após submit)
Função: comunicar erro/sucesso em campo específico (Nielsen #9: error recovery)
Sub-patterns:
  - Shake error: 400ms 4 oscilações | translateX -4px → 4px → -4px → 4px → 0 | ease-out
  - Checkmark draw: 400-600ms | path-length 0→1 | ease-out
  - Helper text reveal: 150-200ms | opacity + max-height | ease-out
  - Error-clear: 200ms | opacity 1→0 | ease-out
Reduced motion: shake = sem oscilação, só mantém vermelho border. Checkmark = visible direto. Helper text = sem max-height transition.
CSS keyframe + WAAPI conditionally | nativo | baseline | 0KB
Aceite: aria-live="polite" anuncia erro, foco vai pro campo errado em form submit, sem flash on entry.
```

### #5 toast-sonner

```
Pilar 1 | ENCAIXAR Wave 9.1 | ocasional/sistema
Função: feedback async transversal (success, error, info)
Trigger: toast.success/error/info | mount 400ms ease-out, dismiss 300ms ease-in, auto-close 4000ms | swipe velocity-based
Reduced motion: snap-in (sem slide), auto-close mantido.
Sonner direto | já em uso | baseline | ~5KB MIT (já incluído)
Aceite: stack interruptível, posição bottom-right (já config `AppLayout.tsx:64`), tema dark.
```

### #6 tooltip-floating-ui

```
Pilar 1 | ENCAIXAR Wave 9.1 | dezenas/dia | hover/focus
Função: explicar element sem ocupar layout
Trigger: hover/focus | open delay 700ms warmup, close 100-300ms | ease-out | opacity + translate 4px
Reduced motion: snap-in (instant), close instant. Função preservada.
Radix Tooltip (já em uso `App.tsx:5` TooltipProvider) | nativo | baseline | 0KB extra
Aceite: edge detection flip+shift, keyboard accessible (Tab+focus dispara), respeita prefers-reduced-motion.
```

### #7 modal/drawer easeReverse (custom pricing drawer + onboarding wizard)

```
Pilar 1 | MODIFICAR (substitui GSAP easeReverse 2026 por CSS dual-cubic) | ocasional | ponteiro
Função: slide-in com easing emphasized, slide-out com easing inverso (sensação simétrica)
Trigger: open | 320ms in, 280ms out
  - In: cubic-bezier(0.2, 0, 0, 1) emphasized — decisivo pro estado destino
  - Out: cubic-bezier(0, 0, 0.2, 1) — decisivo pro estado origem (espelha in)
Propriedades: translateX (drawer) / scale 0.96→1 + opacity (modal) | drawer ~ 480px width
Reduced motion: snap-in/out (transform 0ms). Backdrop ainda escurece pra garantir foco.
Radix Dialog/Drawer + CSS transition | shadcn já tem Dialog | baseline | 0KB extra
Aceite: focus trap funciona, ESC fecha, click outside fecha, return focus pro trigger.
```

### #8 skeleton consistent

```
Pilar 1 | ENCAIXAR canonical | sistema | route entry
Função: comunicar loading state, ocupar espaço final esperado (CLS = 0)
Trigger: data fetching | pulse 1.5s ease-in-out infinite | opacity 0.6 ↔ 1
Reduced motion: pulse OFF (animation: none) + bg estática `hsl(var(--muted) / 0.6)`. Já implementado em `index.css:231-234` ✓.
CSS keyframe pulse | nativo | baseline | 0KB
Aceite: zero plain "Carregando..." text em loading >150ms (substitui `AppLayout.tsx:50-55`); skeleton match dimensões finais; reduced-motion respeitado.
```

### #9 sidebar nav active transition

```
Pilar 1 | ENCAIXAR | dezenas/dia | route-change/click
Função: feedback de nav switch + indicador de localização atual
Trigger: NavLink isActive | bg fade 100ms ease-out | bg-color, text-color
Reduced motion: snap (transition 0ms). Bg color final mantido = função preservada.
CSS transition + NavLink active class (já em `Sidebar.tsx:30-35`) | React Router | baseline | 0KB
Aceite: focus-visible ring 2px accent (`--ring`), keyboard tab navigates, active state sticky entre re-renders.
```

### #10 KPI count-up Dashboard

```
Pilar 1 | MODIFICAR (impl manual rAF, NÃO GSAP) | first paint cada page | viewport-enter
Função: comunicar magnitude do número (Gestalt continuity — número subindo de 0 → final)
Trigger: viewport-enter (ou first paint se above-fold) | 800ms ease-out | numeric value (text node)
Reduced motion: skip count-up, mostrar valor final direto.
requestAnimationFrame manual com easing function | React + useEffect | baseline | ~0.3KB inline
Aceite: tabular-nums (mono font Geist Mono), valor final exato (não arredondado), only on initial mount/data load (não on every re-render).
```

### #11 OnboardingWizard step transitions [P2 brand-permitted]

```
Pilar 2 | CRIAR ad-hoc | raro/first-time | click next/back
Função: continuidade espacial entre steps (mental model: stack horizontal de cards)
Trigger: setStep(n) | 320ms | emphasized cubic-bezier(0.2, 0, 0, 1) forward; cubic-bezier(0, 0, 0.2, 1) backward
Propriedades: translateX (-100% → 0% incoming, 0% → 100% outgoing) + opacity (0 → 1)
Reduced motion: crossfade 200ms (mantém direção via aria-hidden, sem transform).
CSS transition + state machine | React state | baseline | 0KB
Embasamento: gestalt continuity (slide forward = progresso) + easing semantics (emphasized = decisivo)
Aceite: ARIA live announces step change, focus vai pro primeiro input do novo step, scroll position resetada.
```

### #12 WebhookPing pulse (Dashboard empty waiting first hit) [P2 brand-permitted]

```
Pilar 2 | CRIAR ad-hoc | sistema/raro (1ª vez) | viewport-enter
Função: comunicar "sistema ativo, aguardando webhook" (Nielsen #1 visibility status)
Trigger: empty Dashboard with onboarding completed but entries.count === 0 | pulse 2s ease-in-out infinite | opacity + scale 1 ↔ 1.05
Auto-stop: ao primeiro entry chegar (transition pra FirstHit celebration #13).
Reduced motion: static dot bg accent (sem pulse). Texto "aguardando webhook..." mantido.
CSS keyframe pulse | nativo | baseline | 0KB
Embasamento: attention economy (first-fold prospect — sistema deve PARECER vivo) + Iron Law 8 inverse (loop paga aluguel = explica wait)
Aceite: para automaticamente após primeiro entry, prefers-reduced-motion respeita, não compete com texto via contrast.
```

### #13 FirstHit celebration [P2 brand-permitted]

```
Pilar 2 | CRIAR ad-hoc | 1× por user lifetime | sistema (websocket/polling detecta primeiro entry)
Função: marcar marco emocional crítico do funnel (J0 → J1 transition, retenção crítica)
Trigger: entries.count: 0 → 1 detected | confetti single-shot 800ms + toast Sonner success "🎉 You're tracking!" 4000ms
Confetti params: 60-80 partículas, spread 70°, origin top-center, colors [accent #005EFF, primary #003899, white], duration 800ms
Reduced motion: SEM confetti, SÓ toast. Manter celebração via texto.
canvas-confetti lib (~7KB gzipped MIT) + Sonner | npm install canvas-confetti | baseline | +7KB
Embasamento: attention economy (raro = vale delight) + closure (Gestalt — fecha loop "configurei → trackou")
Aceite: dispara 1× só (flag salva localStorage), não bloqueia nav, particles cleanup após anim, sem 2nd shot em data refresh.
```

### #14 StreakCounter bump on increment [P2 brand-permitted]

```
Pilar 2 | CRIAR ad-hoc | 1×/dia | sistema (rollover meia-noite)
Função: comunicar incremento de streak (state change → continuidade temporal)
Trigger: streak.value: N → N+1 detected | 480ms decorative (token --motion-decorative) | ease-out
Propriedades: transform scale 1 → 1.15 → 1 + color flash (text fica laranja `#FF6B35` por 200ms, depois retorna)
Reduced motion: sem scale, sem color flash. Número troca instantâneo, mantém função (visibility do incremento via aria-live="polite").
CSS keyframe + React state effect | nativo | baseline | 0KB
Embasamento: state change (Iron Law 1 paga aluguel — sem bump user não nota) + easing semantics (ease-out celebra sem atrapalhar)
Aceite: dispara 1× por incremento (não em re-renders), aria-live anuncia "streak: N+1 days", reduced-motion: skip.
```

### #15 StreakMilestone (7/30/100/365 days) [P2 brand-permitted]

```
Pilar 2 | CRIAR ad-hoc | raríssimo (4 vezes ao longo de 1 ano máx) | sistema
Função: marcar milestone significativo de retenção (delight RARO permitido)
Trigger: streak hits [7, 30, 100, 365] | modal Radix Dialog + confetti reuse #13 (mais agressivo: 150 partículas) + sound opt-in
Modal entry: 320ms ease-out + scale 0.92 → 1 + opacity 0 → 1
Backdrop: opacity 0 → 0.6 simultaneous
Reduced motion: modal entry sem scale, snap opacity. SEM confetti. SEM sound (sound já é opt-in default off).
Radix Dialog + canvas-confetti reuse | baseline | 0KB extra (lib já incluída #13)
Embasamento: attention economy (raríssimo = paga aluguel grande) + closure
Aceite: ESC fecha, X visível, click outside opcional (manter modal pra leitura), focus trap, aria-labelledby="milestone-title".
```

### #16 StreakLost screen [P2 brand-permitted, mas NEUTRO motion]

```
Pilar 2 | CRIAR ad-hoc | ocasional (quando user perde streak) | sistema
Função: comunicar perda sem punir (UX empático)
Trigger: streak: N → 0 detected on entry to Dashboard | fade in 320ms ease-in-out
Texto: "Strike one — back at it tomorrow. Streak anterior: N dias."
Botão: "Reset and start fresh" (CTA neutral, não-aggressive).
Reduced motion: snap fade (opacity 0 → 1 sem transition). Texto e CTA mantidos.
CSS transition + React conditional | nativo | baseline | 0KB
Embasamento: empatia > punição. SEM shake, SEM red flashing, SEM vibrate.
Anti-pattern evitado: motion punitiva amplifica sentimento de fracasso → reduz return rate.
Aceite: dismiss persiste (não re-aparece na mesma sessão), sem motion negativa, focus vai pro botão "Reset".
```

### #17 AchievementUnlock [P2 brand-permitted]

```
Pilar 2 | MODIFICAR (`AchievementNotifier` existing) | raro | sistema
Função: marcar conquistas além de streak (cache 80%, sessões >100, etc.)
Trigger: server detecta achievement unlock | toast Sonner com badge SVG + modal opcional + confetti reuse #13 (60 partículas modesto)
Badge entry: --ease-back cubic-bezier(0.34, 1.56, 0.64, 1) 480ms decorative + scale 0.7 → 1.1 → 1 (overshoot tátil)
Reduced motion: badge snap-in, sem confetti, sem overshoot.
Existing `AchievementNotifier` upgrade + canvas-confetti reuse | baseline | 0KB extra
Embasamento: closure (badge revela = conquista fechada) + ease-back semantics ("saltou pra dentro" tátil)
Aceite: max 1 toast/achievement, reset via clearLastNotified, não dispara em re-renders, click no toast abre AchievementsPage.
```

### #18 LoginPage hero entrance [P2 brand-permitted]

```
Pilar 2 | CRIAR (adapta references/02-vetorial-branding) | first-paint Login page | route-enter
Função: ancorar qualidade percebida nos primeiros 2s (Anchoring effect — Wave 1 strategy F7)
Trigger: route /login mount | total ~600ms | ease-out
Sequência stagger 60ms:
  - 0ms: logo Artemis fade+translate Y(8px → 0) 200ms
  - 60ms: tagline "Plausible pra Claude" 200ms
  - 120ms: bullet 1 "Track LLM cost local" 200ms
  - 180ms: bullet 2 "Sem login required" 200ms
  - 240ms: bullet 3 "Open source by Artemis" 200ms
  - 300ms: form fade in 200ms (não translate — input field deve estar imediatamente clicável)
Propriedades: opacity 0→1 + transform translateY(8px → 0)
Reduced motion: SEM stagger, todos elementos opacity 1 sem transform direto. Função (hero comunica produto) preservada.
CSS animation-delay calc | nativo | baseline | 0KB
Embasamento: gestalt common fate (stagger 60ms percebido como grupo) + attention economy (anchoring) + easing ease-out (decisão concluída)
Anti-pattern evitado: scale(0) entrada (parece spawn), kinetic typography no body (atrapalha leitura), parallax (overkill pra login).
Aceite: total <800ms, form clicável imediato (sem delay >300ms), focus vai pro primeiro input pós-anim, prefers-reduced-motion: snap.
```

### #19 Chart entry on first paint

```
Pilar 1 | MODIFICAR (Recharts native props) | first paint Dashboard/Analytics | viewport-enter
Função: comunicar que dados carregaram + reduzir espera percebida
Trigger: chart mount com data | line draw 600ms ease-out / area fill 400ms ease-in / bar grow 320ms ease-out
Stagger: max 60 elementos, 15ms entre (token --motion-stagger)
Recharts props: animationDuration={600} animationEasing="ease-out" isAnimationActive={!prefersReducedMotion}
Reduced motion: isAnimationActive={false} — chart aparece estático com dados finais.
React + Recharts native | baseline | 0KB extra (já dep)
Aceite: 60fps em desktop, 30fps mobile, função preservada (skip → grafo final), tabela do mesmo data acessível.
```

### #20 KPI delta arrow (DeltaBadge update)

```
Pilar 1 | CRIAR ad-hoc | ocasional | data refresh
Função: comunicar mudança de delta (UX_AUDIT_SPEC F10 indica DeltaBadge precisa fix de cor invertida — separated logic, mas motion ajuda visibilizar mudança)
Trigger: delta value change | 200ms ease-out | scale 1 → 1.1 → 1 + color transition
Reduced motion: sem scale, color transition direta.
CSS keyframe + React useEffect detecta mudança via prev value | nativo | baseline | 0KB
Aceite: dispara só quando value muda (não em re-renders), aria-live anuncia "delta increased X% / decreased Y%".
```

### #21 PageHeader entrance (route transition)

```
Pilar 1 | ENCAIXAR | route-change | sistema
Função: comunicar mudança de página (continuidade narrativa entre rotas)
Trigger: route mount | 200ms ease-out | opacity + translateY(4px → 0)
Reduced motion: snap (opacity 1 sem transform).
CSS animation onMount via React Router transition | baseline | 0KB
Aceite: roda só em mount inicial (não em filter changes), não atrasa interatividade do conteúdo.
```

---

## Tokens motion existentes — audit

`index.css:198-209` (`:root`):

| Token | Valor atual | Veredicto | Ajuste |
|---|---|---|---|
| `--motion-fast` | 100ms | ✅ ok pra hover/feedback (#1, #9) | manter |
| `--motion-base` | 200ms | ✅ ok pra dropdown/tooltip/PageHeader (#6, #21) | manter |
| `--motion-slow` | 320ms | ✅ ok pra modal/drawer/wizard (#7, #11, #16) | manter |
| `--motion-decorative` | 480ms | ✅ ok pra streak/achievement (#14, #17) | manter |
| `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) | ✅ standard | manter |
| `--ease-in-out` cubic-bezier(0.4, 0, 0.2, 1) | ✅ Material | manter |
| `--ease-emphasized` cubic-bezier(0.2, 0, 0, 1) | ✅ Material 3 | manter |
| `--motion-stagger` | 15ms | ✅ chart/list staggers | manter |

**Adicionar (Wave 4 ui-design-system --generate decide se persistir):**
- `--ease-back` cubic-bezier(0.34, 1.56, 0.64, 1) → button-press release (#1) + AchievementUnlock (#17)
- `--motion-celebration` 800ms → FirstHit confetti single-shot (#13)
- `--motion-pulse-loop` 2s → WebhookPing (#12)

**Reduced-motion gate global** (`index.css:222-238`) ✅ já adequado. Manter.

---

## Bundle cost projetado

| Dependência | Necessidade | Justificativa | KB gzipped |
|---|---|---|---|
| `canvas-confetti` | #13, #15, #17 | Single-shot celebrations modestos. Sem alternativa CSS-only viável pra particles. | ~7KB |
| `react-countup` ou impl manual | #10 | Manual rAF é ~0.3KB inline. **Recomendação: impl manual** evita dep. | 0KB (manual) |
| GSAP | NÃO | easeReverse 2026 substituído por CSS dual-cubic. Sem outro padrão justifica 50KB. | 0KB ❌ |
| Lottie / Rive | NÃO | Confetti CSS-incompatível mas canvas-confetti basta. Lottie ~50KB pra 1 anim = caro. | 0KB ❌ |
| Three.js / R3F | NÃO | P4 espacial não cabe (Iron Law 2). | 0KB ❌ |
| Framer Motion | NÃO | CSS + Radix nativo cobrem 100%. | 0KB ❌ |

**Total bundle adicional motion:** **~7KB** (canvas-confetti).

Comparação ccusage: tracker = GUI dashboard, +7KB = aceitável. Plausible: ~54× smaller que GA — tracker pode manter pequeno também.

---

## Boundaries respeitadas (Iron Law)

| Skill | Boundary |
|---|---|
| **ui-design-system** (Wave 4) | Tokens fast/base/slow/decorative + easings vivem lá. Esta wave SÓ consome + sugere adições (`--ease-back`, etc.). |
| **ux-audit** (Wave 2 done) | Observabilidade de motion atrapalhando tarefa: já feito. Findings F4 (streak), F12 (achievement) encaminhados pra cá → speccados ✓. |
| **react-patterns** (Wave 6 ou 7) | Implementação React (useEffect cleanup, ref management, lazy load, focus management, polyfill cross-browser) — esta wave NÃO implementa, só specifica. |
| **component-architect** (Wave 5) | Anatomia/props de StreakCounter, OnboardingWizard, AchievementBadge — vai lá. |
| **design-system-audit** (Wave 5) | Coverage de motion na auditoria DS — raro overlap, motion-as-system já tokenizado. |
| **trident** (Wave 7) | Bug funcional em motion (não tocar agora). |

---

## Phase 4 validation gate — SKIPPED

Per autorização Patrick "pode seguir sem medo", Phase 4 BLOCKING gate desta skill foi pulado nesta sessão. Specs canonical entregues em Phase 5 ficam disponíveis pra revisão posterior.

Se Patrick rejeitar algum padrão depois, doc é editado in-place + commit corretivo. Pivot documentado no `audits/00-master-plan.md` §"Histórico de pivots".

---

## Pre-delivery checklist

- [x] Tipo de produto + contexto explicitados
- [x] Pilares aplicáveis declarados (P1 dominante + P2 permitido em login/onboarding/celebrations/streaks; P3/P4 descartados)
- [x] Cada animação tem função observável justificada (Iron Law 1)
- [x] Frequência + origem da ação declaradas (Craft gate)
- [x] Calibragem por contexto aplicada (Iron Law 2 — operational SaaS)
- [x] Reduced-motion fallback declarado em todo spec (Iron Law 3)
- [x] Decisão técnica respeita bundle (~7KB total) + suporte browser
- [x] Mobile testado/declarado (specs aplicam-se a viewport reduzido também)
- [x] Critério de aceite por animação (testável)
- [x] Boundaries respeitadas (não absorveu trabalho de ui-DS / ux-audit / react-patterns / component-architect)
- [x] Wave 9.1 references consultadas (form-field-label-float, form-validation-feedback, button-press-compress, button-loading-async, toast-sonner, tooltip-floating-ui)
- [x] Phase 0 discovery completou via fast-forward (Waves 0-2)
- [x] Phase 1 lookup entregou 21 padrões mapeados
- [x] Phase 2 decisão declarou modo (encaixar 11 + modificar 4 + criar 6)
- [x] Phase 3 proposal incluiu embasamento teorico (gestalt + attention + easing) por padrão P2
- [x] Phase 3 incluiu alternativas rejeitadas (GSAP, Lottie, Three.js, Framer Motion) com razão (bundle/scope)
- [x] Phase 4 validation gate — skipped per autorização documentada
- [x] Phase 5 Artefato 1 (spec canonical 21 padrões) entregue
- [ ] Phase 5 Artefato 2 (prompt Lovable) — não solicitado (tracker é vanilla React Vite, não Lovable)

---

## Estado Wave 3

- [x] Phase 0 fast-forward
- [x] Phase 1 lookup (21 padrões)
- [x] Phase 2 decisões (encaixar/modificar/criar)
- [x] Phase 3 embasamento teorico P2
- [x] Phase 4 SKIPPED (autorização)
- [x] Phase 5 spec canonical 21 padrões

---

## Próximo passo

**Handoff S1 → S2.** Gerar `audits/HANDOFF-S1.md` consolidando waves 0-3 + decisões + inputs pra Wave 4 (ui-design-system --generate).

S2 abre em fresh context. Wave 4 carrega:
- Brand Artemis (Wave 0)
- Strategy + ICP (Wave 1)
- UX findings encaminhados (Wave 2)
- Motion specs + tokens audit (esta wave)

Output Wave 4: `design.json` + Tailwind config + CSS variables + 3 example components com tokens Artemis-fitted.
