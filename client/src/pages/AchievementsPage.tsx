import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: number; // 0-100
  progressLabel?: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  category: string;
}

const TIER_STYLES = {
  bronze: "from-amber-900/30 to-amber-700/10 border-amber-700/40",
  silver: "from-gray-400/20 to-gray-300/10 border-gray-400/40",
  gold: "from-yellow-500/20 to-yellow-400/10 border-yellow-500/40",
  diamond: "from-cyan-400/20 to-purple-400/10 border-cyan-400/40",
};

const TIER_LABEL = { bronze: "Bronze", silver: "Prata", gold: "Ouro", diamond: "Diamante" };

const CATEGORIES = [
  { key: "calls", label: "Chamadas à API", icon: "📞" },
  { key: "cost", label: "Investimento", icon: "💰" },
  { key: "tokens", label: "Tokens Processados", icon: "🔢" },
  { key: "sessions", label: "Sessões", icon: "🗂️" },
  { key: "days", label: "Dias Ativos", icon: "📅" },
  { key: "cache", label: "Cache", icon: "🎯" },
  { key: "org", label: "Organização", icon: "📁" },
  { key: "epic", label: "Sessões Épicas", icon: "🏆" },
];

function pct(current: number, target: number) {
  return Math.min(100, (current / target) * 100);
}

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
    // === CALLS ===
    { id: "calls-100", icon: "📞", label: "Primeiras 100", description: "100 chamadas à API", unlocked: entries >= 100, progress: pct(entries, 100), progressLabel: `${entries}/100`, tier: "bronze", category: "calls" },
    { id: "calls-500", icon: "📱", label: "500 Calls", description: "500 chamadas à API", unlocked: entries >= 500, progress: pct(entries, 500), progressLabel: `${entries}/500`, tier: "bronze", category: "calls" },
    { id: "calls-1k", icon: "🔥", label: "1.000 Calls", description: "1.000 chamadas à API", unlocked: entries >= 1000, progress: pct(entries, 1000), progressLabel: `${entries}/1000`, tier: "silver", category: "calls" },
    { id: "calls-5k", icon: "⚡", label: "5.000 Calls", description: "5.000 chamadas à API", unlocked: entries >= 5000, progress: pct(entries, 5000), progressLabel: `${entries}/5000`, tier: "gold", category: "calls" },
    { id: "calls-10k", icon: "💎", label: "10K Calls", description: "10.000 chamadas à API", unlocked: entries >= 10000, progress: pct(entries, 10000), progressLabel: `${entries}/10000`, tier: "diamond", category: "calls" },
    { id: "calls-50k", icon: "🌋", label: "50K Calls", description: "50.000 chamadas à API", unlocked: entries >= 50000, progress: pct(entries, 50000), progressLabel: `${entries}/50000`, tier: "diamond", category: "calls" },
    { id: "calls-100k", icon: "☄️", label: "100K Calls", description: "100.000 chamadas — máquina", unlocked: entries >= 100000, progress: pct(entries, 100000), progressLabel: `${entries}/100000`, tier: "diamond", category: "calls" },

    // === COST ===
    { id: "cost-100", icon: "💵", label: "Centenário", description: "Gastou $100", unlocked: cost >= 100, progress: pct(cost, 100), progressLabel: `$${cost.toFixed(0)}/$100`, tier: "bronze", category: "cost" },
    { id: "cost-500", icon: "💸", label: "Meio Milhar", description: "Gastou $500", unlocked: cost >= 500, progress: pct(cost, 500), progressLabel: `$${cost.toFixed(0)}/$500`, tier: "bronze", category: "cost" },
    { id: "cost-1k", icon: "💰", label: "Mil Dólares", description: "Gastou $1.000", unlocked: cost >= 1000, progress: pct(cost, 1000), progressLabel: `$${cost.toFixed(0)}/$1000`, tier: "silver", category: "cost" },
    { id: "cost-5k", icon: "🤑", label: "Investidor Pesado", description: "Gastou $5.000", unlocked: cost >= 5000, progress: pct(cost, 5000), progressLabel: `$${cost.toFixed(0)}/$5000`, tier: "gold", category: "cost" },
    { id: "cost-10k", icon: "👑", label: "Rei do Token", description: "Gastou $10.000", unlocked: cost >= 10000, progress: pct(cost, 10000), progressLabel: `$${cost.toFixed(0)}/$10000`, tier: "gold", category: "cost" },
    { id: "cost-25k", icon: "🏦", label: "Banco Central", description: "Gastou $25.000", unlocked: cost >= 25000, progress: pct(cost, 25000), progressLabel: `$${cost.toFixed(0)}/$25000`, tier: "diamond", category: "cost" },
    { id: "cost-50k", icon: "🚀", label: "To the Moon", description: "Gastou $50.000", unlocked: cost >= 50000, progress: pct(cost, 50000), progressLabel: `$${cost.toFixed(0)}/$50000`, tier: "diamond", category: "cost" },
    { id: "cost-100k", icon: "🏴‍☠️", label: "Sem Limites", description: "Gastou $100.000", unlocked: cost >= 100000, progress: pct(cost, 100000), progressLabel: `$${cost.toFixed(0)}/$100000`, tier: "diamond", category: "cost" },

    // === TOKENS ===
    { id: "tokens-1m", icon: "🔢", label: "1M Tokens", description: "1 milhão de tokens", unlocked: tokens >= 1e6, progress: pct(tokens, 1e6), progressLabel: `${(tokens / 1e6).toFixed(1)}M/1M`, tier: "bronze", category: "tokens" },
    { id: "tokens-10m", icon: "📊", label: "10M Tokens", description: "10 milhões de tokens", unlocked: tokens >= 1e7, progress: pct(tokens, 1e7), progressLabel: `${(tokens / 1e6).toFixed(0)}M/10M`, tier: "bronze", category: "tokens" },
    { id: "tokens-100m", icon: "🧮", label: "100M Tokens", description: "100 milhões de tokens", unlocked: tokens >= 1e8, progress: pct(tokens, 1e8), progressLabel: `${(tokens / 1e6).toFixed(0)}M/100M`, tier: "silver", category: "tokens" },
    { id: "tokens-1b", icon: "🌌", label: "1B Tokens", description: "1 bilhão de tokens", unlocked: tokens >= 1e9, progress: pct(tokens, 1e9), progressLabel: `${(tokens / 1e9).toFixed(2)}B/1B`, tier: "gold", category: "tokens" },
    { id: "tokens-10b", icon: "🪐", label: "10B Tokens", description: "10 bilhões de tokens", unlocked: tokens >= 1e10, progress: pct(tokens, 1e10), progressLabel: `${(tokens / 1e9).toFixed(1)}B/10B`, tier: "gold", category: "tokens" },
    { id: "tokens-100b", icon: "🌟", label: "100B Tokens", description: "100 bilhões de tokens", unlocked: tokens >= 1e11, progress: pct(tokens, 1e11), progressLabel: `${(tokens / 1e9).toFixed(0)}B/100B`, tier: "diamond", category: "tokens" },
    { id: "tokens-1t", icon: "🔮", label: "1 Trilhão", description: "1 trilhão de tokens — lenda viva", unlocked: tokens >= 1e12, progress: pct(tokens, 1e12), progressLabel: `${(tokens / 1e12).toFixed(3)}T/1T`, tier: "diamond", category: "tokens" },

    // === SESSIONS ===
    { id: "sessions-5", icon: "🗂️", label: "5 Sessões", description: "5 sessões criadas", unlocked: sessions >= 5, progress: pct(sessions, 5), progressLabel: `${sessions}/5`, tier: "bronze", category: "sessions" },
    { id: "sessions-10", icon: "📋", label: "Multitarefa", description: "10 sessões criadas", unlocked: sessions >= 10, progress: pct(sessions, 10), progressLabel: `${sessions}/10`, tier: "bronze", category: "sessions" },
    { id: "sessions-25", icon: "📚", label: "25 Sessões", description: "25 sessões criadas", unlocked: sessions >= 25, progress: pct(sessions, 25), progressLabel: `${sessions}/25`, tier: "silver", category: "sessions" },
    { id: "sessions-50", icon: "🏭", label: "Fábrica", description: "50 sessões criadas", unlocked: sessions >= 50, progress: pct(sessions, 50), progressLabel: `${sessions}/50`, tier: "gold", category: "sessions" },
    { id: "sessions-100", icon: "🌐", label: "Centenário de Sessões", description: "100 sessões", unlocked: sessions >= 100, progress: pct(sessions, 100), progressLabel: `${sessions}/100`, tier: "diamond", category: "sessions" },

    // === DAYS ===
    { id: "days-3", icon: "🌱", label: "Terceiro Dia", description: "3 dias ativos", unlocked: activeDays >= 3, progress: pct(activeDays, 3), progressLabel: `${activeDays}/3`, tier: "bronze", category: "days" },
    { id: "days-7", icon: "📅", label: "Primeira Semana", description: "7 dias ativos", unlocked: activeDays >= 7, progress: pct(activeDays, 7), progressLabel: `${activeDays}/7`, tier: "bronze", category: "days" },
    { id: "days-14", icon: "🗓️", label: "Duas Semanas", description: "14 dias ativos", unlocked: activeDays >= 14, progress: pct(activeDays, 14), progressLabel: `${activeDays}/14`, tier: "silver", category: "days" },
    { id: "days-30", icon: "📆", label: "Mês Completo", description: "30 dias ativos", unlocked: activeDays >= 30, progress: pct(activeDays, 30), progressLabel: `${activeDays}/30`, tier: "silver", category: "days" },
    { id: "days-90", icon: "🏅", label: "Trimestre de Fogo", description: "90 dias ativos", unlocked: activeDays >= 90, progress: pct(activeDays, 90), progressLabel: `${activeDays}/90`, tier: "gold", category: "days" },
    { id: "days-180", icon: "⭐", label: "Meio Ano", description: "180 dias ativos", unlocked: activeDays >= 180, progress: pct(activeDays, 180), progressLabel: `${activeDays}/180`, tier: "gold", category: "days" },
    { id: "days-365", icon: "🎖️", label: "Veterano", description: "365 dias ativos", unlocked: activeDays >= 365, progress: pct(activeDays, 365), progressLabel: `${activeDays}/365`, tier: "diamond", category: "days" },

    // === CACHE ===
    { id: "cache-30", icon: "💾", label: "Cache Iniciante", description: "Cache hit rate 30%+", unlocked: cacheRate >= 30 && totalInput > 0, progress: pct(cacheRate, 30), progressLabel: `${cacheRate.toFixed(0)}%/30%`, tier: "bronze", category: "cache" },
    { id: "cache-50", icon: "🎯", label: "Cache Master", description: "Cache hit rate 50%+", unlocked: cacheRate >= 50 && totalInput > 0, progress: pct(cacheRate, 50), progressLabel: `${cacheRate.toFixed(0)}%/50%`, tier: "silver", category: "cache" },
    { id: "cache-80", icon: "🏆", label: "Cache God", description: "Cache hit rate 80%+", unlocked: cacheRate >= 80 && totalInput > 0, progress: pct(cacheRate, 80), progressLabel: `${cacheRate.toFixed(0)}%/80%`, tier: "gold", category: "cache" },
    { id: "cache-95", icon: "🔱", label: "Cache Perfeito", description: "Cache hit rate 95%+", unlocked: cacheRate >= 95 && totalInput > 0, progress: pct(cacheRate, 95), progressLabel: `${cacheRate.toFixed(0)}%/95%`, tier: "diamond", category: "cache" },

    // === ORG ===
    { id: "models-2", icon: "🎨", label: "Dois Modelos", description: "Usou 2+ modelos diferentes", unlocked: modelsUsed >= 2, progress: pct(modelsUsed, 2), progressLabel: `${modelsUsed}/2`, tier: "bronze", category: "org" },
    { id: "models-3", icon: "🌈", label: "Polivalente", description: "Usou 3+ modelos diferentes", unlocked: modelsUsed >= 3, progress: pct(modelsUsed, 3), progressLabel: `${modelsUsed}/3`, tier: "silver", category: "org" },
    { id: "projects-1", icon: "📁", label: "Primeiro Projeto", description: "Criou 1 projeto", unlocked: projectCount >= 1, progress: pct(projectCount, 1), progressLabel: `${projectCount}/1`, tier: "bronze", category: "org" },
    { id: "projects-3", icon: "🗄️", label: "Organizado", description: "3+ projetos criados", unlocked: projectCount >= 3, progress: pct(projectCount, 3), progressLabel: `${projectCount}/3`, tier: "silver", category: "org" },
    { id: "projects-10", icon: "🏗️", label: "Arquiteto", description: "10+ projetos criados", unlocked: projectCount >= 10, progress: pct(projectCount, 10), progressLabel: `${projectCount}/10`, tier: "gold", category: "org" },

    // === EPIC ===
    { id: "marathon-100", icon: "🏃", label: "Corrida", description: "Sessão com 100+ calls", unlocked: maxSessionEntries >= 100, progress: pct(maxSessionEntries, 100), progressLabel: `${maxSessionEntries}/100`, tier: "bronze", category: "epic" },
    { id: "marathon-500", icon: "🏃‍♂️", label: "Maratonista", description: "Sessão com 500+ calls", unlocked: maxSessionEntries >= 500, progress: pct(maxSessionEntries, 500), progressLabel: `${maxSessionEntries}/500`, tier: "silver", category: "epic" },
    { id: "marathon-1k", icon: "🏋️", label: "Ultra Maratonista", description: "Sessão com 1.000+ calls", unlocked: maxSessionEntries >= 1000, progress: pct(maxSessionEntries, 1000), progressLabel: `${maxSessionEntries}/1000`, tier: "gold", category: "epic" },
    { id: "marathon-5k", icon: "🦾", label: "Imparável", description: "Sessão com 5.000+ calls", unlocked: maxSessionEntries >= 5000, progress: pct(maxSessionEntries, 5000), progressLabel: `${maxSessionEntries}/5000`, tier: "diamond", category: "epic" },
    { id: "whale-50", icon: "🐟", label: "Peixe", description: "Sessão custando $50+", unlocked: maxSessionCost >= 50, progress: pct(maxSessionCost, 50), progressLabel: `$${maxSessionCost.toFixed(0)}/$50`, tier: "bronze", category: "epic" },
    { id: "whale-100", icon: "🐋", label: "Baleia", description: "Sessão custando $100+", unlocked: maxSessionCost >= 100, progress: pct(maxSessionCost, 100), progressLabel: `$${maxSessionCost.toFixed(0)}/$100`, tier: "silver", category: "epic" },
    { id: "whale-500", icon: "🦈", label: "Megalodon", description: "Sessão custando $500+", unlocked: maxSessionCost >= 500, progress: pct(maxSessionCost, 500), progressLabel: `$${maxSessionCost.toFixed(0)}/$500`, tier: "gold", category: "epic" },
    { id: "whale-1k", icon: "🐉", label: "Dragão", description: "Sessão custando $1.000+", unlocked: maxSessionCost >= 1000, progress: pct(maxSessionCost, 1000), progressLabel: `$${maxSessionCost.toFixed(0)}/$1000`, tier: "diamond", category: "epic" },
    { id: "whale-5k", icon: "💀", label: "Lenda", description: "Sessão custando $5.000+", unlocked: maxSessionCost >= 5000, progress: pct(maxSessionCost, 5000), progressLabel: `$${maxSessionCost.toFixed(0)}/$5000`, tier: "diamond", category: "epic" },
  ];
}

