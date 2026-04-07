import { useAuth } from "@/contexts/AuthContext";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { WebhookInfo } from "@/components/settings/WebhookInfo";
import { CsvImport } from "@/components/settings/CsvImport";

export function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <SettingsForm
        brlRate={user.brl_rate}
        planCostUsd={user.plan_cost_usd}
        dailyBudgetUsd={user.daily_budget_usd}
        sessionBudgetUsd={user.session_budget_usd}
      />
      <WebhookInfo webhookToken={user.webhook_token} />
      <CsvImport />
    </div>
  );
}
