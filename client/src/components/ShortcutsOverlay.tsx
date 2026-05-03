import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "K"], description: "Abrir busca global" },
  { keys: ["⌘", "K"], description: "Abrir busca global (macOS)" },
  { keys: ["?"], description: "Abrir esta lista de atalhos" },
  { keys: ["↑", "↓"], description: "Navegar nos resultados" },
  { keys: ["Enter"], description: "Abrir resultado selecionado" },
  { keys: ["Esc"], description: "Fechar diálogo / cancelar edição" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ShortcutsOverlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Use os atalhos para navegar mais rápido pelo app.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.description}
              className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm text-foreground">{s.description}</span>
              <div className="flex items-center gap-1 shrink-0">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="font-mono text-[11px] border border-border rounded px-1.5 py-0.5 bg-muted/40 text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
