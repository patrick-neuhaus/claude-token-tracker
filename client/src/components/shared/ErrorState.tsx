import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  backLink?: { to: string; label: string };
  className?: string;
}

/**
 * ErrorState — semantic error fallback. Replaces the inline AlertTriangle + msg + retry pattern
 * scattered across pages. Use this (NOT EmptyState) when "we tried and it failed" — EmptyState
 * is for "no data". role="alert" + AlertTriangle + retry CTA primário.
 *
 * Resolves dedup #1 + UX F-08 (consistent retry across detail pages).
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Tentar novamente",
  backLink,
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center py-20 gap-4", className)}
    >
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <p className="text-lg font-semibold">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md text-center">{description}</p>
      )}
      {(onRetry || backLink) && (
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {backLink && (
            <Link to={backLink.to}>
              <Button variant="ghost">{backLink.label}</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
