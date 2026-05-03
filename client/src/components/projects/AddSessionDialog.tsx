import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { formatUSD } from "@/lib/formatters";

interface UnassignedSession {
  id: string;
  session_id: string;
  custom_name: string | null;
  source: string;
  entry_count: number;
  total_cost_usd: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedSessions: UnassignedSession[] | undefined;
  isPending: boolean;
  onAssign: (sessionIds: string[]) => void;
}

/**
 * AddSessionDialog — multi-select session picker dialog. Extracted from
 * ProjectDetailPage:457-518.
 *
 * State boundary: parent owns dialog open/close + pending state + commit
 * handler. Component owns local selection set, reset on each open via
 * `key={open}` re-mount.
 */
export function AddSessionDialog({
  open,
  onOpenChange,
  unassignedSessions,
  isPending,
  onAssign,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSession(sessionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function handleCommit() {
    onAssign(Array.from(selected));
    setSelected(new Set());
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelected(new Set());
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Sessões</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-2 py-2">
          {!unassignedSessions || unassignedSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma sessão disponível para adicionar
            </p>
          ) : (
            unassignedSessions.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                  selected.has(s.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
                onClick={() => toggleSession(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.custom_name || s.session_id.slice(0, 16)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.source} &middot; {s.entry_count} entradas &middot;{" "}
                    {formatUSD(s.total_cost_usd)}
                  </p>
                </div>
                <div
                  className={`ml-3 h-5 w-5 rounded border flex items-center justify-center ${
                    selected.has(s.id)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {selected.has(s.id) && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCommit}
            disabled={selected.size === 0 || isPending}
          >
            {isPending ? "Adicionando..." : `Adicionar (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
