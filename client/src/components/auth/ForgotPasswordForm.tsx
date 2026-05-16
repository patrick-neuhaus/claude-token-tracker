import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { surface } from "@/lib/surface";
import { CheckCircle } from "lucide-react";

interface Props {
  onSubmit?: (email: string) => Promise<void> | void;
  onGoLogin: () => void;
}

/**
 * ForgotPasswordForm — canonical CRM lift (anti-ai-design-system, R7).
 * Single-step email request. After submit, shows "enviado" state.
 */
export function ForgotPasswordForm({ onSubmit, onGoLogin }: Props) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await onSubmit?.(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`${surface.primary} w-full max-w-md px-6 py-6`}>
      {!sent ? (
        <>
          <div className="text-center mb-5">
            <h2 className="font-display text-xl font-semibold tracking-tight mb-1">
              Recuperar senha
            </h2>
            <p className="text-sm text-muted-foreground">
              Digite seu email e enviaremos instruções pra redefinir
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Enviando..." : "Enviar instruções"}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}
          >
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">Enviado</h3>
            <p className="text-sm text-muted-foreground">
              Se houver uma conta com <strong className="text-foreground">{email}</strong>, você receberá um email em instantes.
            </p>
          </div>
        </div>
      )}
      <div className="mt-5 text-center text-sm">
        <button
          type="button"
          onClick={onGoLogin}
          className="text-info underline"
        >
          ← Voltar pro login
        </button>
      </div>
    </div>
  );
}
