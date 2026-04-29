import { surface, surfaceHeader, surfaceContent } from "@/lib/surface";

interface Props {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Action area on the right of the header (button, badge, etc). */
  actions?: React.ReactNode;
  /** Strip header padding/border — when content has its own header (e.g. tables). */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Section — replaces `<Card><CardHeader><CardTitle>X</CardTitle></CardHeader><CardContent>...</CardContent></Card>`
 * pattern. Uses surface.section snippet from lib/surface.ts.
 *
 * If you don't need a header, use `<div className={surface.primary}>` directly.
 */
export function Section({ title, description, actions, flush = false, className = "", children }: Props) {
  const hasHeader = !!title || !!actions;
  return (
    <div className={`${surface.section} ${className}`}>
      {hasHeader && (
        <div className={`${surfaceHeader} flex items-center justify-between gap-3 flex-wrap`}>
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-sm font-semibold tracking-tight">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : surfaceContent}>{children}</div>
    </div>
  );
}
