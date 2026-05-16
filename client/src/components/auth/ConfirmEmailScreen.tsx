import { Button } from "@/components/ui/button";
import { surface } from "@/lib/surface";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export type ConfirmStatus = "pending" | "success" | "error";

interface Props {
  status?: ConfirmStatus;
  email?: string;
  onContinue?: () => void;
  onResend?: () => void;
}

/**
 * ConfirmEmailScreen — canonical CRM lift (anti-ai-design-system, R7).
 * Token-landing screen showing email verification result.
 * Status: pending (verifying) | success (verified) | error (link bad/expired).
 */
const VARIANTS = {
  pending: {
    Icon: Loader2,
    iconClass: "text-info animate-spin",
    bgVar: "hsl(var(--primary) / 0.12)",
    title: "Verificando...",
    body: "Aguarde enquanto confirmamos seu email.",
  },
  success: {
    Icon: CheckCircle,
    iconClass: "text-success",
    bgVar: "hsl(var(--success) / 0.12)",
    title: "Email confirmado",
    body: null as string | null,
  },
  error: {
    Icon: XCircle,
    iconClass: "text-destructive",
    bgVar: "hsl(var(--destructive) / 0.12)",
    title: "Link inválido ou expirado",
    body: "Solicite um novo link de confirmação.",
  },
};

export function ConfirmEmailScreen({ status = "pending", email, onContinue, onResend }: Props) {
  const v = VARIANTS[status] ?? VARIANTS.pending;
  const Icon = v.Icon;
  const body = v.body ?? (email ? `${email} foi verificado com sucesso.` : "Sua conta está pronta pra uso.");

  return (
    <div className={`${surface.primary} w-full max-w-md px-6 py-8 text-center`}>
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
        style={{ background: v.bgVar }}
      >
        <Icon className={`h-7 w-7 ${v.iconClass}`} />
      </div>
      <h2 className="font-display text-xl font-semibold mb-2">{v.title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm mx-auto">
        {body}
      </p>
      {status === "success" && (
        <Button onClick={onContinue} className="w-full">
          Continuar pro app
        </Button>
      )}
      {status === "error" && (
        <Button onClick={onResend} variant="outline" className="w-full">
          Reenviar email
        </Button>
      )}
    </div>
  );
}
