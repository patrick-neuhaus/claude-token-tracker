---
name: stack-shadcn-tailwind
description: Padrões shadcn/ui + Tailwind 3 no apps/web do claude-token-tracker. Como instalar componente shadcn, usar cn() helper, mapear ao design system existente (cores via CSS variables --chart-1..5, tokens em index.css), evitar hex hardcoded, manter `components/ui/*` consistente. Ative ao criar/editar componente UI, ajustar token visual, adicionar shadcn primitive novo. Triggers PT: shadcn, componente UI, design system, Tailwind, token visual, primitive, paleta. EN: shadcn/ui, Tailwind utility, design tokens, component variants, CSS variables, primitive.
---

# shadcn/ui + Tailwind 3

## ⚠️ Doc oficial

- shadcn/ui: https://ui.shadcn.com/
- Tailwind 3: https://tailwindcss.com/docs (NÃO Tailwind 4 — breaking)
- Última verificação: 2026-05-26

Tailwind 4 quebra `tailwindcss-animate` + `@tailwindcss/typography` do tracker. Mantém 3.4 enquanto não houver bom motivo.

## Setup atual (mantém)

- Tailwind 3.4 via `tailwind.config.ts`.
- shadcn/ui components em `apps/web/src/components/ui/` (copia-paste, não npm dependency).
- `cn()` helper em `apps/web/src/lib/utils.ts` (clsx + tailwind-merge).
- CSS variables em `apps/web/src/index.css`: `--chart-1..5`, `--background`, `--foreground`, `--brand-blue-mid`, `--success-display`, `--warning`, `--destructive` etc.
- `MODEL_COLORS` + `SOURCE_COLORS` em `constants.ts` consomem CSS vars (`hsl(var(--chart-1))`).

## Instalar primitive shadcn

```bash
pnpm dlx shadcn@latest add button card input dialog
```

Gera arquivo em `apps/web/src/components/ui/<name>.tsx`. Customize com `cn()` + variants.

## cn() helper

```typescript
// apps/web/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use em CADA componente: `<div className={cn("base classes", conditional && "conditional", props.className)}>`.

## Variants pattern (CVA)

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: { sm: "h-8 px-3", default: "h-10 px-4", lg: "h-11 px-6" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

## CSS Variables (não hex hardcoded)

R: nenhum hex em código novo. Usa tokens:

```tsx
// Errado
<div style={{ color: "#3b82f6" }}>

// Certo
<div className="text-primary">
// ou
<div style={{ color: "hsl(var(--brand-blue-mid))" }}>
```

Charts (Recharts não aceita Tailwind classes em `stroke`/`fill`):

```tsx
import { CHART_COLORS, getModelColor } from "../lib/constants";

<Line stroke={CHART_COLORS[0]} />
<Bar fill={getModelColor(model)} />
```

`CHART_COLORS` e `MODEL_COLORS` em constants.ts já usam `hsl(var(--chart-N))`.

## Bugs conhecidos / armadilhas

- **Tailwind 4 breaking**: NÃO migrar enquanto `tailwindcss-animate` + `@tailwindcss/typography` não suportarem.
- **shadcn copia, não importa**: componente em `components/ui/` é tu. Customize livre, mas atualização exige re-copy manual + diff.
- **`style={{...}}` inline com CSS var**: OK pra valores dinâmicos (cor por modelo, dimensão calc). CSP `unsafe-inline` em styleSrc permite (legacy debt — backlog cleanup).
- **dark mode**: tema via `class="dark"` no `<html>`. Token resolve via `:root.dark { --foo: ... }`.
- **Reset cascade**: shadcn components não usam `* { all: unset }`. Reset minimal via Tailwind `preflight`.

## Quando ativar outras skills

- Componente que renderiza source/model → `stack-vite-react` (display functions).
- Token visual novo (cor, espaçamento) → `tracker-product-decisions` (ADR se afeta brand).
- Chart novo → `stack-vite-react` (Recharts pattern).

## ⚠️ Sempre

- Antes de hex no código, conferir CSS var existente.
- Antes de classe Tailwind nova longa, considerar componente reusable.
- Antes de migrar Tailwind major, validar deps (animate, typography).
- Antes de shadcn update, diff + re-copy + smoke test visual.

## Knowledge persistente

- **shadcn/ui copy-not-install**: vendor lock-in zero, customização total. Pago em update manual.
- **CSS vars > Tailwind theme.colors**: dinâmico em runtime (dark mode, theme switching).
- **Recharts não aceita className**: stroke/fill via CSS var string ou hex.
- **Tema Artemis brand**: blue mid (`--chart-1`) cor primária, palette 5 cores chart + alpha variants.

## References / recipes / templates

- (planejado V2) `references/tailwind-config.ts` — base.
- (planejado V2) `references/index-css-tokens.css` — design tokens canônicos.
- (planejado V2) `recipes/component-with-variants.tsx` — CVA pattern.
