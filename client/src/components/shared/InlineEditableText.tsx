import { useState, type ReactNode } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  /** Current value (source of truth from parent). */
  value: string;
  /** Save handler — receives trimmed new value. */
  onSave: (next: string) => void;
  /** Render function for display mode (non-editing). */
  renderDisplay: (value: string) => ReactNode;
  /** Placeholder when value is empty. */
  placeholder?: string;
  /** Tailwind class for the input. */
  inputClassName?: string;
  /** Aria-label for save button. */
  saveLabel?: string;
  /** Aria-label for cancel button. */
  cancelLabel?: string;
  /** If true, treats empty trimmed value as invalid (won't save). */
  required?: boolean;
}

/**
 * InlineEditableText — atom for inline-editable text. Click display to edit,
 * Enter saves, Escape cancels. Local state during edit; commits via onSave.
 *
 * Used by ProjectHeaderEditable for name + description editing. Designed to
 * be reusable for any editable text label/field where the parent owns the
 * persisted value.
 */
export function InlineEditableText({
  value,
  onSave,
  renderDisplay,
  placeholder = "Clique para editar…",
  inputClassName,
  saveLabel = "Salvar",
  cancelLabel = "Cancelar",
  required = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();
    if (required && !trimmed) return;
    onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder={placeholder}
          className={cn("h-auto py-1", inputClassName)}
          autoFocus
        />
        <Button variant="ghost" size="icon" onClick={save} aria-label={saveLabel}>
          <Check className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={cancel} aria-label={cancelLabel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 group cursor-pointer"
      onClick={startEdit}
    >
      {renderDisplay(value || "")}
      <Pencil className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}
