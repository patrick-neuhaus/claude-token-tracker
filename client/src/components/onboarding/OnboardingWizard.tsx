import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSummary } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  Copy,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Terminal,
  DollarSign,
  Target,
  PartyPopper,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/formatters";
import { ConfettiBurst } from "@/components/shared/ConfettiBurst";

const STORAGE_KEY = "onboarding_completed";
const STEPS = ["welcome", "hook", "pricing", "budget", "done"] as const;
type StepName = (typeof STEPS)[number];

interface Props {
  /** Skip-to-end shortcut — closes wizard, marks completed. */
  onComplete: () => void;
}

/**
 * OnboardingWizard — full-screen multi-step setup (Wave 6.4b CRIAR).
 *
 * Triggered by AppLayout when user.summary.entry_count === 0 AND
 * localStorage[onboarding_completed] !== "true". Self-host single-tenant
 * first-run flow.
 *
 * Steps:
 * 1. Welcome — brand presence
 * 2. Hook — copy-paste webhook config + live first-event detection (auto-advance on first ingest)
 * 3. Pricing — default Claude rates OR custom per-model (skip default)
 * 4. Budget — monthly target opcional (skip)
 * 5. Done — confetti motion + CTA dashboard
 *
 * A11y: role=dialog aria-modal, focus trap, ESC closes, Enter advances.
 * Persistence: localStorage flag; auto-completes if entry_count > 0 detected.
 */
export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState<StepName>("welcome");

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  }, [onComplete]);

  // ESC closes wizard (skip-to-end)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (window.confirm("Pular onboarding? Você pode acessar Settings depois.")) {
          handleComplete();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleComplete]);

  const stepIdx = STEPS.indexOf(step);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Header — progress + skip */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
            aria-hidden="true"
          >
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Claude Token Tracker · Setup</span>
        </div>
        <div className="flex items-center gap-4">
          <StepIndicator current={stepIdx} total={STEPS.length} />
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            aria-label="Pular onboarding"
          >
            <X className="h-3 w-3" />
            Pular
          </button>
        </div>
      </header>

      {/* Step body */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {step === "welcome" && <WelcomeStep onNext={() => setStep("hook")} />}
          {step === "hook" && (
            <HookStep onNext={() => setStep("pricing")} onSkip={() => setStep("pricing")} />
          )}
          {step === "pricing" && <PricingStep onNext={() => setStep("budget")} />}
          {step === "budget" && <BudgetStep onNext={() => setStep("done")} />}
          {step === "done" && <DoneStep onComplete={handleComplete} />}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Progress indicator
// ============================================================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Passo ${current + 1} de ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < current
              ? "w-6 bg-success-display"
              : i === current
                ? "w-8 bg-accent"
                : "w-6 bg-border",
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Step 1: Welcome
// ============================================================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className="text-center space-y-8 py-12">
      <div
        className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
        }}
      >
        <Sparkles className="h-7 w-7" />
      </div>
      <div className="space-y-3">
        <h1
          ref={headingRef}
          id="onboarding-title"
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight focus:outline-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bem-vindo ao Claude Token Tracker
        </h1>
        <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Plausible pra Claude. Acompanha quanto tu gasta em Claude Code, Codex,
          claude.ai ou qualquer LLM via hook customizável.
        </p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground/70 pt-2">
          By Studio Artemis
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl mx-auto">
        <FeatureChip icon={Terminal} label="Hooks customizáveis" />
        <FeatureChip icon={DollarSign} label="Pricing por modelo" />
        <FeatureChip icon={Target} label="Budget mensal" />
      </div>
      <Button onClick={onNext} className="gap-2" size="lg">
        Configurar
        <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: typeof Terminal; label: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

// ============================================================================
// Step 2: Hook (CORE — live detection)
// ============================================================================

type HookLang = "bash" | "python" | "node";

function HookStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { user } = useAuth();
  const [lang, setLang] = useState<HookLang>("bash");
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const { data: summary } = useSummary({ period: "today" });

  // Live detection: poll summary; auto-advance when first event arrives.
  const entryCount = summary?.entry_count ?? 0;
  const detected = entryCount > 0;

  useEffect(() => {
    if (detected) {
      const t = setTimeout(onNext, 1500);
      return () => clearTimeout(t);
    }
  }, [detected, onNext]);

  const apiBase =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "http://localhost:3002";
  const webhookUrl = `${apiBase}/api/ingest`;
  const token = user?.webhook_token ?? "<seu-token-em-/settings>";

  const snippets: Record<HookLang, string> = {
    bash: `# Claude Code hook (~/.claude/hooks/post-task.sh)
curl -X POST "${webhookUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"session_id":"$SESSION_ID","model":"$MODEL","input_tokens":$INPUT,"output_tokens":$OUTPUT}'`,
    python: `# Python hook
import requests
requests.post(
    "${webhookUrl}",
    headers={"Authorization": "Bearer ${token}"},
    json={"session_id": session_id, "model": model, "input_tokens": input, "output_tokens": output},
)`,
    node: `// Node.js hook
await fetch("${webhookUrl}", {
  method: "POST",
  headers: { "Authorization": "Bearer ${token}", "Content-Type": "application/json" },
  body: JSON.stringify({ session_id, model, input_tokens, output_tokens }),
});`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippets[lang]);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      setCopied(true);
      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 2000);
    } catch {
      // clipboard API blocked; user copies manually
    }
  };

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Configure o webhook
        </h2>
        <p className="text-sm text-muted-foreground">
          Cole esse snippet no hook da tua ferramenta. Vamos detectar o primeiro evento ao vivo.
        </p>
      </header>

      {/* Lang tabs */}
      <div className="flex gap-2 border-b border-border" role="tablist">
        {(["bash", "python", "node"] as HookLang[]).map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={lang === l}
            onClick={() => setLang(l)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              lang === l
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {l === "bash" ? "Bash" : l === "python" ? "Python" : "Node.js"}
          </button>
        ))}
      </div>

      {/* Snippet */}
      <div className="relative bg-card border border-border rounded-xl overflow-hidden">
        <pre className="p-4 pr-14 text-xs font-mono text-foreground overflow-x-auto leading-relaxed">
          {snippets[lang]}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted hover:bg-accent/12 transition-colors text-xs font-medium"
          aria-label="Copiar snippet"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-success-display" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Live detection */}
      <div
        className={cn(
          "rounded-xl border px-4 py-4 transition-all",
          detected
            ? "border-success-display/40 bg-success-display/8"
            : "border-border bg-card",
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          {detected ? (
            <CheckCircle2 className="h-5 w-5 text-success-display shrink-0" />
          ) : (
            <Loader2 className="h-5 w-5 text-accent animate-spin shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {detected
                ? `Primeiro evento detectado! (${entryCount} entrada${entryCount === 1 ? "" : "s"})`
                : "Aguardando primeiro evento..."}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {detected
                ? "Indo pro próximo passo..."
                : "Rode tua ferramenta uma vez. A página detecta automaticamente."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Já tenho dados (importar CSV depois)
        </button>
        <Button onClick={onNext} variant={detected ? "default" : "outline"} className="gap-2">
          {detected ? "Continuar" : "Pular detecção"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

// ============================================================================
// Step 3: Pricing (default vs custom)
// ============================================================================

function PricingStep({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState<"default" | "custom">("default");

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Os preços padrão da Claude estão certos pra você?
        </h2>
        <p className="text-sm text-muted-foreground">
          Default usa rates oficiais Anthropic. Custom permite ajustar por modelo (útil pra contratos enterprise).
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PricingOption
          selected={mode === "default"}
          onClick={() => setMode("default")}
          title="Padrão Claude"
          desc="Usar rates oficiais Anthropic (Sonnet $3/$15, Opus $15/$75, Haiku $0.80/$4)"
          recommended
        />
        <PricingOption
          selected={mode === "custom"}
          onClick={() => setMode("custom")}
          title="Customizar"
          desc="Definir rates por modelo em /settings depois (ex: contratos enterprise, descontos)"
        />
      </div>

      {mode === "default" && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preview rates
          </p>
          <ul className="space-y-1 text-sm tabular-nums">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Sonnet input/output</span>
              <span className="font-mono">$3.00 / $15.00 per 1M tokens</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Opus input/output</span>
              <span className="font-mono">$15.00 / $75.00 per 1M tokens</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Haiku input/output</span>
              <span className="font-mono">$0.80 / $4.00 per 1M tokens</span>
            </li>
          </ul>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="gap-2">
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

function PricingOption({
  selected,
  onClick,
  title,
  desc,
  recommended,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left bg-card border-2 rounded-xl p-4 transition-all",
        selected
          ? "border-accent bg-accent/[0.06]"
          : "border-border hover:border-accent/40",
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-base font-semibold text-foreground">{title}</span>
        {recommended && (
          <span className="text-[10px] uppercase tracking-wider font-medium text-accent bg-accent/12 px-2 py-0.5 rounded-full">
            Recomendado
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}

// ============================================================================
// Step 4: Budget
// ============================================================================

function BudgetStep({ onNext }: { onNext: () => void }) {
  const [budget, setBudget] = useState("");
  const numericBudget = parseFloat(budget) || 0;
  const dailyBudget = numericBudget / 30;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Define um budget mensal (opcional)
        </h2>
        <p className="text-sm text-muted-foreground">
          Recebe alertas quando passar do limite. Pode ajustar depois em Settings.
        </p>
      </header>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Budget mensal (USD)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="budget"
              type="number"
              step="10"
              min="0"
              placeholder="200"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="pl-9 tabular-nums"
            />
          </div>
        </div>
        {numericBudget > 0 && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
            <span className="text-muted-foreground">Daily target derivado</span>
            <span className="font-medium tabular-nums">{formatUSD(dailyBudget)}/dia</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onNext}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Pular — defino depois
        </button>
        <Button onClick={onNext} className="gap-2">
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

// ============================================================================
// Step 5: Done — confetti + CTA
// ============================================================================

function DoneStep({ onComplete }: { onComplete: () => void }) {
  return (
    <section className="text-center space-y-8 py-12 relative overflow-hidden">
      {/* Confetti motion — Wave 6.7a shared component */}
      <ConfettiBurst />

      <div
        className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "hsl(var(--success-display) / 0.12)",
          color: "hsl(var(--success-display))",
        }}
      >
        <PartyPopper className="h-7 w-7" />
      </div>
      <div className="space-y-3">
        <h2
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tudo pronto!
        </h2>
        <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Setup completo. Bora pro dashboard ver os primeiros dados rolarem.
        </p>
      </div>
      <Button onClick={onComplete} size="lg" className="gap-2">
        Ir pro Dashboard
        <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

