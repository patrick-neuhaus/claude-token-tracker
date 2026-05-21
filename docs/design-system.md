# Design System - Claude Token Tracker

Fonte unica de verdade pra visual + componentes. Sucessor curado da pasta `audits/`
(Wave 4 tokens, Wave 5 component-architect). Esta doc e o ponto vivo —
`audits/` permanece como historico de auditoria.

## Como usar

1. **Tokens** — todos valores visuais (cor, espacamento, fonte, motion, shadow)
   vem de `client/src/styles/tokens.css` + `client/src/index.css`. NAO inline
   valores em components.
2. **Primitivos** — `client/src/components/primitives/{Button,Card,Input}.tsx`
   sao a primeira escolha pra qualquer UI nova.
3. **Existing components** — migracao gradual em ondas. Lista priorizada em
   `audits/COMPONENT-DEDUP.md`. Components antigos em `components/ui/` continuam
   funcionando (3+ Waves de codigo dependem deles).

## Arquitetura de tokens

Tokens vivem em duas camadas:

### Camada 1 — vars base (`client/src/index.css`)

HSL triplets puros (convencao shadcn / Tailwind v4 `@theme inline`). Exemplo:

```css
--background: 222 20% 10%;       /* dark mode */
--foreground: 220 15% 92%;
--primary:    220 90% 55%;
```

Tailwind utilities como `bg-background`, `text-foreground`, `border-border`
funcionam direto. CSS manual usa `hsl(var(--background))`.

### Camada 2 — aliases semanticos (`client/src/styles/tokens.css`)

Apontam pras vars base com nomes amigaveis pro DS unificado:

```css
--color-bg:          var(--background);
--color-bg-elevated: var(--card);
--color-text:        var(--foreground);
--color-text-muted:  var(--muted-foreground);
--color-accent:      var(--accent);
--color-success:     var(--success);
--color-danger:      var(--destructive);

--space-0: 0;
--space-1: 4px;
/* ... ate --space-12: 48px */

--radius-full: 9999px;

--duration-fast: var(--motion-fast);  /* 150ms */
--duration-base: var(--motion-normal); /* 200ms */
--duration-slow: var(--motion-slow);   /* 300ms */
```

## Tokens (resumo executivo)

### Cores

| Token semantico | Token base | Uso |
|---|---|---|
| `--color-bg` | `--background` | Background da pagina |
| `--color-bg-elevated` | `--card` | Surfaces elevadas (cards, modals) |
| `--color-bg-muted` | `--muted` | Backgrounds sutis (filter bars) |
| `--color-text` | `--foreground` | Texto principal |
| `--color-text-muted` | `--muted-foreground` | Texto secundario |
| `--color-border` | `--border` | Bordas de surfaces |
| `--color-accent` | `--accent` | CTAs, focus rings, highlights |
| `--color-success` | `--success` | Status positivo |
| `--color-warning` | `--warning` | Alertas |
| `--color-danger` | `--destructive` | Erros, delete |
| `--color-brand-primary` | `--brand-navy` | Logo, hero (decorative) |
| `--color-brand-vivid` | `--brand-blue-vivid` | Brand accent |

### Spacing (escala 4px-base)

`--space-0` (0) ate `--space-12` (48px). Incrementos `--space-7` (28px),
`--space-9` (36px), `--space-11` (44px) sao NOVOS — restante reusa vars
existentes do index.css. Exemplos: `--space-1` (4px), `--space-4` (16px),
`--space-8` (32px).

### Radius

`--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (12px),
`--radius-xl` (16px), `--radius-2xl` (20px), `--radius-full` (9999px).

### Typography

- `--font-display` -> Lora (headings)
- `--font-body` -> Poppins (corpo) [`--font-sans` alias]
- `--font-mono` -> Geist Mono (codigo, tnum)
- Escala: `--font-size-xs` (13px) ate `--font-size-3xl` (32px).

### Motion

- `--duration-fast` (150ms) — hover, focus
- `--duration-base` (200ms) — transitions padrao
- `--duration-slow` (300ms) — modal/drawer
- `--ease-standard` (cubic-bezier .4,0,.2,1) — default
- `--ease-out` — entradas
- `--ease-in` — saidas
- `--ease-spring` (cubic-bezier .34,1.56,.64,1) — bounce
- `prefers-reduced-motion` gate global em index.css

### Shadow

`--shadow-xs` ate `--shadow-xl` + variantes especificas (`--shadow-card`,
`--shadow-dialog`, `--shadow-popover`, etc). Hue-aware (sao tintados pelo
dark foreground em light mode, opacity preta em dark mode).

## Primitivos disponiveis

### `Button` — `@/components/primitives/Button`

```tsx
import { Button } from '@/components/primitives';

