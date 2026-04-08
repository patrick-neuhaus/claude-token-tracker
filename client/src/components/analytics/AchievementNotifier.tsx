import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STORAGE_KEY = "achievements_seen";

function getSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

// Versão simplificada dos badges — só IDs e thresholds
function getUnlockedIds(data: any): string[] {
  if (!data) return [];
  const e = data.total_entries || 0;
  const c = data.total_cost || 0;
  const t = Number(data.total_tokens || 0);
  const s = data.total_sessions || 0;
  const d = data.active_days || 0;
  const m = data.models_used || 0;
  const p = data.project_count || 0;
  const me = data.max_session_entries || 0;
  const mc = data.max_session_cost || 0;
  const cs = data.cache_savings_usd || 0;

  const checks: [string, boolean][] = [
    ["calls-100", e >= 100], ["calls-500", e >= 500], ["calls-1k", e >= 1e3], ["calls-5k", e >= 5e3],
    ["calls-10k", e >= 1e4], ["calls-50k", e >= 5e4], ["calls-100k", e >= 1e5],
    ["cost-100", c >= 100], ["cost-500", c >= 500], ["cost-1k", c >= 1e3], ["cost-5k", c >= 5e3],
    ["cost-10k", c >= 1e4], ["cost-25k", c >= 25e3], ["cost-50k", c >= 5e4], ["cost-100k", c >= 1e5],
    ["tokens-1m", t >= 1e6], ["tokens-10m", t >= 1e7], ["tokens-100m", t >= 1e8], ["tokens-1b", t >= 1e9],
    ["tokens-10b", t >= 1e10], ["tokens-100b", t >= 1e11], ["tokens-1t", t >= 1e12],
    ["sessions-5", s >= 5], ["sessions-10", s >= 10], ["sessions-25", s >= 25], ["sessions-50", s >= 50],
    ["sessions-100", s >= 100], ["sessions-250", s >= 250], ["sessions-500", s >= 500], ["sessions-1k", s >= 1e3],
    ["days-3", d >= 3], ["days-7", d >= 7], ["days-14", d >= 14], ["days-30", d >= 30],
    ["days-90", d >= 90], ["days-180", d >= 180], ["days-365", d >= 365],
    ["cache-10", cs >= 10], ["cache-25", cs >= 25], ["cache-50", cs >= 50], ["cache-100", cs >= 100],
    ["cache-250", cs >= 250], ["cache-500", cs >= 500], ["cache-1k", cs >= 1e3], ["cache-2500", cs >= 2500],
    ["cache-5k", cs >= 5e3],
    ["models-2", m >= 2], ["models-3", m >= 3],
    ["projects-1", p >= 1], ["projects-3", p >= 3], ["projects-10", p >= 10],
    ["epic-100", me >= 100], ["epic-500", me >= 500], ["epic-1k", me >= 1e3], ["epic-5k", me >= 5e3],
    ["whale-50", mc >= 50], ["whale-100", mc >= 100], ["whale-500", mc >= 500], ["whale-1k", mc >= 1e3],
    ["whale-5k", mc >= 5e3],
  ];

  return checks.filter(([, ok]) => ok).map(([id]) => id);
}

