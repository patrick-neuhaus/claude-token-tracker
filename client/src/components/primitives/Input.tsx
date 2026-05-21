import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

/**
 * Input — Design System primitive (Fase A).
 *
 * Diferencas vs `components/ui/input`:
 * - Label + helper text via props (sem precisar wrapper Field externo)
 * - `error` state explicito (controlado, nao depende de aria-invalid externo)
 * - `data-state` attribute (idle / disabled / error)
 *
 * Migracao: ver `docs/design-system.md`.
 */

type NativeInputProps = React.ComponentProps<"input">;

export interface InputProps extends Omit<NativeInputProps, "size"> {
  /** Label acima do input. */
  label?: React.ReactNode;
  /** Helper text abaixo. Vira mensagem de erro quando `error` truthy. */
  helperText?: React.ReactNode;
  /** Texto de erro (sobrescreve helperText em red + aria-invalid). */
  error?: React.ReactNode;
  /** Wrapper className (label + input + helper). */
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      helperText,
      error,
      containerClassName,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) {
    const reactId = React.useId();
    const inputId = id ?? `input-${reactId}`;
    const helperId = `${inputId}-helper`;

    const state = error ? "error" : disabled ? "disabled" : "idle";
    const message = error ?? helperText;

    return (
      <div
        data-slot="input-root"
        data-state={state}
        className={cn("flex flex-col gap-1.5", containerClassName)}
      >
        {label && (
          <label
            htmlFor={inputId}
            data-slot="input-label"
            className="text-xs font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <InputPrimitive
          ref={ref}
          id={inputId}
          data-slot="input"
          data-state={state}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={message ? helperId : undefined}
          className={cn(
            // Layout base
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1",
            "text-base md:text-sm",
            // Motion
            "transition-colors duration-(--motion-fast) ease-(--ease-standard)",
            // Placeholder + file
            "placeholder:text-muted-foreground",
            "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            // Focus
            "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            // Disabled
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
            // Dark mode bg
            "dark:bg-input/30 dark:disabled:bg-input/80",
            // Error state
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            className
          )}
          {...props}
        />
        {message && (
          <p
            id={helperId}
            data-slot="input-helper"
            className={cn(
              "text-xs",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {message}
          </p>
        )}
      </div>
    );
  }
);
