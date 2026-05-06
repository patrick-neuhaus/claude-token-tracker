import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Visible label text (rendered above the field). */
  label?: ReactNode;
  /** Maps to the `id` of the wrapped control. Required for screen reader association. */
  htmlFor?: string;
  /** Marks field as required (renders red asterisk). */
  required?: boolean;
  /** Helper text below — info / hint / format example. */
  helper?: ReactNode;
  /** Error message (replaces helper, paints control destructive, role=alert). */
  error?: ReactNode;
  /** Success state (post-blur valid). Replaces helper with green check. */
  success?: boolean;
  /** Field id — used to derive `error`/`helper` element ids for aria-describedby. */
  id?: string;
  /** Extra wrapper className. */
  className?: string;
  /** Wrapped control(s) — typically Input / Textarea / Select. */
  children: ReactNode;
}

/**
 * FormField — canonical lift from anti-ai-design-system forms/FormField.jsx (Wave 6.5).
 *
 * Wraps label + control + helper/error in a single declarative wrapper. Auto-injects
 * aria-invalid + aria-describedby into wrapped children for accessibility (live
 * validation pattern: pass `error` on blur, clear on change in parent state).
 *
 * - error → role=alert, destructive icon + text
 * - success → green check + "Válido"
 * - helper → muted footnote
 * Mutually exclusive priority: error > success > helper.
 */
export function FormField({
  label,
  htmlFor,
  required = false,
  helper,
  error,
  success = false,
  id,
  className,
  children,
}: Props) {
  const errorId = id ? `${id}-error` : undefined;
  const helperId = id ? `${id}-helper` : undefined;
  const describedBy = [error && errorId, !error && helper && helperId, !error && success && helperId]
    .filter(Boolean)
    .join(" ") || undefined;

  // Clone children to inject aria-describedby + aria-invalid (canonical pattern)
  const wrappedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<{
      "aria-describedby"?: string;
      "aria-invalid"?: boolean | "true" | "false";
    }>;
    return cloneElement(el, {
      "aria-describedby": describedBy ?? el.props["aria-describedby"],
      "aria-invalid": error ? true : el.props["aria-invalid"],
    });
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground inline-flex items-center"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-destructive ml-1">
              *
            </span>
          )}
        </label>
      )}
      {wrappedChildren}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-xs text-destructive leading-snug"
        >
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {!error && success && (
        <div
          id={helperId}
          className="flex items-center gap-1 text-xs text-success-display leading-snug"
        >
          <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Válido</span>
        </div>
      )}
      {!error && !success && helper && (
        <div id={helperId} className="text-xs text-muted-foreground leading-snug">
          {helper}
        </div>
      )}
    </div>
  );
}
