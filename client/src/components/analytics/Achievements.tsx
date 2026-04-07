import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: string;
  tier?: "bronze" | "silver" | "gold" | "diamond";
}

const TIER_STYLES = {
  bronze: "from-amber-900/30 to-amber-700/10 border-amber-700/40",
  silver: "from-gray-400/20 to-gray-300/10 border-gray-400/40",
  gold: "from-yellow-500/20 to-yellow-400/10 border-yellow-500/40",
  diamond: "from-cyan-400/20 to-purple-400/10 border-cyan-400/40",
};

function computeBadges(data: any): Badge[] {
  if (!data) return [];

  const entries = data.total_entries || 0;
  const cost = data.total_cost || 0;
  const tokens = Number(data.total_tokens || 0);
  const sessions = data.total_sessions || 0;
  const activeDays = data.active_days || 0;
  const modelsUsed = data.models_used || 0;
  const cacheRead = Number(data.total_cache_read || 0);
  const totalInput = Number(data.total_input || 0);
  const projectCount = data.project_count || 0;
  const maxSessionEntries = data.max_session_entries || 0;
  const maxSessionCost = data.max_session_cost || 0;
  const cacheRate = (cacheRead + totalInput) > 0 ? (cacheRead / (cacheRead + totalInput)) * 100 : 0;

  return [
    // Entries milestones
    {
      id: "calls-100", icon: "📞", label: "Primeiras 100 Calls",
      description: "Fez 100 chamadas à API", unlocked: entries >= 100,
      progress: entries >= 100 ? undefined : `${entries}/100`, tier: "bronze",
    },
    {
      id: "calls-1000", icon: "🔥", label: "1.000 Calls",
      description: "Fez 1.000 chamadas à API", unlocked: entries >= 1000,
      progress: entries >= 1000 ? undefined : `${entries}/1000`, tier: "silver",
    },
    {
      id: "calls-5000", icon: "⚡", label: "5.000 Calls",
      description: "Fez 5.000 chamadas à API", unlocked: entries >= 5000,
      progress: entries >= 5000 ? undefined : `${entries}/5000`, tier: "gold",
    },
    {
      id: "calls-10000", icon: "💎", label: "10K Calls",
      description: "Fez 10.000 chamadas à API", unlocked: entries >= 10000,
      progress: entries >= 10000 ? undefined : `${entries}/10000`, tier: "diamond",
    },
    // Cost milestones
    {
      id: "cost-100", icon: "💵", label: "Centenário",
      description: "Gastou $100 em tokens", unlocked: cost >= 100,
      progress: cost >= 100 ? undefined : `$${cost.toFixed(0)}/$100`, tier: "bronze",
    },
    {
      id: "cost-1000", icon: "💰", label: "Milionário em Tokens",
      description: "Gastou $1.000 em tokens", unlocked: cost >= 1000,
      progress: cost >= 1000 ? undefined : `$${cost.toFixed(0)}/$1000`, tier: "gold",
    },
    // Sessions
    {
      id: "sessions-10", icon: "🗂️", label: "Multitarefa",
      description: "10+ sessões criadas", unlocked: sessions >= 10,
      progress: sessions >= 10 ? undefined : `${sessions}/10`, tier: "bronze",
    },
    {
      id: "sessions-50", icon: "🏭", label: "Fábrica de Sessões",
      description: "50+ sessões criadas", unlocked: sessions >= 50,
      progress: sessions >= 50 ? undefined : `${sessions}/50`, tier: "silver",
    },
    // Active days
    {
      id: "days-7", icon: "📅", label: "Primeira Semana",
      description: "7 dias ativos", unlocked: activeDays >= 7,
      progress: activeDays >= 7 ? undefined : `${activeDays}/7`, tier: "bronze",
    },
    {
      id: "days-30", icon: "🗓️", label: "Mês Completo",
      description: "30 dias ativos", unlocked: activeDays >= 30,
      progress: activeDays >= 30 ? undefined : `${activeDays}/30`, tier: "silver",
    },
    // Cache
    {
      id: "cache-50", icon: "🎯", label: "Cache Master",
      description: "Cache hit rate acima de 50%", unlocked: cacheRate >= 50 && totalInput > 0,
      progress: totalInput > 0 ? `${cacheRate.toFixed(0)}%` : "sem dados", tier: "silver",
    },
    {
      id: "cache-80", icon: "🏆", label: "Cache God",
      description: "Cache hit rate acima de 80%", unlocked: cacheRate >= 80 && totalInput > 0,
      progress: totalInput > 0 ? `${cacheRate.toFixed(0)}%` : "sem dados", tier: "gold",
    },
    // Models
    {
      id: "models-3", icon: "🎨", label: "Polivalente",
      description: "Usou 3+ modelos diferentes", unlocked: modelsUsed >= 3,
      progress: modelsUsed >= 3 ? undefined : `${modelsUsed}/3`, tier: "bronze",
    },
    // Projects
    {
      id: "projects-3", icon: "📁", label: "Organizado",
      description: "3+ projetos criados", unlocked: projectCount >= 3,
      progress: projectCount >= 3 ? undefined : `${projectCount}/3`, tier: "bronze",
    },
    // Marathon session
    {
      id: "marathon", icon: "🏃", label: "Maratonista",
      description: "Sessão com 500+ calls", unlocked: maxSessionEntries >= 500,
      progress: maxSessionEntries >= 500 ? undefined : `${maxSessionEntries}/500`, tier: "gold",
    },
    {
      id: "whale", icon: "🐋", label: "Baleia",
      description: "Sessão custando $100+", unlocked: maxSessionCost >= 100,
      progress: maxSessionCost >= 100 ? undefined : `$${maxSessionCost.toFixed(0)}/$100`, tier: "gold",
    },
    // Tokens
    {
      id: "tokens-1m", icon: "🔢", label: "1M Tokens",
      description: "Processou 1 milhão de tokens", unlocked: tokens >= 1_000_000,
      tier: "bronze",
    },
    {
      id: "tokens-100m", icon: "🧮", label: "100M Tokens",
      description: "Processou 100 milhões de tokens", unlocked: tokens >= 100_000_000,
      tier: "silver",
    },
    {
      id: "tokens-1b", icon: "🌌", label: "1B Tokens",
      description: "Processou 1 bilhão de tokens", unlocked: tokens >= 1_000_000_000,
      tier: "diamond",
    },
  ];
}

export function Achievements() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "achievements"],
    queryFn: () => api.get("/analytics/achievements"),
    staleTime: 120_000,
  });

  if (isLoading) return null;

  const badges = computeBadges(data);
  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Conquistas
          <span className="text-xs font-normal text-muted-foreground">
            {unlocked.length}/{badges.length} desbloqueadas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desbloqueadas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {unlocked.map((b) => (
            <div
              key={b.id}
              className={`rounded-lg border p-3 bg-gradient-to-br ${TIER_STYLES[b.tier || "bronze"]} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{b.icon}</span>
                <span className="text-sm font-medium">{b.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>

        {/* Bloqueadas */}
        {locked.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-2">Próximas conquistas:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {locked.slice(0, 8).map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-border/50 p-3 opacity-50 hover:opacity-75 transition-opacity"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg grayscale">{b.icon}</span>
                    <span className="text-sm font-medium text-muted-foreground">{b.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                  {b.progress && (
                    <p className="text-xs text-muted-foreground mt-1 tabular-nums">{b.progress}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
