import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Lock, FileText, FolderTree, Search, Code2, Eye } from "lucide-react";
import { useSkillDetail, useSkillFile, type SkillSource } from "@/hooks/useSkills";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillFileTree } from "@/components/skills/SkillFileTree";
import { SkillSearch } from "@/components/skills/SkillSearch";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { ErrorState } from "@/components/shared/ErrorState";

const SOURCE_COLOR: Record<SkillSource, string> = {
  skillforge: "border-info/40 bg-info/10 text-info",
  omc: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  builtin: "border-border bg-muted/30 text-muted-foreground",
};

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
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2 flex-1 min-w-0">
          <Link to="/skills" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            Skills
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold tracking-tight font-mono">{skill.name}</h2>
            <Badge variant="outline" className={`text-[10px] ${SOURCE_COLOR[skill.source]}`}>
              {skill.source}
            </Badge>
            {skill.lockedAt && (
              <span
                className="inline-flex items-center gap-1 text-xs text-warning border border-warning/40 bg-warning/10 px-2 py-0.5 rounded-sm"
                title="Lock-in IL-10"
              >
                <Lock className="h-3 w-3" />
                validated:{skill.lockedAt}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{skill.description}</p>
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
          <div className="bg-card border border-border rounded-md px-6 py-5">
            <MarkdownView content={skill.body} mode={viewMode} />
          </div>
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
