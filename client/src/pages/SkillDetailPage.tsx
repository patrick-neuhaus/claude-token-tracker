import { useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Lock, FileText, FolderTree, Search, Code2, Eye, Copy, CheckCircle2, Ban } from "lucide-react";
import { useSkillDetail, useSkillFile, type SkillSource } from "@/hooks/useSkills";
import { useSkillAllowlist, useToggleSkillAllowlist } from "@/hooks/useSkillUsage";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pill } from "@/components/shared/Pill";
import { Button } from "@/components/ui/button";
import { SkillFileTree } from "@/components/skills/SkillFileTree";
import { SkillSearch } from "@/components/skills/SkillSearch";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { ErrorState } from "@/components/shared/ErrorState";
import { MarkdownDocPanel } from "@/components/shared/MarkdownDocPanel";
import { ViewModeToggle } from "@/components/shared/ViewModeToggle";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * AllowlistToggle — controle inline pra marcar skill como active/deprecated.
 * Optimistic update via React Query invalidation.
 */
function AllowlistToggle({ name }: { name: string }) {
  const { data, isLoading, isError } = useSkillAllowlist(name);
  const toggle = useToggleSkillAllowlist();

  if (isLoading) {
    return <Skeleton className="h-7 w-40" />;
  }

  // Se o backend devolver 404 (skill nunca tocada), assume "active" como default
  const status: "active" | "deprecated" =
    isError || !data ? "active" : data.status;

  function setStatus(next: "active" | "deprecated") {
    if (status === next || toggle.isPending) return;
    toggle.mutate(
      { name, status: next },
      {
        onSuccess: () => {
          toast.success(
            next === "active" ? "Marcada como ativa" : "Marcada como deprecated",
          );
        },
        onError: () => {
          toast.error("Erro ao atualizar status");
        },
      },
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-md border border-border overflow-hidden"
      role="group"
      aria-label="Status da skill no allowlist"
    >
      <button
        type="button"
        onClick={() => setStatus("active")}
        disabled={toggle.isPending}
        aria-pressed={status === "active"}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          status === "active"
            ? "bg-success/15 text-success"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          toggle.isPending && "opacity-60 cursor-wait",
        )}
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Active
      </button>
      <div className="w-px self-stretch bg-border" />
      <button
        type="button"
        onClick={() => setStatus("deprecated")}
        disabled={toggle.isPending}
        aria-pressed={status === "deprecated"}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          status === "deprecated"
            ? "bg-destructive/15 text-destructive"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          toggle.isPending && "opacity-60 cursor-wait",
        )}
      >
        <Ban className="h-3 w-3" aria-hidden="true" />
        Deprecated
      </button>
    </div>
  );
}

export function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const sourceParam = searchParams.get("source");
  const source: SkillSource | undefined =
    sourceParam === "skillforge" || sourceParam === "omc" || sourceParam === "builtin" ? sourceParam : undefined;
  const { data: skill, isLoading, isError, refetch } = useSkillDetail(name, source);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { data: fileContent } = useSkillFile(name, selectedFile, source);
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

  if (isError || !skill) {
    return (
      <ErrorState
        title="Skill não encontrada"
        onRetry={() => refetch()}
        backLink={{ to: "/skills", label: "Voltar pra lista" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="/skills"
        backLabel="Skills"
        title={skill.name}
        badges={
          <>
            <Pill variant={skill.source === "skillforge" ? "ok" : skill.source === "omc" ? "info" : "neutral"}>
              {skill.source}
            </Pill>
            {skill.lockedAt && (
              <span
                className="inline-flex items-center gap-1 text-xs text-warning border border-warning/40 bg-warning/10 px-2 py-0.5 rounded-sm"
                title="Lock-in IL-10"
              >
                <Lock className="h-3 w-3" />
                validated:{skill.lockedAt}
              </span>
            )}
          </>
        }
        subtitle={
          <p className="text-sm text-muted-foreground leading-relaxed">{skill.description}</p>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <AllowlistToggle name={skill.name} />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Copiar conteúdo"
              className="gap-1.5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(skill.body);
                  toast.success("Copiado");
                } catch {
                  toast.error("Erro ao copiar");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </Button>
            <ViewModeToggle
              options={[
                { value: "rendered", icon: Eye, label: "Render" },
                { value: "raw", icon: Code2, label: "Raw" },
              ]}
              value={viewMode}
              onChange={setViewMode}
            />
          </div>
        }
      />

      {/* Tabs */}
      <Tabs defaultValue="skill">
        <TabsList>
          <TabsTrigger value="skill" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            SKILL.md
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5">
            <FolderTree className="h-3.5 w-3.5" />
            Files ({skill.files.filter((f) => f.type === "file").length})
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skill" className="mt-4">
          <MarkdownDocPanel content={skill.body} mode={viewMode} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            <SkillFileTree
              files={skill.files}
              selectedPath={selectedFile}
              onSelect={setSelectedFile}
            />
            <div className="bg-card border border-border rounded-md min-h-[60vh] overflow-hidden">
              {selectedFile ? (
                <>
                  <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs font-mono text-muted-foreground">
                    {selectedFile}
                  </div>
                  <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                    {fileContent === undefined ? (
                      <Skeleton className="h-32" />
                    ) : selectedFile.endsWith(".md") ? (
                      <MarkdownView content={fileContent} mode={viewMode} />
                    ) : (
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-foreground">{fileContent}</pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-20">
                  Selecione um arquivo para visualizar
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <SkillSearch body={skill.body} skillName={skill.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
