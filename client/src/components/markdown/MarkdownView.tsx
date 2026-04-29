import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  mode?: "rendered" | "raw";
}

export function MarkdownView({ content, mode = "rendered" }: Props) {
  if (mode === "raw") {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground overflow-x-auto">
        {content}
      </pre>
    );
  }
  return (
    <div className="prose prose-sm prose-invert max-w-none
                    prose-headings:font-semibold prose-headings:tracking-tight
                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm
                    prose-p:text-sm prose-p:leading-relaxed
                    prose-li:text-sm prose-li:my-0.5
                    prose-code:text-info prose-code:bg-muted/40 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-muted/40 prose-pre:border prose-pre:border-border prose-pre:text-xs
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-a:text-info prose-a:no-underline hover:prose-a:underline
                    prose-table:text-sm prose-th:text-foreground prose-th:font-semibold
                    prose-blockquote:border-l-info prose-blockquote:text-muted-foreground
                    prose-hr:border-border">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
