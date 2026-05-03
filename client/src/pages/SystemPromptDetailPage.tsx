import { useParams } from "react-router-dom";
import { useState } from "react";
import { Code2, Eye, ScrollText } from "lucide-react";
import { useSystemPromptDetail } from "@/hooks/useSystemPrompts";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { MarkdownDocPanel } from "@/components/shared/MarkdownDocPanel";
import { ViewModeToggle } from "@/components/shared/ViewModeToggle";
import { DetailHeader } from "@/components/shared/DetailHeader";

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
      <DetailHeader
        backTo="/system-prompts"
        backLabel="System Prompts"
        title={prompt.label}
        icon={ScrollText}
        subtitle={
          <>
            <p className="text-xs font-mono text-muted-foreground break-all">{prompt.path}</p>
            <p className="text-xs text-muted-foreground tabular-nums mt-1">
              {prompt.lineCount} linhas · {(prompt.bytes / 1024).toFixed(1)}KB
            </p>
          </>
        }
        actions={
          <ViewModeToggle
            options={[
              { value: "rendered", icon: Eye, label: "Render" },
              { value: "raw", icon: Code2, label: "Raw" },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        }
      />

      <MarkdownDocPanel content={prompt.body} mode={viewMode} />
    </div>
  );
}