// Mapeamento id → nome/icon pra toast
const BADGE_INFO: Record<string, { icon: string; label: string }> = {
  "calls-100": { icon: "📞", label: "Primeiras 100" }, "calls-500": { icon: "📱", label: "Frequentador" },
  "calls-1k": { icon: "🔥", label: "Mil e Uma Noites" }, "calls-5k": { icon: "⚡", label: "Viciado" },
  "calls-10k": { icon: "💎", label: "Dependente Químico" }, "calls-50k": { icon: "🌋", label: "Sem Volta" },
  "calls-100k": { icon: "☄️", label: "Fusão Nuclear" },
  "cost-100": { icon: "💵", label: "Centenário" }, "cost-500": { icon: "💸", label: "Meia Entrada" },
  "cost-1k": { icon: "💰", label: "Clube do Milhar" }, "cost-5k": { icon: "🤑", label: "All In" },
  "cost-10k": { icon: "👑", label: "Rei do Token" }, "cost-25k": { icon: "🏦", label: "Banco Central" },
  "cost-50k": { icon: "🚀", label: "To the Moon" }, "cost-100k": { icon: "🏴‍☠️", label: "Sem Limites" },
  "tokens-1m": { icon: "🔢", label: "Primeiro Milhão" }, "tokens-10m": { icon: "📊", label: "Dez Milhões" },
  "tokens-100m": { icon: "🧮", label: "Cem Milhões" }, "tokens-1b": { icon: "🌌", label: "Bilionário" },
  "tokens-10b": { icon: "🪐", label: "Plutão" }, "tokens-100b": { icon: "🌟", label: "Via Láctea" },
  "tokens-1t": { icon: "🔮", label: "Singularidade" },
  "sessions-5": { icon: "🗂️", label: "Iniciante" }, "sessions-10": { icon: "📋", label: "Multitarefa" },
  "sessions-25": { icon: "📚", label: "Produtivo" }, "sessions-50": { icon: "🏭", label: "Fábrica" },
  "sessions-100": { icon: "🌐", label: "Centenário" }, "sessions-250": { icon: "🏗️", label: "Colecionador" },
  "sessions-500": { icon: "🧲", label: "Obsessivo" }, "sessions-1k": { icon: "♾️", label: "Infinito" },
  "days-3": { icon: "🌱", label: "Semente" }, "days-7": { icon: "📅", label: "Primeira Semana" },
  "days-14": { icon: "🗓️", label: "Quinzena" }, "days-30": { icon: "📆", label: "Mês Completo" },
  "days-90": { icon: "🏅", label: "Trimestre de Fogo" }, "days-180": { icon: "⭐", label: "Meio Ano" },
  "days-365": { icon: "🎖️", label: "Veterano" },
  "cache-10": { icon: "🪙", label: "Primeiro Troco" }, "cache-25": { icon: "🐷", label: "Cofrinho" },
  "cache-50": { icon: "💰", label: "Poupança" }, "cache-100": { icon: "📈", label: "Investidor de Cache" },
  "cache-250": { icon: "🎯", label: "Rendimento" }, "cache-500": { icon: "⚙️", label: "Cache Machine" },
  "cache-1k": { icon: "🏆", label: "Cofre de Ouro" }, "cache-2500": { icon: "👔", label: "Tesoureiro" },
  "cache-5k": { icon: "🏦", label: "Banco do Cache" },
  "models-2": { icon: "🎨", label: "Bicampeão" }, "models-3": { icon: "🌈", label: "Polivalente" },
  "projects-1": { icon: "📁", label: "Inauguração" }, "projects-3": { icon: "🗄️", label: "Gerente" },
  "projects-10": { icon: "🏗️", label: "Arquiteto" },
  "epic-100": { icon: "🏃", label: "Corrida" }, "epic-500": { icon: "🏃‍♂️", label: "Maratonista" },
  "epic-1k": { icon: "🏋️", label: "Ultra Maratonista" }, "epic-5k": { icon: "🦾", label: "Imparável" },
  "whale-50": { icon: "🐟", label: "Peixe" }, "whale-100": { icon: "🐋", label: "Baleia" },
  "whale-500": { icon: "🦈", label: "Megalodon" }, "whale-1k": { icon: "🐉", label: "Dragão" },
  "whale-5k": { icon: "💀", label: "Lenda" },
};

/** Renderiza no AppLayout — verifica a cada 2min se tem conquista nova */
export function AchievementNotifier() {
  const { user } = useAuth();
  const notified = useRef(false);

  const { data } = useQuery({
    queryKey: ["analytics", "achievements"],
    queryFn: () => api.get("/analytics/achievements"),
    staleTime: 120_000,
    refetchInterval: 120_000,
    enabled: !!user,
  });

  useEffect(() => {
    if (!data || notified.current) return;

    const currentUnlocked = getUnlockedIds(data);
    const seen = getSeen();
    const newBadges = currentUnlocked.filter((id) => !seen.has(id));

    if (newBadges.length > 0) {
      // Mostra toast pra cada conquista nova (máx 5 pra não poluir)
      const toShow = newBadges.slice(0, 5);
      toShow.forEach((id, i) => {
        const info = BADGE_INFO[id];
        if (!info) return;
        setTimeout(() => {
          toast(
            `${info.icon} Conquista desbloqueada!`,
            {
              description: info.label,
              duration: Infinity,
              action: {
                label: "Ver conquistas",
                onClick: () => window.location.href = "/achievements",
              },
            }
          );
        }, i * 800); // Staggers pra não aparecer tudo junto
      });

      if (newBadges.length > 5) {
        setTimeout(() => {
          toast(`...e mais ${newBadges.length - 5} conquistas!`, {
            duration: Infinity,
            action: {
              label: "Ver todas",
              onClick: () => window.location.href = "/achievements",
            },
          });
        }, 5 * 800);
      }

      // Salva todas como vistas
      const allSeen = new Set([...seen, ...currentUnlocked]);
      saveSeen(allSeen);
    } else if (seen.size === 0 && currentUnlocked.length > 0) {
      // Primeira vez — salva sem notificar (senão mostra 30+ toasts)
      saveSeen(new Set(currentUnlocked));
    }

    notified.current = true;
  }, [data]);

  return null; // Componente invisível
}
