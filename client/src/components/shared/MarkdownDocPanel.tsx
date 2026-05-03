import { MarkdownView } from "@/components/markdown/MarkdownView";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  mode?: "rendered" | "raw";
  className?: string;
}

/**
 * MarkdownDocPanel — wraps MarkdownView in a card surface (border + padding).
 * Used in skill/system-prompt detail pages for the main document panel.
 *
 * Resolves dedup #6.
 */
export function MarkdownDocPanel({ content, mode, className }: Props) {
  return (
    <div className={cn("bg-card border border-border rounded-md px-6 py-5", className)}>
      <MarkdownView content={content} mode={mode} />
    </div>
  );
}
