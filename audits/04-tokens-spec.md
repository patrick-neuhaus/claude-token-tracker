# Wave 4 — Design Tokens Artemis-fitted (ui-design-system --generate)

> **Sessão:** 2 / **Wave:** 4 / **Status:** ✅ done (Phase 5 review BLOCKING passou com 1 trade-off documentado)
> **Skill:** `ui-design-system --generate` (executado via Node script `audits/scripts/generate-tokens.mjs`)
> **Outputs:**
> - `audits/04-tokens.json` — design.json semantic structure
> - `audits/04-tokens.css` — CSS variables dark mode
> - `audits/04-wcag-report.md` — WCAG validation completa
> - `audits/scripts/generate-tokens.mjs` — script reproducible

---

## Phase 1 — Inputs consolidados (fast-forward)

| Input | Valor |
|---|---|
| **Brand seed** | Paleta Artemis literal completa (Patrick passou Q1) |
| **Cores primárias** | navy `#003899`, vibrant blue `#005EFF`, secondary `#000000`, text `#667085` |
| **Blue ladder** | `#0D419B` (deep), `#0848C5` (dark), `#1E93FF` (mid), `#48B7FF` (light), `#005EFF` (vivid) |
| **Gray scale** | Untitled UI 10 stops: `#FFFFFF`, `#F2F4F7`, `#EAECF0`, `#D0D5DD`, `#98A2B3`, `#667085`, `#475467`, `#344054`, `#182230`, `#101828`, `#0C111D` |
| **Typography** | IBM Plex Sans (display) + Inter (body) + Geist Mono (mono) — confirmadas Patrick |
| **Mode** | Dark only (Patrick decisão Q5: tracker é developer tool, sem light mode) |
| **Reference UI** | `~/Documents/Github/anti-ai-design-system/` main branch (Wave 5 a10352a, mergeada) |
| **Constraints** | WCAG 2.2 AA baseline + foreground hue obrigatória (Iron Law canonical) |
| **Motion tokens existentes** | Wave 3 spec — preservados via aliases híbridos |

---

## Phase 2 — Color space + semantic roles

### Decisão metodológica (Patrick Q1 + Q4)

**NÃO** usei algoritmo `deriveFromAccent` do TokenEditorPreview canonical (algoritmo pra iniciante c/ 1 seed). Patrick tem paleta completa pré-definida → mapeamento direto literal pra semantic roles.

**SIM** usei core do TokenEditorPreview:
- ✅ `pickFg` dinâmico (white vs near-black por contraste real) — aplicado em 8 foregrounds
- ✅ `contrastRatio` WCAG 2.x (relative luminance gamma-corrected)
- ✅ `wcagBadge` (AAA 7:1 / AA 4.5:1 / UI 3:1 separado)
- ✅ `hexToHsl` converter
- ✅ Surface tier dark (bg < card < muted, lift via L crescente)

### Mapeamento semantic-role pra dark mode

| Token | Hex | Razão |
|---|---|---|
| `--background` | `#0C111D` (gray-900) | Deepest Untitled UI gray, hue 216° |
| `--foreground` | `#F2F4F7` (gray-050) | Off-white com hue Untitled (NUNCA pure white) |
| `--card` | `#101828` (gray-800) | Lift via L crescente (bg < card) |
| `--muted` | `#182230` (gray-700) | Lift maior (card < muted) |
| `--muted-foreground` | `#98A2B3` (gray-300) | Secondary text, AA pass vs todos surfaces |
| `--border` | `#667085` (gray-400) | Bumped pra passar 3:1 vs card (gray-500/600 falham) |
| `--input` | `#182230` (gray-700) | Igual muted (form fields) |
| `--ring` | `#005EFF` (accent vibrant) | Focus ring usa accent (visible 3.63:1 vs bg) |
| **`--primary`** | **`#0848C5` (blueDark)** | **Swap: navy `#003899` falha 1.82:1 vs dark bg, mid-dark passa 2.46:1 (ainda fail UI graphic mas aceitável c/ fg)** |
| `--primary-foreground` | gray-050 (pickFg) | Branco hue-tinted, AA 6.95:1 |
| `--accent` | `#005EFF` (vibrant blue) | Highlight/focus, intacto |
| `--accent-foreground` | gray-050 (pickFg) | AA 4.71:1 |
| `--brand-navy` | `#003899` | Decorative-only (logo, hero login, brand identity) |

### Status colors (Untitled UI 500-tier pra dark mode visibility)

| Token | Hex | Razão |
|---|---|---|
| `--destructive` | `#D92D20` (red-600) | AA 4.72:1 vs card |
| `--success` | `#039855` (green-600) | AA 6.77:1 vs card |
| `--warning` | `#DC6803` (amber-600) | AAA 7.56:1 vs card |
| `--info` | `#005EFF` | Artemis vibrant blue — alinha brand |

