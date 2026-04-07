import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import { Bell, CalendarClock } from "lucide-react";
import { NativeSelect } from "@/components/shared/NativeSelect";

const DOW_OPTIONS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

interface Props {
  brlRate: number;
  planCostUsd: number;
  dailyBudgetUsd?: number | null;
  sessionBudgetUsd?: number | null;
  planStartDate?: string | null;
  weeklyResetDow?: number;
  weeklyResetHour?: number;
}

export function SettingsForm({
  brlRate, planCostUsd, dailyBudgetUsd, sessionBudgetUsd,
  planStartDate, weeklyResetDow = 2, weeklyResetHour = 15,
}: Props) {
  const [rate, setRate] = useState(String(brlRate));
  const [plan, setPlan] = useState(String(planCostUsd));
  const [daily, setDaily] = useState(dailyBudgetUsd != null ? String(dailyBudgetUsd) : "");
  const [session, setSession] = useState(sessionBudgetUsd != null ? String(sessionBudgetUsd) : "");
  const [startDate, setStartDate] = useState(planStartDate?.slice(0, 10) || "");
  const [resetDow, setResetDow] = useState(weeklyResetDow);
  const [resetHour, setResetHour] = useState(String(weeklyResetHour));
  const update = useUpdateSettings();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate(
      {
        brl_rate: parseFloat(rate),
        plan_cost_usd: parseFloat(plan),
        daily_budget_usd: daily ? parseFloat(daily) : null,
        session_budget_usd: session ? parseFloat(session) : null,
        plan_start_date: startDate || null,
        weekly_reset_dow: resetDow,
        weekly_reset_hour: parseInt(resetHour) || 15,
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

          {/* Billing info */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ciclo do Plano</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Data de início do plano</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Quando começou a pagar o Claude (calcula meses pagos)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Reset semanal — dia</Label>
                  <NativeSelect
                    sizing="default"
                    value={resetDow}
                    onChange={(e) => setResetDow(parseInt(e.target.value))}
                    className="w-full"
                  >
                    {DOW_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label>Reset semanal — hora (BRT)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={resetHour}
                    onChange={(e) => setResetHour(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Dia e hora que o limite semanal do Claude reseta (horário de Brasília)
              </p>
            </div>
          </div>

          {/* Alertas */}
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
