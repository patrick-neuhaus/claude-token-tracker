import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — Design System primitive (Fase A).
 *
 * Sucessor curado do `components/ui/button.tsx`. Consome tokens
 * centralizados via classes utilitarias tailwind (que ja resolvem
 * pras vars CSS em `styles/tokens.css` + `index.css`).
 *
 * Diferencas vs `components/ui/button`:
 * - `data-state` attribute (idle / loading / disabled) pra QA + testes
 * - Slot `loading` boolean (mostra spinner inline)
 * - 4 variants: default / outline / ghost / destructive
 * - 3 sizes: sm / default / lg
 *
 * Migracao: NAO substitui o `components/ui/button` ainda — esses
 * coexistem. Roadmap em `docs/design-system.md`.
 */

const buttonVariants = cva(
  [
    // Layout base
    "group/button inline-flex shrink-0 items-center justify-center gap-1.5",
    "rounded-lg border border-transparent text-sm font-medium whitespace-nowrap",
    "transition-[color,background-color,border-color,transform,box-shadow] duration-(--motion-fast) ease-(--ease-standard)",
    "outline-none select-none",
    // Focus ring
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    // Active press
    "active:not-aria-[haspopup]:translate-y-px",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50",
    // Icon helpers
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border-border bg-background text-foreground hover:bg-muted hover:text-foreground dark:bg-input/30 dark:hover:bg-input/50",
        ghost:
          "text-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/40 dark:bg-destructive/20 dark:hover:bg-destructive/30",
      },
      size: {
        sm: "h-7 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-8 px-3",
        lg: "h-10 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonBaseProps = React.ComponentProps<typeof ButtonPrimitive>;

export interface ButtonProps
  extends ButtonBaseProps,
    VariantProps<typeof buttonVariants> {
  /** Mostra spinner inline + bloqueia clicks. */
  loading?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const state = loading ? "loading" : isDisabled ? "disabled" : "idle";

  return (
    <ButtonPrimitive
      data-slot="button"
      data-state={state}
      disabled={isDisabled}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </ButtonPrimitive>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className="size-3.5 animate-spin"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 1-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { buttonVariants };
