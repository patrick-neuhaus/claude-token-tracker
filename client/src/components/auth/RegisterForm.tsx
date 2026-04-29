import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { surface } from "@/lib/surface";

interface Props {
  onSwitch: () => void;
}

export function RegisterForm({ onSwitch }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Senhas não conferem");
      return;
    }
    if (password.length < 8) {
      setError("Senha deve ter pelo menos 8 caracteres");
      return;
    }

    setPending(true);
    const res = await register(email, password);
    setPending(false);

    if (res.status === "pending") {
      setIsPendingApproval(true);
    } else if (res.status === "error") {
      setError(res.message || "Erro ao criar conta");
    }
  }

  if (isPendingApproval) {
    return (
      <div className={`${surface.primary} w-full max-w-md px-6 py-6 text-center space-y-4`}>
        <h2 className="text-lg font-semibold tracking-tight">Aguardando aprovação</h2>
        <p className="text-sm text-muted-foreground">
          Sua conta foi criada mas ainda precisa ser aprovada por um administrador.
        </p>
        <Button variant="outline" onClick={() => setIsPendingApproval(false)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className={`${surface.primary} w-full max-w-md px-6 py-6`}>
      <h2 className="text-lg font-semibold tracking-tight text-center mb-4">Criar conta</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password">Senha</Label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-confirm">Confirmar senha</Label>
          <Input
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Criando..." : "Criar conta"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <button type="button" onClick={onSwitch} className="text-info underline">
            Entrar
          </button>
        </p>
      </form>
    </div>
  );
}