<Button>Click me</Button>
<Button variant="outline" size="sm">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>
```

- Variants: `default`, `outline`, `ghost`, `destructive`
- Sizes: `sm`, `default`, `lg`
- Loading state com spinner inline
- `data-state="idle | loading | disabled"` pra QA / testes

### `Card` — `@/components/primitives/Card`

Compound component com slots:

```tsx
import { Card } from '@/components/primitives';

<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Subtitle aqui</Card.Description>
  </Card.Header>
  <Card.Body>Conteudo principal...</Card.Body>
  <Card.Footer>Actions row</Card.Footer>
</Card>
```

Ou imports nomeados (`CardHeader`, `CardTitle`, etc) se preferir.

### `Input` — `@/components/primitives/Input`

```tsx
import { Input } from '@/components/primitives';

<Input
  label="Email"
  placeholder="you@example.com"
  helperText="Nunca compartilhado."
/>

<Input
  label="Webhook URL"
  error="URL invalida"
/>

<Input disabled />
```

- Label opcional via prop
- `helperText` ou `error` (error sobrescreve com cor vermelha + aria-invalid)
- `data-state="idle | disabled | error"`
- Forward ref pro `<input>` nativo

## Coexistencia com codigo antigo

Components antigos continuam funcionando:

- `components/ui/button.tsx` — generico, ja em uso massivo. Nao quebra.
- `components/ui/input.tsx` — idem.
- `components/shared/Section.tsx` + `lib/surface.ts` — filosofia anti-shadcn
  (varia padding/radius por contexto, evita "card soup"). Manter pra blocks
  titulados em pages.

Novo codigo: preferir `components/primitives/*`. Refactor de existing:
gradual, 1-2 components por wave (ver `audits/COMPONENT-DEDUP.md`).

## Proximos primitivos (roadmap)

Por ordem de prioridade pra ondas futuras:

1. **`Modal`** — consolidar 3 modais existentes (Dialog base-ui + 2 wrappers
   custom). Substituir `components/ui/dialog.tsx` longo prazo.
2. **`Badge`** — primitivo unificado (atualmente `components/ui/badge.tsx`
   coexiste com `BadgeCard`, `FilterChip`).
3. **`Select`** — nao existe primitivo; `NativeSelect` em shared/ e raw HTML.
4. **`Checkbox`** / **`Radio`** / **`Switch`** — primitives base-ui faltantes.
5. **`Toast`** — sistema unificado (atualmente sonner direto, sem wrapper DS).
6. **`Avatar`** — usado ad-hoc em UserMenu.
7. **`Table`** — formalizar `AppTable` em data/ como primitive canonico,
   deprecar `ui/table.tsx` (4 callsites — ver COMPONENT-DEDUP).

## Migracao de existing components

Estrategia gradual. Ver `audits/COMPONENT-DEDUP.md` pra lista
priorizada. Regras:

- NAO fazer big-bang migration. 1-2 components por wave.
- Sempre adicionar `data-state` quando migrar.
- Tokens inline (hex, px hardcoded) sao SMELL — substituir por vars.
- `unsafe-inline` no CSP so removivel apos migracao 100% (ondas futuras,
  fora de escopo desta wave).

## Referencias

- `audits/04-tokens-spec.md` — spec original Wave 4
- `audits/04-tokens.css` — tokens gerados Wave 4
- `audits/04-tokens.json` — design.json estruturado
- `audits/04-wcag-report.md` — validacao WCAG 2.2 AA
- `audits/05-component-architect.md` — anatomia + slots Wave 5
- `audits/COMPONENTS-INVENTORY.md` — inventario completo
- `audits/COMPONENT-DEDUP.md` — analise de duplicacao + plano migracao
