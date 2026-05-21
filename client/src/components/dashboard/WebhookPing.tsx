import { Settings, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// WebhookPing — Empty state Dashboard quando setup completed mas entries.count === 0.
// Spec: audits/05-component-architect.md §5
// Motion: pulse loop --motion-pulse-loop 2s. Reduced motion = static.

function maskToken(token: string | null | undefined): string {
  if (!token) return "··· no token ···";
  const t = String(token);
  if (t.length <= 12) return t;
  return `${t.slice(0, 3)}_${"·".repeat(8)}${t.slice(-4)}`;
}

export function WebhookPing() {
  const { user } = useAuth();
  const tokenPreview = maskToken(user?.webhook_token);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-20 gap-6 max-w-md mx-auto text-center"
    >
      <div className="relative flex items-center justify-center" aria-hidden="true">
        <span className="webhook-ping-dot relative inline-flex h-4 w-4 rounded-full bg-accent" />
        <span className="webhook-ping-halo absolute inline-flex h-4 w-4 rounded-full bg-accent" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Aguardando primeiro hit...
        </h2>
        <p className="text-sm text-muted-foreground">
          Sistema ativo. Configure o coletor nos seus scripts ou importe um CSV pra começar.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card px-4 py-3 text-left w-full">
        <div className="flex items-center gap-2 text-xs text-success-display font-medium mb-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Webhook configured
        </div>
        <div className="font-mono text-xs text-muted-foreground tabular-nums">
          Token: {tokenPreview}
        </div>
      </div>

      <Link to="/settings">
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Ver setup completo
        </Button>
      </Link>
    </div>
  );
}
