import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { surface } from "@/lib/surface";

interface Props {
  onSwitch: () => void;
}

export function LoginForm({ onSwitch }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    const res = await login(email, password);
    setPending(false);

    if (res.status === "pending") {
      setIsPendingApproval(true);
    } else if (res.status === "error") {
      setError(res.message || "Erro ao fazer login");
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
      <h2 className="text-lg font-semibold tracking-tight text-center mb-4">Entrar</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <button type="button" onClick={onSwitch} className="text-info underline">
            Criar conta
          </button>
        </p>
      </form>
    </div>
  );
}
