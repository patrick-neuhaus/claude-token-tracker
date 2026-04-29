import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Lock, FileText, FolderTree, Search, AlertTriangle } from "lucide-react";
import { useSkillDetail, useSkillFile } from "@/hooks/useSkills";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SkillFileTree } from "@/components/skills/SkillFileTree";
import { SkillSearch } from "@/components/skills/SkillSearch";

function MarkdownView({ content }: { content: string }) {
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

export function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { data: skill, isLoading, isError, refetch } = useSkillDetail(name);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { data: fileContent } = useSkillFile(name, selectedFile);

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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Skill não encontrada</p>
        <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        <Link to="/skills"><Button variant="ghost">Voltar pra lista</Button></Link>
      </div>
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
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight font-mono">{skill.name}</h2>
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
            <MarkdownView content={skill.body} />
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
                      <MarkdownView content={fileContent} />
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
