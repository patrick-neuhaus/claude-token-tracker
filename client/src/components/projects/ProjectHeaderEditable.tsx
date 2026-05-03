import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineEditableText } from "@/components/shared/InlineEditableText";
import { textH2 } from "@/lib/surface";

interface Props {
  name: string;
  description: string | null;
  onSaveName: (name: string) => void;
  onSaveDescription: (description: string) => void;
}

/**
 * ProjectHeaderEditable — back link + inline-editable name + inline-editable
 * description. Extracted from ProjectDetailPage:192-279.
 *
 * State boundary: parent owns persisted name/description; this component owns
 * only ephemeral edit drafts via InlineEditableText.
 *
 * Replaces the old `useEffect`-sync-state pattern (P1.2 fix) — value is
 * always sourced from props.
 */
export function ProjectHeaderEditable({
  name,
  description,
  onSaveName,
  onSaveDescription,
}: Props) {
  return (
    <div className="flex items-center gap-3">
      <Link to="/projects">
        <Button variant="ghost" size="icon" aria-label="Voltar para projetos">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div className="flex-1 min-w-0">
        <InlineEditableText
          value={name}
          onSave={onSaveName}
          required
          inputClassName="text-2xl font-bold"
          saveLabel="Salvar nome"
          cancelLabel="Cancelar edição do nome"
          renderDisplay={(v) => <h1 className={textH2}>{v}</h1>}
        />

        <div className="mt-1">
          <InlineEditableText
            value={description ?? ""}
            onSave={onSaveDescription}
            placeholder="Adicionar descrição..."
            inputClassName="text-sm"
            saveLabel="Salvar descrição"
            cancelLabel="Cancelar edição da descrição"
            renderDisplay={(v) => (
              <p className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {v || "Clique para adicionar descrição..."}
              </p>
            )}
          />
        </div>
      </div>
    </div>
  );
}
