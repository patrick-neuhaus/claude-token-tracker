import { useState, type FormEvent } from "react";
import { Section } from "@/components/shared/Section";
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

type FieldErrors = Partial<Record<
  "rate" | "plan" | "daily" | "session" | "resetHour" | "startDate",
  string
>>;

function validate(args: {
  rate: string;
  plan: string;
  daily: string;
  session: string;
  resetHour: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  const rateNum = parseFloat(args.rate);
  if (!args.rate || Number.isNaN(rateNum) || rateNum <= 0) {
    errors.rate = "Taxa precisa ser número maior que 0";
  }

  const planNum = parseFloat(args.plan);
  if (!args.plan || Number.isNaN(planNum) || planNum <= 0) {
    errors.plan = "Custo do plano precisa ser número maior que 0";
  }

  if (args.daily) {
    const n = parseFloat(args.daily);
    if (Number.isNaN(n) || n < 0) errors.daily = "Limite diário precisa ser número ≥ 0";
  }

  if (args.session) {
    const n = parseFloat(args.session);
    if (Number.isNaN(n) || n < 0) errors.session = "Limite por sessão precisa ser número ≥ 0";
  }

  const hourNum = parseInt(args.resetHour);
  if (Number.isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
    errors.resetHour = "Hora precisa estar entre 0 e 23";
  }

  return errors;
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const update = useUpdateSettings();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate({ rate, plan, daily, session, resetHour });
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("Corrija os campos destacados");
      return;
    }
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
        onSuccess: () => {
          setErrors({});
          toast.success("Configurações salvas!");
        },
        onError: (err: Error & { message?: string }) => {
          toast.error(err?.message || "Erro ao salvar");
        },
      },
    );
  }

  return (
    <Section title="Configurações">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
          <div className="space-y-2">
            <Label htmlFor="settings-rate">Taxa USD → BRL</Label>
            <Input
              id="settings-rate"
              type="number"
              step="0.01"
              min={0}
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                if (errors.rate) setErrors((p) => ({ ...p, rate: undefined }));
              }}
              aria-invalid={errors.rate ? true : undefined}
              aria-describedby={errors.rate ? "settings-rate-err" : "settings-rate-hint"}
            />
            {errors.rate ? (
              <p id="settings-rate-err" className="text-xs text-destructive">{errors.rate}</p>
            ) : (
              <p id="settings-rate-hint" className="text-xs text-muted-foreground">Usado para calcular valores em BRL no dashboard</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-plan">Custo mensal do plano (USD)</Label>
            <Input
              id="settings-plan"
              type="number"
              step="0.01"
              min={0}
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                if (errors.plan) setErrors((p) => ({ ...p, plan: undefined }));
              }}
              aria-invalid={errors.plan ? true : undefined}
              aria-describedby={errors.plan ? "settings-plan-err" : "settings-plan-hint"}
            />
            {errors.plan ? (
              <p id="settings-plan-err" className="text-xs text-destructive">{errors.plan}</p>
            ) : (
              <p id="settings-plan-hint" className="text-xs text-muted-foreground">Usado para calcular o indicador de valor do plano</p>
            )}
          </div>

          {/* Billing info */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ciclo do Plano</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="settings-startdate">Data de início do plano</Label>
                <Input
                  id="settings-startdate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Quando começou a pagar o Claude (calcula meses pagos)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="settings-resetdow">Reset semanal — dia</Label>
                  <NativeSelect
                    id="settings-resetdow"
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
                  <Label htmlFor="settings-resethour">Reset semanal — hora (BRT)</Label>
                  <Input
                    id="settings-resethour"
                    type="number"
                    min={0}
                    max={23}
                    step={1}
                    value={resetHour}
                    onChange={(e) => {
                      setResetHour(e.target.value);
                      if (errors.resetHour) setErrors((p) => ({ ...p, resetHour: undefined }));
                    }}
                    aria-invalid={errors.resetHour ? true : undefined}
                    aria-describedby={errors.resetHour ? "settings-resethour-err" : undefined}
                  />
                  {errors.resetHour && (
                    <p id="settings-resethour-err" className="text-xs text-destructive">{errors.resetHour}</p>
                  )}
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
                <Label htmlFor="settings-daily">Limite diário (USD)</Label>
                <Input
                  id="settings-daily"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Ex: 50.00 (deixe vazio para desativar)"
                  value={daily}
                  onChange={(e) => {
                    setDaily(e.target.value);
                    if (errors.daily) setErrors((p) => ({ ...p, daily: undefined }));
                  }}
                  aria-invalid={errors.daily ? true : undefined}
                  aria-describedby={errors.daily ? "settings-daily-err" : undefined}
                />
                {errors.daily && (
                  <p id="settings-daily-err" className="text-xs text-destructive">{errors.daily}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-session">Limite por sessão (USD)</Label>
                <Input
                  id="settings-session"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Ex: 10.00 (deixe vazio para desativar)"
                  value={session}
                  onChange={(e) => {
                    setSession(e.target.value);
                    if (errors.session) setErrors((p) => ({ ...p, session: undefined }));
                  }}
                  aria-invalid={errors.session ? true : undefined}
                  aria-describedby={errors.session ? "settings-session-err" : undefined}
                />
                {errors.session && (
                  <p id="settings-session-err" className="text-xs text-destructive">{errors.session}</p>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Salvando..." : "Salvar"}
          </Button>
      </form>
    </Section>
  );
}
