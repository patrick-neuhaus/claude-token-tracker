import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatUSD, formatBRL } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";

interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: number;
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
  { key: "cache", label: "Economia de Cache", icon: "💾" },
  { key: "org", label: "Diversidade", icon: "🌈" },
  { key: "epic", label: "Sessões Épicas", icon: "🏆" },
];

function p(current: number, target: number) {
  return Math.min(100, (current / target) * 100);
}

function computeBadges(data: any, brlRate: number): Badge[] {
  if (!data) return [];

  const entries = data.total_entries || 0;
  const cost = data.total_cost || 0;
  const tokens = Number(data.total_tokens || 0);
  const sessions = data.total_sessions || 0;
  const activeDays = data.active_days || 0;
  const modelsUsed = data.models_used || 0;
  const projectCount = data.project_count || 0;
  const maxSessionEntries = data.max_session_entries || 0;
  const maxSessionCost = data.max_session_cost || 0;
  const cacheSavings = data.cache_savings_usd || 0;

  return [
    // === CALLS ===
    { id: "calls-100", icon: "📞", label: "Primeiras 100", description: "Fez 100 chamadas à API", unlocked: entries >= 100, progress: p(entries, 100), progressLabel: `${entries}/100`, tier: "bronze", category: "calls" },
    { id: "calls-500", icon: "📱", label: "Frequentador", description: "500 chamadas à API", unlocked: entries >= 500, progress: p(entries, 500), progressLabel: `${entries}/500`, tier: "bronze", category: "calls" },
    { id: "calls-1k", icon: "🔥", label: "Mil e Uma Noites", description: "1.000 chamadas à API", unlocked: entries >= 1000, progress: p(entries, 1000), progressLabel: `${entries}/1K`, tier: "silver", category: "calls" },
    { id: "calls-5k", icon: "⚡", label: "Viciado", description: "5.000 chamadas à API", unlocked: entries >= 5000, progress: p(entries, 5000), progressLabel: `${entries}/5K`, tier: "gold", category: "calls" },
    { id: "calls-10k", icon: "💎", label: "Dependente Químico", description: "10.000 chamadas à API", unlocked: entries >= 10000, progress: p(entries, 10000), progressLabel: `${entries}/10K`, tier: "diamond", category: "calls" },
    { id: "calls-50k", icon: "🌋", label: "Sem Volta", description: "50.000 chamadas à API", unlocked: entries >= 50000, progress: p(entries, 50000), progressLabel: `${entries}/50K`, tier: "diamond", category: "calls" },
    { id: "calls-100k", icon: "☄️", label: "Fusão Nuclear", description: "100.000 chamadas — virou máquina", unlocked: entries >= 100000, progress: p(entries, 100000), progressLabel: `${entries}/100K`, tier: "diamond", category: "calls" },

    // === COST ===
    { id: "cost-100", icon: "💵", label: "Centenário", description: "Gastou $100 em tokens", unlocked: cost >= 100, progress: p(cost, 100), progressLabel: `${formatUSD(cost)}/$100`, tier: "bronze", category: "cost" },
    { id: "cost-500", icon: "💸", label: "Meia Entrada", description: "Gastou $500 em tokens", unlocked: cost >= 500, progress: p(cost, 500), progressLabel: `${formatUSD(cost)}/$500`, tier: "bronze", category: "cost" },
    { id: "cost-1k", icon: "💰", label: "Clube do Milhar", description: "Gastou $1.000 em tokens", unlocked: cost >= 1000, progress: p(cost, 1000), progressLabel: `${formatUSD(cost)}/$1K`, tier: "silver", category: "cost" },
    { id: "cost-5k", icon: "🤑", label: "All In", description: "Gastou $5.000 em tokens", unlocked: cost >= 5000, progress: p(cost, 5000), progressLabel: `${formatUSD(cost)}/$5K`, tier: "gold", category: "cost" },
    { id: "cost-10k", icon: "👑", label: "Rei do Token", description: "Gastou $10.000 em tokens", unlocked: cost >= 10000, progress: p(cost, 10000), progressLabel: `${formatUSD(cost)}/$10K`, tier: "gold", category: "cost" },
    { id: "cost-25k", icon: "🏦", label: "Banco Central", description: "Gastou $25.000 em tokens", unlocked: cost >= 25000, progress: p(cost, 25000), progressLabel: `${formatUSD(cost)}/$25K`, tier: "diamond", category: "cost" },
    { id: "cost-50k", icon: "🚀", label: "To the Moon", description: "Gastou $50.000 em tokens", unlocked: cost >= 50000, progress: p(cost, 50000), progressLabel: `${formatUSD(cost)}/$50K`, tier: "diamond", category: "cost" },
    { id: "cost-100k", icon: "🏴‍☠️", label: "Sem Limites", description: "Gastou $100.000 em tokens", unlocked: cost >= 100000, progress: p(cost, 100000), progressLabel: `${formatUSD(cost)}/$100K`, tier: "diamond", category: "cost" },

    // === TOKENS ===
    { id: "tokens-1m", icon: "🔢", label: "Primeiro Milhão", description: "Processou 1 milhão de tokens", unlocked: tokens >= 1e6, progress: p(tokens, 1e6), progressLabel: `${(tokens / 1e6).toFixed(1)}M/1M`, tier: "bronze", category: "tokens" },
    { id: "tokens-10m", icon: "📊", label: "Dez Milhões", description: "Processou 10 milhões de tokens", unlocked: tokens >= 1e7, progress: p(tokens, 1e7), progressLabel: `${(tokens / 1e6).toFixed(0)}M/10M`, tier: "bronze", category: "tokens" },
    { id: "tokens-100m", icon: "🧮", label: "Cem Milhões", description: "Processou 100 milhões de tokens", unlocked: tokens >= 1e8, progress: p(tokens, 1e8), progressLabel: `${(tokens / 1e6).toFixed(0)}M/100M`, tier: "silver", category: "tokens" },
    { id: "tokens-1b", icon: "🌌", label: "Bilionário", description: "Processou 1 bilhão de tokens", unlocked: tokens >= 1e9, progress: p(tokens, 1e9), progressLabel: `${(tokens / 1e9).toFixed(2)}B/1B`, tier: "gold", category: "tokens" },
    { id: "tokens-10b", icon: "🪐", label: "Plutão", description: "Processou 10 bilhões de tokens", unlocked: tokens >= 1e10, progress: p(tokens, 1e10), progressLabel: `${(tokens / 1e9).toFixed(1)}B/10B`, tier: "gold", category: "tokens" },
    { id: "tokens-100b", icon: "🌟", label: "Via Láctea", description: "Processou 100 bilhões de tokens", unlocked: tokens >= 1e11, progress: p(tokens, 1e11), progressLabel: `${(tokens / 1e9).toFixed(0)}B/100B`, tier: "diamond", category: "tokens" },
    { id: "tokens-1t", icon: "🔮", label: "Singularidade", description: "Processou 1 trilhão de tokens", unlocked: tokens >= 1e12, progress: p(tokens, 1e12), progressLabel: `${(tokens / 1e12).toFixed(3)}T/1T`, tier: "diamond", category: "tokens" },

    // === SESSIONS ===
    { id: "sessions-5", icon: "🗂️", label: "Iniciante", description: "5 sessões criadas", unlocked: sessions >= 5, progress: p(sessions, 5), progressLabel: `${sessions}/5`, tier: "bronze", category: "sessions" },
    { id: "sessions-10", icon: "📋", label: "Multitarefa", description: "10 sessões criadas", unlocked: sessions >= 10, progress: p(sessions, 10), progressLabel: `${sessions}/10`, tier: "bronze", category: "sessions" },
    { id: "sessions-25", icon: "📚", label: "Produtivo", description: "25 sessões criadas", unlocked: sessions >= 25, progress: p(sessions, 25), progressLabel: `${sessions}/25`, tier: "silver", category: "sessions" },
    { id: "sessions-50", icon: "🏭", label: "Fábrica", description: "50 sessões criadas", unlocked: sessions >= 50, progress: p(sessions, 50), progressLabel: `${sessions}/50`, tier: "silver", category: "sessions" },
    { id: "sessions-100", icon: "🌐", label: "Centenário", description: "100 sessões criadas", unlocked: sessions >= 100, progress: p(sessions, 100), progressLabel: `${sessions}/100`, tier: "gold", category: "sessions" },
    { id: "sessions-250", icon: "🏗️", label: "Colecionador", description: "250 sessões criadas", unlocked: sessions >= 250, progress: p(sessions, 250), progressLabel: `${sessions}/250`, tier: "gold", category: "sessions" },
    { id: "sessions-500", icon: "🧲", label: "Obsessivo", description: "500 sessões criadas", unlocked: sessions >= 500, progress: p(sessions, 500), progressLabel: `${sessions}/500`, tier: "diamond", category: "sessions" },
    { id: "sessions-1k", icon: "♾️", label: "Infinito", description: "1.000 sessões criadas", unlocked: sessions >= 1000, progress: p(sessions, 1000), progressLabel: `${sessions}/1K`, tier: "diamond", category: "sessions" },

    // === DAYS ===
    { id: "days-3", icon: "🌱", label: "Semente", description: "3 dias ativos", unlocked: activeDays >= 3, progress: p(activeDays, 3), progressLabel: `${activeDays}/3`, tier: "bronze", category: "days" },
    { id: "days-7", icon: "📅", label: "Primeira Semana", description: "7 dias ativos", unlocked: activeDays >= 7, progress: p(activeDays, 7), progressLabel: `${activeDays}/7`, tier: "bronze", category: "days" },
    { id: "days-14", icon: "🗓️", label: "Quinzena", description: "14 dias ativos", unlocked: activeDays >= 14, progress: p(activeDays, 14), progressLabel: `${activeDays}/14`, tier: "silver", category: "days" },
    { id: "days-30", icon: "📆", label: "Mês Completo", description: "30 dias ativos", unlocked: activeDays >= 30, progress: p(activeDays, 30), progressLabel: `${activeDays}/30`, tier: "silver", category: "days" },
    { id: "days-90", icon: "🏅", label: "Trimestre de Fogo", description: "90 dias ativos", unlocked: activeDays >= 90, progress: p(activeDays, 90), progressLabel: `${activeDays}/90`, tier: "gold", category: "days" },
    { id: "days-180", icon: "⭐", label: "Meio Ano", description: "180 dias ativos", unlocked: activeDays >= 180, progress: p(activeDays, 180), progressLabel: `${activeDays}/180`, tier: "gold", category: "days" },
    { id: "days-365", icon: "🎖️", label: "Veterano", description: "365 dias ativos", unlocked: activeDays >= 365, progress: p(activeDays, 365), progressLabel: `${activeDays}/365`, tier: "diamond", category: "days" },

    // === CACHE SAVINGS ===
    { id: "cache-10", icon: "🪙", label: "Primeiro Troco", description: `Economizou $10 com cache (${formatBRL(10, brlRate)})`, unlocked: cacheSavings >= 10, progress: p(cacheSavings, 10), progressLabel: `${formatUSD(cacheSavings)}/$10`, tier: "bronze", category: "cache" },
    { id: "cache-25", icon: "🐷", label: "Cofrinho", description: `Economizou $25 com cache (${formatBRL(25, brlRate)})`, unlocked: cacheSavings >= 25, progress: p(cacheSavings, 25), progressLabel: `${formatUSD(cacheSavings)}/$25`, tier: "bronze", category: "cache" },
    { id: "cache-50", icon: "💰", label: "Poupança", description: `Economizou $50 com cache (${formatBRL(50, brlRate)})`, unlocked: cacheSavings >= 50, progress: p(cacheSavings, 50), progressLabel: `${formatUSD(cacheSavings)}/$50`, tier: "silver", category: "cache" },
    { id: "cache-100", icon: "📈", label: "Investidor de Cache", description: `Economizou $100 com cache (${formatBRL(100, brlRate)})`, unlocked: cacheSavings >= 100, progress: p(cacheSavings, 100), progressLabel: `${formatUSD(cacheSavings)}/$100`, tier: "silver", category: "cache" },
    { id: "cache-250", icon: "🎯", label: "Rendimento", description: `Economizou $250 com cache (${formatBRL(250, brlRate)})`, unlocked: cacheSavings >= 250, progress: p(cacheSavings, 250), progressLabel: `${formatUSD(cacheSavings)}/$250`, tier: "gold", category: "cache" },
    { id: "cache-500", icon: "⚙️", label: "Cache Machine", description: `Economizou $500 com cache (${formatBRL(500, brlRate)})`, unlocked: cacheSavings >= 500, progress: p(cacheSavings, 500), progressLabel: `${formatUSD(cacheSavings)}/$500`, tier: "gold", category: "cache" },
    { id: "cache-1k", icon: "🏆", label: "Cofre de Ouro", description: `Economizou $1.000 com cache (${formatBRL(1000, brlRate)})`, unlocked: cacheSavings >= 1000, progress: p(cacheSavings, 1000), progressLabel: `${formatUSD(cacheSavings)}/$1K`, tier: "gold", category: "cache" },
    { id: "cache-2500", icon: "👔", label: "Tesoureiro", description: `Economizou $2.500 com cache (${formatBRL(2500, brlRate)})`, unlocked: cacheSavings >= 2500, progress: p(cacheSavings, 2500), progressLabel: `${formatUSD(cacheSavings)}/$2.5K`, tier: "diamond", category: "cache" },
    { id: "cache-5k", icon: "🏦", label: "Banco do Cache", description: `Economizou $5.000 com cache (${formatBRL(5000, brlRate)})`, unlocked: cacheSavings >= 5000, progress: p(cacheSavings, 5000), progressLabel: `${formatUSD(cacheSavings)}/$5K`, tier: "diamond", category: "cache" },

    // === DIVERSIDADE ===
    { id: "models-2", icon: "🎨", label: "Bicampeão", description: "Usou 2+ modelos diferentes", unlocked: modelsUsed >= 2, progress: p(modelsUsed, 2), progressLabel: `${modelsUsed}/2`, tier: "bronze", category: "org" },
    { id: "models-3", icon: "🌈", label: "Polivalente", description: "Usou 3+ modelos diferentes", unlocked: modelsUsed >= 3, progress: p(modelsUsed, 3), progressLabel: `${modelsUsed}/3`, tier: "silver", category: "org" },
    { id: "projects-1", icon: "📁", label: "Inauguração", description: "Criou seu primeiro projeto", unlocked: projectCount >= 1, progress: p(projectCount, 1), progressLabel: `${projectCount}/1`, tier: "bronze", category: "org" },
    { id: "projects-3", icon: "🗄️", label: "Gerente", description: "3+ projetos criados", unlocked: projectCount >= 3, progress: p(projectCount, 3), progressLabel: `${projectCount}/3`, tier: "silver", category: "org" },
    { id: "projects-10", icon: "🏗️", label: "Arquiteto", description: "10+ projetos criados", unlocked: projectCount >= 10, progress: p(projectCount, 10), progressLabel: `${projectCount}/10`, tier: "gold", category: "org" },

    // === SESSÕES ÉPICAS ===
    { id: "epic-100", icon: "🏃", label: "Corrida", description: "Sessão com 100+ chamadas", unlocked: maxSessionEntries >= 100, progress: p(maxSessionEntries, 100), progressLabel: `${maxSessionEntries}/100`, tier: "bronze", category: "epic" },
    { id: "epic-500", icon: "🏃‍♂️", label: "Maratonista", description: "Sessão com 500+ chamadas", unlocked: maxSessionEntries >= 500, progress: p(maxSessionEntries, 500), progressLabel: `${maxSessionEntries}/500`, tier: "silver", category: "epic" },
    { id: "epic-1k", icon: "🏋️", label: "Ultra Maratonista", description: "Sessão com 1.000+ chamadas", unlocked: maxSessionEntries >= 1000, progress: p(maxSessionEntries, 1000), progressLabel: `${maxSessionEntries}/1K`, tier: "gold", category: "epic" },
    { id: "epic-5k", icon: "🦾", label: "Imparável", description: "Sessão com 5.000+ chamadas", unlocked: maxSessionEntries >= 5000, progress: p(maxSessionEntries, 5000), progressLabel: `${maxSessionEntries}/5K`, tier: "diamond", category: "epic" },
    { id: "whale-50", icon: "🐟", label: "Peixe", description: "Sessão custando $50+", unlocked: maxSessionCost >= 50, progress: p(maxSessionCost, 50), progressLabel: `${formatUSD(maxSessionCost)}/$50`, tier: "bronze", category: "epic" },
    { id: "whale-100", icon: "🐋", label: "Baleia", description: "Sessão custando $100+", unlocked: maxSessionCost >= 100, progress: p(maxSessionCost, 100), progressLabel: `${formatUSD(maxSessionCost)}/$100`, tier: "silver", category: "epic" },
    { id: "whale-500", icon: "🦈", label: "Megalodon", description: "Sessão custando $500+", unlocked: maxSessionCost >= 500, progress: p(maxSessionCost, 500), progressLabel: `${formatUSD(maxSessionCost)}/$500`, tier: "gold", category: "epic" },
    { id: "whale-1k", icon: "🐉", label: "Dragão", description: "Sessão custando $1.000+", unlocked: maxSessionCost >= 1000, progress: p(maxSessionCost, 1000), progressLabel: `${formatUSD(maxSessionCost)}/$1K`, tier: "diamond", category: "epic" },
    { id: "whale-5k", icon: "💀", label: "Lenda", description: "Sessão custando $5.000+", unlocked: maxSessionCost >= 5000, progress: p(maxSessionCost, 5000), progressLabel: `${formatUSD(maxSessionCost)}/$5K`, tier: "diamond", category: "epic" },
  ];
}

export function AchievementsPage() {
  const { user } = useAuth();
  const brlRate = Number(user?.brl_rate) || 5.5;
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "achievements"],
    queryFn: () => api.get("/analytics/achievements"),
    staleTime: 120_000,
  });

  const badges = computeBadges(data, brlRate);
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conquistas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalUnlocked} de {badges.length} desbloqueadas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["bronze", "silver", "gold", "diamond"] as const).map((tier) => {
            const count = badges.filter((b) => b.tier === tier && b.unlocked).length;
            const total = badges.filter((b) => b.tier === tier).length;
            return (
              <div key={tier} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-gradient-to-br ${TIER_STYLES[tier]}`}>
                <span className="font-medium tabular-nums">{count}/{total}</span>
                <span className="text-xs text-muted-foreground">{TIER_LABEL[tier]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <Progress value={(totalUnlocked / badges.length) * 100} className="h-2" />
        <p className="text-xs text-muted-foreground text-right tabular-nums">{((totalUnlocked / badges.length) * 100).toFixed(0)}% completo</p>
      </div>

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
                <span className="text-xs font-normal text-muted-foreground ml-auto tabular-nums">
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
