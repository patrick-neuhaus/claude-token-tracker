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
    <div
      className="prose prose-sm prose-invert max-w-none
                 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-20
                 prose-h1:text-2xl prose-h1:mt-0 prose-h1:mb-4
                 prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-1 prose-h2:border-b prose-h2:border-border
                 prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                 prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2 prose-h4:uppercase prose-h4:tracking-wider prose-h4:text-muted-foreground
                 prose-p:text-sm prose-p:leading-relaxed
                 prose-strong:text-foreground prose-strong:font-semibold
                 prose-em:text-foreground/90
                 prose-a:text-info prose-a:no-underline hover:prose-a:underline
                 prose-code:text-info prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:font-mono prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                 prose-pre:bg-muted/40 prose-pre:border prose-pre:border-border prose-pre:rounded-md prose-pre:text-xs prose-pre:my-3
                 prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:text-foreground
                 prose-blockquote:border-l-info prose-blockquote:text-muted-foreground prose-blockquote:font-normal prose-blockquote:not-italic
                 prose-hr:border-border prose-hr:my-6
                 prose-ul:my-2 prose-ol:my-2
                 prose-li:my-0.5 prose-li:text-sm prose-li:marker:text-muted-foreground
                 prose-table:text-sm prose-table:my-3
                 prose-th:text-foreground prose-th:font-semibold prose-th:bg-muted/30 prose-th:border-border
                 prose-td:border-border
                 [&_.task-list-item]:list-none [&_.task-list-item]:pl-0
                 [&_.task-list-item_input]:mr-2 [&_.task-list-item_input]:accent-info"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
