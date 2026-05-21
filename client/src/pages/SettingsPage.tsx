import { useState } from "react";
import { DollarSign, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { WebhookInfo } from "@/components/settings/WebhookInfo";
import { CsvImport } from "@/components/settings/CsvImport";
import { PricingDrawer } from "@/components/settings/PricingDrawer";
import { TokenEditor } from "@/components/settings/TokenEditor";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [pricingOpen, setPricingOpen] = useState(false);
  const [resettingTour, setResettingTour] = useState(false);

  if (!user) return null;

  // Worker RR: "Refazer tour" — PATCH onboarding_completed=false, refresh user;
  // AppLayout vai re-renderizar OnboardingWizard automático (showOnboarding cond).
  async function handleRedoTour() {
    setResettingTour(true);
    try {
      await api.patch("/auth/me/onboarding", { completed: false });
      await refreshUser();
      toast.success("Tour reaberto — preparando setup...");
    } catch (err) {
      console.error("[Settings] reset onboarding failed:", err);
      toast.error("Não consegui reabrir o tour. Tenta de novo.");
    } finally {
      setResettingTour(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        crumb="conta · configurações"
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleRedoTour}
              disabled={resettingTour}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {resettingTour ? "Abrindo..." : "Refazer tour"}
            </Button>
            <Button variant="outline" onClick={() => setPricingOpen(true)} className="gap-2">
              <DollarSign className="h-4 w-4" />
              Customizar pricing
            </Button>
          </>
        }
      />
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
      <TokenEditor />
      <PricingDrawer open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
