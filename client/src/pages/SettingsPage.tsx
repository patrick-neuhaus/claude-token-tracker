import { useAuth } from "@/contexts/AuthContext";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { WebhookInfo } from "@/components/settings/WebhookInfo";
import { CsvImport } from "@/components/settings/CsvImport";
import { PageHeader } from "@/components/shared/PageHeader";

export function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda: Configurações + Referência de preços */}
        <div className="space-y-6">
          <SettingsForm
            brlRate={user.brl_rate}
            planCostUsd={user.plan_cost_usd}
            dailyBudgetUsd={user.daily_budget_usd}
            sessionBudgetUsd={user.session_budget_usd}
            planStartDate={user.plan_start_date}
            weeklyResetDow={user.weekly_reset_dow}
            weeklyResetHour={user.weekly_reset_hour}
          />
          <CsvImport />
        </div>
        {/* Coluna direita: Webhook */}
        <div className="space-y-6">
          <WebhookInfo webhookToken={user.webhook_token} />
        </div>
      </div>
    </div>
  );
}
