import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { useUpdateSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import { Bell, CalendarClock } from "lucide-react";
import { NativeSelect } from "@/components/shared/NativeSelect";
import { surface, surfaceHeader, surfaceContent } from "@/lib/surface";

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

type FieldErrors = Partial<
  Record<"rate" | "plan" | "daily" | "session" | "resetHour" | "startDate", string>
>;

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

/**
 * SettingsForm — Wave 6.5 lift to canonical FormField pattern + surface helpers.
 *
 * Drops Section wrapper for direct surface.section + surfaceHeader. FormField
 * wraps every input with auto-aria injection (aria-invalid, aria-describedby).
 * Validation logic preserved (live: error on blur, clear on change).
 */
export function SettingsForm({
  brlRate,
  planCostUsd,
  dailyBudgetUsd,
  sessionBudgetUsd,
  planStartDate,
  weeklyResetDow = 2,
  weeklyResetHour = 15,
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

  const clearError = (field: keyof FieldErrors) =>
    setErrors((p) => (p[field] ? { ...p, [field]: undefined } : p));

  return (
    <div className={surface.section}>
      <header className={surfaceHeader}>
        <h2 className="text-base font-semibold tracking-tight">Configurações</h2>
      </header>
      <div className={surfaceContent}>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
          <FormField
            id="settings-rate"
            label="Taxa USD → BRL"
            htmlFor="settings-rate"
            error={errors.rate}
            helper="Usado para calcular valores em BRL no dashboard"
            required
          >
            <Input
              id="settings-rate"
              type="number"
              step="0.01"
              min={0}
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                clearError("rate");
              }}
            />
          </FormField>

          <FormField
            id="settings-plan"
            label="Custo mensal do plano (USD)"
            htmlFor="settings-plan"
            error={errors.plan}
            helper="Usado para calcular o indicador de valor do plano"
            required
          >
            <Input
              id="settings-plan"
              type="number"
              step="0.01"
              min={0}
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                clearError("plan");
              }}
            />
          </FormField>

          {/* Billing info */}
          <div className="border-t border-border pt-5 mt-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ciclo do Plano</span>
            </div>
            <div className="space-y-3">
              <FormField
                id="settings-startdate"
                label="Data de início do plano"
                htmlFor="settings-startdate"
                helper="Quando começou a pagar o Claude (calcula meses pagos)"
              >
                <Input
                  id="settings-startdate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="settings-resetdow"
                  label="Reset semanal — dia"
                  htmlFor="settings-resetdow"
                >
                  <NativeSelect
                    id="settings-resetdow"
                    sizing="default"
                    value={resetDow}
                    onChange={(e) => setResetDow(parseInt(e.target.value))}
                    className="w-full"
                  >
                    {DOW_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField
                  id="settings-resethour"
                  label="Reset semanal — hora (BRT)"
                  htmlFor="settings-resethour"
                  error={errors.resetHour}
                >
                  <Input
                    id="settings-resethour"
                    type="number"
                    min={0}
                    max={23}
                    step={1}
                    value={resetHour}
                    onChange={(e) => {
                      setResetHour(e.target.value);
                      clearError("resetHour");
                    }}
                  />
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">
                Dia e hora que o limite semanal do Claude reseta (horário de Brasília)
              </p>
            </div>
          </div>

          {/* Alertas */}
          <div className="border-t border-border pt-5 mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Alertas de Gasto</span>
            </div>
            <div className="space-y-3">
              <FormField
                id="settings-daily"
                label="Limite diário (USD)"
                htmlFor="settings-daily"
                error={errors.daily}
                helper="Deixe vazio para desativar"
              >
                <Input
                  id="settings-daily"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Ex: 50.00"
                  value={daily}
                  onChange={(e) => {
                    setDaily(e.target.value);
                    clearError("daily");
                  }}
                />
              </FormField>
              <FormField
                id="settings-session"
                label="Limite por sessão (USD)"
                htmlFor="settings-session"
                error={errors.session}
                helper="Deixe vazio para desativar"
              >
                <Input
                  id="settings-session"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Ex: 10.00"
                  value={session}
                  onChange={(e) => {
                    setSession(e.target.value);
                    clearError("session");
                  }}
                />
              </FormField>
            </div>
          </div>

          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
