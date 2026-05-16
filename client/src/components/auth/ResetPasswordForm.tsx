import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { surface } from "@/lib/surface";
import { CheckCircle } from "lucide-react";

interface Props {
  /** Token from email reset link (passed via URL query). */
  token?: string;
  onSubmit?: (password: string, token?: string) => Promise<void> | void;
  onGoLogin: () => void;
}

/**
 * ResetPasswordForm — canonical CRM lift (anti-ai-design-system, R7).
 * User arrives here from email link. Sets new password + confirm.
 * Validation: min 8 chars + match.
 */
export function ResetPasswordForm({ token, onSubmit, onGoLogin }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 8 && password === confirm && !pending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setPending(true);
    try {
      await onSubmit?.(password, token);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`${surface.primary} w-full max-w-md px-6 py-6`}>
      {!done ? (
        <>
          <div className="text-center mb-5">
            <h2 className="font-display text-xl font-semibold tracking-tight mb-1">
              Nova senha
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie uma senha forte. Mínimo 8 caracteres.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nova senha</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={tooShort}
                required
              />
              {tooShort && (
                <p className="text-xs text-destructive">Mínimo 8 caracteres</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Confirmar senha</Label>
              <Input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                aria-invalid={mismatch}
                required
              />
              {mismatch && (
                <p className="text-xs text-destructive">As senhas não conferem</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {pending ? "Salvando..." : "Salvar nova senha"}
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
            <h3 className="font-display text-lg font-semibold mb-1">Senha redefinida</h3>
            <p className="text-sm text-muted-foreground">
              Sua senha foi atualizada. Você já pode entrar com a nova senha.
            </p>
          </div>
          <Button onClick={onGoLogin} className="w-full">
            Voltar pro login
          </Button>
        </div>
      )}
    </div>
  );
}
