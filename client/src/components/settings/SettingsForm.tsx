import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import { Bell } from "lucide-react";

interface Props {
  brlRate: number;
  planCostUsd: number;
  dailyBudgetUsd?: number | null;
  sessionBudgetUsd?: number | null;
}

export function SettingsForm({ brlRate, planCostUsd, dailyBudgetUsd, sessionBudgetUsd }: Props) {
  const [rate, setRate] = useState(String(brlRate));
  const [plan, setPlan] = useState(String(planCostUsd));
  const [daily, setDaily] = useState(dailyBudgetUsd != null ? String(dailyBudgetUsd) : "");
  const [session, setSession] = useState(sessionBudgetUsd != null ? String(sessionBudgetUsd) : "");
  const update = useUpdateSettings();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate(
      {
        brl_rate: parseFloat(rate),
        plan_cost_usd: parseFloat(plan),
        daily_budget_usd: daily ? parseFloat(daily) : null,
        session_budget_usd: session ? parseFloat(session) : null,
      },
      {
        onSuccess: () => toast.success("Configurações salvas!"),
        onError: () => toast.error("Erro ao salvar"),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Taxa USD → BRL</Label>
            <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Usado para calcular valores em BRL no dashboard</p>
          </div>
          <div className="space-y-2">
            <Label>Custo mensal do plano (USD)</Label>
            <Input type="number" step="0.01" value={plan} onChange={(e) => setPlan(e.target.value)} />
            <p className="text-xs text-muted-foreground">Usado para calcular o indicador de valor do plano</p>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Alertas de Gasto</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Limite diário (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50.00 (deixe vazio para desativar)"
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Alerta quando gasto do dia ultrapassar este valor</p>
              </div>
              <div className="space-y-2">
                <Label>Limite por sessão (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 10.00 (deixe vazio para desativar)"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Destaca sessões que ultrapassarem este valor</p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