export function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "achievements"],
    queryFn: () => api.get("/analytics/achievements"),
    staleTime: 120_000,
  });

  const badges = computeBadges(data);
  const totalUnlocked = badges.filter((b) => b.unlocked).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Conquistas</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conquistas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalUnlocked} de {badges.length} desbloqueadas
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {(["bronze", "silver", "gold", "diamond"] as const).map((tier) => {
            const count = badges.filter((b) => b.tier === tier && b.unlocked).length;
            const total = badges.filter((b) => b.tier === tier).length;
            return (
              <div key={tier} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-gradient-to-br ${TIER_STYLES[tier]}`}>
                <span className="font-medium">{count}/{total}</span>
                <span className="text-xs text-muted-foreground">{TIER_LABEL[tier]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barra de progresso geral */}
      <div className="space-y-1">
        <Progress value={(totalUnlocked / badges.length) * 100} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{((totalUnlocked / badges.length) * 100).toFixed(0)}% completo</p>
      </div>

      {/* Categorias */}
      {CATEGORIES.map((cat) => {
        const catBadges = badges.filter((b) => b.category === cat.key);
        if (!catBadges.length) return null;
        const catUnlocked = catBadges.filter((b) => b.unlocked).length;

        return (
          <Card key={cat.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{cat.icon}</span>
                {cat.label}
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  {catUnlocked}/{catBadges.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {catBadges.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border p-3 transition-all ${
                      b.unlocked
                        ? `bg-gradient-to-br ${TIER_STYLES[b.tier]} hover:scale-[1.02]`
                        : "opacity-40 hover:opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xl ${b.unlocked ? "" : "grayscale"}`}>{b.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">{b.label}</span>
                        <span className="text-[11px] text-muted-foreground">{b.description}</span>
                      </div>
                    </div>
                    {!b.unlocked && b.progress !== undefined && (
                      <div className="mt-2 space-y-1">
                        <Progress value={b.progress} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground tabular-nums text-right">{b.progressLabel}</p>
                      </div>
                    )}
                    {b.unlocked && (
                      <div className="mt-1">
                        <span className="text-[10px] text-muted-foreground">✓ Desbloqueada</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
