import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Code2, Eye, ScrollText } from "lucide-react";
import { useSystemPromptDetail } from "@/hooks/useSystemPrompts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { MarkdownDocPanel } from "@/components/shared/MarkdownDocPanel";

export function SystemPromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: prompt, isLoading, isError, refetch } = useSystemPromptDetail(id);
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !prompt) {
    return (
      <ErrorState
        title="System prompt não encontrado"
        onRetry={() => refetch()}
        backLink={{ to: "/system-prompts", label: "Voltar pra lista" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2 flex-1 min-w-0">
          <Link to="/system-prompts" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            System Prompts
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-muted-foreground" />
              {prompt.label}
            </h2>
          </div>
          <p className="text-xs font-mono text-muted-foreground break-all">{prompt.path}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {prompt.lineCount} linhas · {(prompt.bytes / 1024).toFixed(1)}KB
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode(viewMode === "rendered" ? "raw" : "rendered")}
          className="gap-1.5"
        >
          {viewMode === "rendered" ? <><Code2 className="h-3.5 w-3.5" /> Raw</> : <><Eye className="h-3.5 w-3.5" /> Render</>}
        </Button>
      </div>

      <MarkdownDocPanel content={prompt.body} mode={viewMode} />
    </div>
  );
}