**Status pill foregrounds** usam tier 500 (mais claro): `#12B76A` success, `#F79009` warning, `#F04438` error, `#1E93FF` info.

### Sidebar harmonized

`--sidebar-background = #0C111D` (mesmo background — gera unidade visual).
`--sidebar-accent = #101828` (lift hover state).
`--sidebar-indicator = #005EFF` (accent vibrant — active item line).
Foregrounds via pickFg dinâmico → todos passam AAA 17:1+.

---

## Phase 3 — Token generation completo

### Counts

- **49 semantic CSS variables** (surface, brand, status, sidebar, status-pills)
- **15 motion tokens** (canonical anti-ai-ds + 4 tracker aliases híbridos + 2 Artemis extensions)
- **15 typography tokens** (font families + scale 7 stops + weights + leading + tracking)
- **11 spacing primitives** (4-base scale: 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- **6 radius tokens** (sm/md/lg/xl/2xl + base)
- **13 shadow tokens** (5 generic + 7 component-specific + 1 backdrop)

### Motion tokens estratégia (Q2 híbrido aprovado)

**Canonical anti-ai-ds (source of truth):**
```css
--motion-instant: 80ms;
--motion-fast:    150ms;
--motion-normal:  200ms;
--motion-slow:    300ms;
--motion-page:    400ms;
--ease-standard:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-out:       cubic-bezier(0, 0, 0.2, 1);
--ease-in:        cubic-bezier(0.4, 0, 1, 1);
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
```

**Tracker aliases (não quebram code Wave 3 existente):**
```css
--motion-base:        var(--motion-normal);     /* 200ms */
--motion-decorative:  var(--motion-page);       /* 400ms — era 480ms, ajusta -80ms */
--ease-in-out:        var(--ease-standard);     /* alias */
--ease-emphasized:    var(--ease-out);          /* alias */
```

**Artemis extensions (não-canonical, único do tracker):**
```css
--motion-celebration: 800ms;   /* FirstHit confetti single-shot */
--motion-pulse-loop:  2s;      /* WebhookPing breathing */
```

**Renomeação Wave 3:**
- `--ease-back` proposto → usa `--ease-spring` canonical (mesmo cubic-bezier)
- Outros tokens motion mantém nomes Wave 3 via aliases

---

## Phase 4 — States + motion + microinteractions

Wave 3 motion specs já cobriu states (button :active, :focus-visible, form field :focus, modal/drawer transitions, etc). Wave 4 só TOKENIZA via design.json.

**Reduced motion gate global** (canonical anti-ai-ds + index.css existente):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Focus ring (canonical 2-layer):**
```css
:focus-visible {
  box-shadow:
    0 0 0 2px hsl(var(--background)),
    0 0 0 5px hsl(var(--ring) / .55);
}
```

---

## Phase 5 — Review BLOCKING (WCAG validation + visual QA)

### WCAG measurements (19 pares)

**18/19 passing** — relatório completo em `audits/04-wcag-report.md`.

| Categoria | Pares | Pass | Fail |
|---|---|---|---|
| Foreground sobre surface | 5 | 5 ✅ | 0 |
| Brand fg sobre brand bg | 2 | 2 ✅ | 0 |
| UI graphic 3:1 | 5 | 4 ✅ | 1 ❌ |
| Status text | 4 | 4 ✅ | 0 |
| Sidebar | 3 | 3 ✅ | 0 |

### O 1 fail (esperado físico, documentado)

**Primary vs Background (UI) — 2.46:1 FAIL**
- `--primary` `#0848C5` vs `--background` `#0C111D`
- Trade-off físico: 2 cores escuras adjacentes, fisicamente impossível 3:1
- TokenEditorPreview canonical doc: "UI graphic FAIL ≠ bug. Accent/primary vivos somem como UI vs surface — esperado. Borders e focus rings usam --ring (= accent), continuam visíveis."
- **Mitigação:** `--primary` NUNCA usado como border/outline standalone. Sempre fill+fg (passa AAA 6.95:1) ou via `--ring` (=accent, passa 3.63:1).
- **Aceitação:** documentado pra Wave 5 não tentar "fix" via subir luminance (perderia brand cohesion navy/blue).

### Hit target + reflow + zoom (validação manual Wave 6)

- **Hit target ≥ 24×24 CSS px** — validado em Wave 6 implementação por componente
- **Reflow 320 CSS px** — validado em Wave 6 page-by-page
- **Zoom 200%/400%** — validado em Wave 6
- **Visual QA matrix** — 320/360/390/430/768/1024/1280/1366/1440/1920 — Wave 6

### Iron Law canonical respeitada

- ✅ `--foreground` e todas variantes usam hue Untitled UI 216° (S 24%, L 96%) — NUNCA pure `0 0% L%`
- ✅ Surface tier dark (bg < card < muted) com lift via L crescente
- ✅ Border passa 3:1 vs surface (3.57 vs card, 3.79 vs background)
- ✅ Reduced-motion gate global existe (mantido de index.css)
- ✅ Focus ring 2-layer canonical aplicado

---

## Maturity scorecard (Phase 5 review final)

| Critério | Score | Notas |
|---|---|---|
| Color tokens semantic | 9/10 | -1 pelo primary trade-off documentado |
| Foreground hue (anti-pure-white) | 10/10 | Todos usam Untitled UI hue 216° |
| Surface tier (bg < card < muted) | 10/10 | Lift correto via L |
| Brand fidelity Artemis | 9/10 | -1 navy fica decorative, primary efetivo é blueDark |
| Motion tokens canonical-aligned | 10/10 | Aliases híbridos + extensions Artemis claros |
| Typography canonical | 10/10 | Type scale + weights + leading completos |
| Spacing primitives | 10/10 | 4-base canonical |
| Radius scale | 10/10 | sm/md/lg/xl/2xl |
| Shadow tinted dark | 10/10 | Black overlay (correto pra dark, fg-tinted seria branco) |
| WCAG validation | 9/10 | 18/19 pass, 1 trade-off documentado |
| Reduced motion gate | 10/10 | Existente preservado |
| Focus ring canonical | 10/10 | 2-layer aplicado |
| **TOTAL** | **117/120** | **97.5% maturity** |

---

## Decisões registradas (locked-in pra Wave 5+)

1. **Primary efetivo dark mode = `#0848C5` (blueDark Artemis)**, não `#003899` (navy)
2. **Navy fica `--brand-navy`** decorative-only (logo, hero login, brand identity gestures)
3. **Border = `#667085`** (Untitled gray-400) — bumped pra passar 3:1
4. **Focus ring usa `--accent`** (vibrant blue) — não primary
5. **Status colors Untitled 600-tier (bg) + 500-tier (fg)** pra dark mode visibility
6. **Foreground SEMPRE hue-tinted** (gray-050 = `#F2F4F7` hue 216°), nunca pure white
7. **Motion tokens canonical-aligned** via aliases híbridos (não quebra Wave 3 specs)
8. **Artemis extensions:** `--motion-celebration` 800ms + `--motion-pulse-loop` 2s
9. **Typography:** IBM Plex Sans + Inter + Geist Mono
10. **Dark only** — sem light mode

---

## Inputs pra Wave 5 (design-system-audit + component-architect)

### Tokens disponíveis

- `audits/04-tokens.css` — drop-in replacement pra `client/src/index.css` (Wave 6 fará merge)
- `audits/04-tokens.json` — design.json reference (component-architect consume)

### Decisões propagadas pra Wave 5

- Primary efetivo = blueDark — components devem usar `--primary` semântico, não hardcode navy
- Border bumped — components que dependem de `--border` ganham contraste automaticamente
- Status colors — todos shadcn-style, retro-compatível
- Sidebar mantém estrutura (não força navy fundo, gray-900 + accent indicator)

### Lift map preliminar (Wave 5 valida)

Lift map em HANDOFF-S1 §"Lift map preliminar" mantém-se válido — tokens novos não invalidam mapeamentos. Apenas `Sidebar` lift (atual gray-900 dark vs DS canonical sidebar-bg = primary teal) precisa adapter pra usar gray-900 + accent indicator (decisão Wave 4).

### Pendências

- **Skills/SystemPrompts modelo** (a/b/c) — Patrick "deixa pro futuro, segue master plan". Wave 5 lift map detalha essas pages baseado em estado atual.
- **Light mode** — não entra Wave 4. Decisão futura se Patrick quiser preset light.
- **Tailwind config update** — Wave 6 implementação propaga tokens novos pro `tailwind.config.ts` (mantém class names atuais via tema customizado).

---

## Phase 6 — Deliverables completos

- ✅ `audits/04-tokens.json` — design.json semantic
- ✅ `audits/04-tokens.css` — CSS variables dark mode (49 semantic + 15 motion + 15 typography + 11 spacing + 6 radius + 13 shadow)
- ✅ `audits/04-wcag-report.md` — 19 pairs validados, 18 pass + 1 trade-off documentado
- ✅ `audits/scripts/generate-tokens.mjs` — script reproducible (Node puro, zero deps)
- ✅ Iron Law canonical respeitada (foreground hue + surface tier)
- ✅ Q1-Q4 Patrick decisões aplicadas

---

## Próximo passo

**Wave 5** (`design-system-audit --audit` + `component-architect --plan`) — lift map definitivo + delta report tokens novos vs components atuais. Inputs em HANDOFF-S1 §"Inputs pra S2 (Wave 5)" + tokens Wave 4.
