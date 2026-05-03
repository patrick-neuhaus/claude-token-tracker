import { formatUSD } from "@/lib/formatters";

export type BadgeTier = "bronze" | "silver" | "gold" | "diamond";

export interface Badge {
  id: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  progressLabel?: string;
  tier: BadgeTier;
  category: string;
}

/**
 * TIER_STYLES — bronze/silver/gold/diamond gradient classes.
 *
 * INTENTIONAL warm exception (DS Δ15): the tier scale uses warm metal tones
 * (amber/silver/yellow/cyan-purple) deliberately. Do NOT normalize via DS
 * tokens — these are the reward palette and should remain visually distinct.
 */
export const TIER_STYLES: Record<BadgeTier, string> = {
  bronze: "from-amber-900/30 to-amber-700/10 border-amber-700/40",
  silver: "from-gray-400/20 to-gray-300/10 border-gray-400/40",
  gold: "from-yellow-500/20 to-yellow-400/10 border-yellow-500/40",
  diamond: "from-cyan-400/20 to-purple-400/10 border-cyan-400/40",
};

export const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  diamond: "Diamante",
};

export const BADGE_CATEGORIES = [
  { key: "calls", label: "Chamadas à API", icon: "📞" },
  { key: "cost", label: "Investimento", icon: "💰" },
  { key: "tokens", label: "Tokens Processados", icon: "🔢" },
  { key: "sessions", label: "Sessões", icon: "🗂️" },
  { key: "days", label: "Dias Ativos", icon: "📅" },
  { key: "cache", label: "Economia em US$", icon: "💾" },
  { key: "org", label: "Diversidade", icon: "🌈" },
  { key: "epic", label: "Sessões Épicas", icon: "🏆" },
] as const;

function p(current: number, target: number) {
  return Math.min(100, (current / target) * 100);
}

interface AchievementsRaw {
  total_entries?: number;
  total_cost?: number;
  total_tokens?: number | string;
  total_sessions?: number;
  active_days?: number;
  models_used?: number;
  project_count?: number;
  max_session_entries?: number;
  max_session_cost?: number;
  cache_savings_usd?: number;
}

/**
 * computeBadges — derives 80 achievement badges from raw API stats.
 *
 * NOTE (Wave B3.4): kept client-side temporarily. Wave B4 V001 will move this
 * to the server (achievement catalog), and the page will just render the
 * server-computed list. For now, only data + UI components were extracted —
 * this function still runs in the client.
 */
export function computeBadges(data: AchievementsRaw | undefined | null): Badge[] {
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

  // Helper pra label de tokens
  const tl = (v: number) => {
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    return `${v}`;
  };

  return [
    // === CALLS (7 → 11) ===
    { id: "calls-100", icon: "📞", label: "Primeiras 100", description: "100 chamadas à API", unlocked: entries >= 100, progress: p(entries, 100), progressLabel: `${entries}/100`, tier: "bronze", category: "calls" },
    { id: "calls-500", icon: "📱", label: "Frequentador", description: "500 chamadas à API", unlocked: entries >= 500, progress: p(entries, 500), progressLabel: `${entries}/500`, tier: "bronze", category: "calls" },
    { id: "calls-1k", icon: "🔥", label: "Mil e Uma Noites", description: "1.000 chamadas à API", unlocked: entries >= 1e3, progress: p(entries, 1e3), progressLabel: `${entries}/1K`, tier: "silver", category: "calls" },
    { id: "calls-5k", icon: "⚡", label: "Viciado", description: "5.000 chamadas à API", unlocked: entries >= 5e3, progress: p(entries, 5e3), progressLabel: `${entries}/5K`, tier: "silver", category: "calls" },
    { id: "calls-10k", icon: "💎", label: "Dependente Químico", description: "10.000 chamadas à API", unlocked: entries >= 1e4, progress: p(entries, 1e4), progressLabel: `${entries}/10K`, tier: "gold", category: "calls" },
    { id: "calls-50k", icon: "🌋", label: "Sem Volta", description: "50.000 chamadas à API", unlocked: entries >= 5e4, progress: p(entries, 5e4), progressLabel: `${entries}/50K`, tier: "gold", category: "calls" },
    { id: "calls-100k", icon: "☄️", label: "Fusão Nuclear", description: "100.000 chamadas", unlocked: entries >= 1e5, progress: p(entries, 1e5), progressLabel: `${entries}/100K`, tier: "diamond", category: "calls" },
    { id: "calls-500k", icon: "🕳️", label: "Buraco Negro", description: "500.000 chamadas", unlocked: entries >= 5e5, progress: p(entries, 5e5), progressLabel: `${entries}/500K`, tier: "diamond", category: "calls" },
    { id: "calls-1m", icon: "🧬", label: "Transcendência", description: "1 milhão de chamadas", unlocked: entries >= 1e6, progress: p(entries, 1e6), progressLabel: `${entries}/1M`, tier: "diamond", category: "calls" },
    { id: "calls-5m", icon: "⏳", label: "Eterno", description: "5 milhões de chamadas", unlocked: entries >= 5e6, progress: p(entries, 5e6), progressLabel: `${entries}/5M`, tier: "diamond", category: "calls" },
    { id: "calls-10m", icon: "🌀", label: "Além do Infinito", description: "10 milhões de chamadas", unlocked: entries >= 1e7, progress: p(entries, 1e7), progressLabel: `${entries}/10M`, tier: "diamond", category: "calls" },

    // === COST (8 → 13) ===
    { id: "cost-100", icon: "💵", label: "Centenário", description: "Gastou $100", unlocked: cost >= 100, progress: p(cost, 100), progressLabel: `${formatUSD(cost)}/$100`, tier: "bronze", category: "cost" },
    { id: "cost-500", icon: "💸", label: "Meia Entrada", description: "Gastou $500", unlocked: cost >= 500, progress: p(cost, 500), progressLabel: `${formatUSD(cost)}/$500`, tier: "bronze", category: "cost" },
    { id: "cost-1k", icon: "💰", label: "Clube do Milhar", description: "Gastou $1.000", unlocked: cost >= 1e3, progress: p(cost, 1e3), progressLabel: `${formatUSD(cost)}/$1K`, tier: "silver", category: "cost" },
    { id: "cost-5k", icon: "🤑", label: "All In", description: "Gastou $5.000", unlocked: cost >= 5e3, progress: p(cost, 5e3), progressLabel: `${formatUSD(cost)}/$5K`, tier: "silver", category: "cost" },
    { id: "cost-10k", icon: "👑", label: "Rei do Token", description: "Gastou $10.000", unlocked: cost >= 1e4, progress: p(cost, 1e4), progressLabel: `${formatUSD(cost)}/$10K`, tier: "gold", category: "cost" },
    { id: "cost-25k", icon: "🏦", label: "Banco Central", description: "Gastou $25.000", unlocked: cost >= 25e3, progress: p(cost, 25e3), progressLabel: `${formatUSD(cost)}/$25K`, tier: "gold", category: "cost" },
    { id: "cost-50k", icon: "🚀", label: "To the Moon", description: "Gastou $50.000", unlocked: cost >= 5e4, progress: p(cost, 5e4), progressLabel: `${formatUSD(cost)}/$50K`, tier: "gold", category: "cost" },
    { id: "cost-100k", icon: "🏴‍☠️", label: "Sem Limites", description: "Gastou $100.000", unlocked: cost >= 1e5, progress: p(cost, 1e5), progressLabel: `${formatUSD(cost)}/$100K`, tier: "diamond", category: "cost" },
    { id: "cost-250k", icon: "🪙", label: "Midas", description: "Gastou $250.000", unlocked: cost >= 25e4, progress: p(cost, 25e4), progressLabel: `${formatUSD(cost)}/$250K`, tier: "diamond", category: "cost" },
    { id: "cost-500k", icon: "💎", label: "Diamante Bruto", description: "Gastou $500.000", unlocked: cost >= 5e5, progress: p(cost, 5e5), progressLabel: `${formatUSD(cost)}/$500K`, tier: "diamond", category: "cost" },
    { id: "cost-1m", icon: "🏰", label: "Castelo de Tokens", description: "Gastou $1 milhão", unlocked: cost >= 1e6, progress: p(cost, 1e6), progressLabel: `${formatUSD(cost)}/$1M`, tier: "diamond", category: "cost" },
    { id: "cost-5m", icon: "🌍", label: "Patrimônio Global", description: "Gastou $5 milhões", unlocked: cost >= 5e6, progress: p(cost, 5e6), progressLabel: `${formatUSD(cost)}/$5M`, tier: "diamond", category: "cost" },
    { id: "cost-10m", icon: "🕳️", label: "Horizonte de Eventos", description: "Gastou $10 milhões", unlocked: cost >= 1e7, progress: p(cost, 1e7), progressLabel: `${formatUSD(cost)}/$10M`, tier: "diamond", category: "cost" },

    // === TOKENS (7 → 12) ===
    { id: "tokens-1m", icon: "🔢", label: "Primeiro Milhão", description: "1M tokens", unlocked: tokens >= 1e6, progress: p(tokens, 1e6), progressLabel: `${tl(tokens)}/1M`, tier: "bronze", category: "tokens" },
    { id: "tokens-10m", icon: "📊", label: "Dez Milhões", description: "10M tokens", unlocked: tokens >= 1e7, progress: p(tokens, 1e7), progressLabel: `${tl(tokens)}/10M`, tier: "bronze", category: "tokens" },
    { id: "tokens-100m", icon: "🧮", label: "Cem Milhões", description: "100M tokens", unlocked: tokens >= 1e8, progress: p(tokens, 1e8), progressLabel: `${tl(tokens)}/100M`, tier: "silver", category: "tokens" },
    { id: "tokens-1b", icon: "🌌", label: "Bilionário", description: "1B tokens", unlocked: tokens >= 1e9, progress: p(tokens, 1e9), progressLabel: `${tl(tokens)}/1B`, tier: "silver", category: "tokens" },
    { id: "tokens-10b", icon: "🪐", label: "Plutão", description: "10B tokens", unlocked: tokens >= 1e10, progress: p(tokens, 1e10), progressLabel: `${tl(tokens)}/10B`, tier: "gold", category: "tokens" },
    { id: "tokens-100b", icon: "🌟", label: "Via Láctea", description: "100B tokens", unlocked: tokens >= 1e11, progress: p(tokens, 1e11), progressLabel: `${tl(tokens)}/100B`, tier: "gold", category: "tokens" },
    { id: "tokens-1t", icon: "🔮", label: "Singularidade", description: "1 trilhão de tokens", unlocked: tokens >= 1e12, progress: p(tokens, 1e12), progressLabel: `${tl(tokens)}/1T`, tier: "diamond", category: "tokens" },
    { id: "tokens-10t", icon: "⚛️", label: "Fissão", description: "10 trilhões de tokens", unlocked: tokens >= 1e13, progress: p(tokens, 1e13), progressLabel: `${tl(tokens)}/10T`, tier: "diamond", category: "tokens" },
    { id: "tokens-100t", icon: "🧪", label: "Antimatéria", description: "100 trilhões de tokens", unlocked: tokens >= 1e14, progress: p(tokens, 1e14), progressLabel: `${tl(tokens)}/100T`, tier: "diamond", category: "tokens" },
    { id: "tokens-1q", icon: "🌀", label: "Quasar", description: "1 quatrilhão de tokens", unlocked: tokens >= 1e15, progress: p(tokens, 1e15), progressLabel: `${tl(tokens)}/1Q`, tier: "diamond", category: "tokens" },
    { id: "tokens-10q", icon: "💫", label: "Big Bang", description: "10 quatrilhões de tokens", unlocked: tokens >= 1e16, progress: p(tokens, 1e16), progressLabel: `${tl(tokens)}/10Q`, tier: "diamond", category: "tokens" },
    { id: "tokens-100q", icon: "🕳️", label: "Multiverso", description: "100 quatrilhões de tokens", unlocked: tokens >= 1e17, progress: p(tokens, 1e17), progressLabel: `${tl(tokens)}/100Q`, tier: "diamond", category: "tokens" },

    // === SESSIONS (8 → 11) ===
    { id: "sessions-5", icon: "🗂️", label: "Iniciante", description: "5 sessões", unlocked: sessions >= 5, progress: p(sessions, 5), progressLabel: `${sessions}/5`, tier: "bronze", category: "sessions" },
    { id: "sessions-10", icon: "📋", label: "Multitarefa", description: "10 sessões", unlocked: sessions >= 10, progress: p(sessions, 10), progressLabel: `${sessions}/10`, tier: "bronze", category: "sessions" },
    { id: "sessions-25", icon: "📚", label: "Produtivo", description: "25 sessões", unlocked: sessions >= 25, progress: p(sessions, 25), progressLabel: `${sessions}/25`, tier: "silver", category: "sessions" },
    { id: "sessions-50", icon: "🏭", label: "Fábrica", description: "50 sessões", unlocked: sessions >= 50, progress: p(sessions, 50), progressLabel: `${sessions}/50`, tier: "silver", category: "sessions" },
    { id: "sessions-100", icon: "🌐", label: "Centenário", description: "100 sessões", unlocked: sessions >= 100, progress: p(sessions, 100), progressLabel: `${sessions}/100`, tier: "gold", category: "sessions" },
    { id: "sessions-250", icon: "🏗️", label: "Colecionador", description: "250 sessões", unlocked: sessions >= 250, progress: p(sessions, 250), progressLabel: `${sessions}/250`, tier: "gold", category: "sessions" },
    { id: "sessions-500", icon: "🧲", label: "Obsessivo", description: "500 sessões", unlocked: sessions >= 500, progress: p(sessions, 500), progressLabel: `${sessions}/500`, tier: "gold", category: "sessions" },
    { id: "sessions-1k", icon: "♾️", label: "Infinito", description: "1.000 sessões", unlocked: sessions >= 1e3, progress: p(sessions, 1e3), progressLabel: `${sessions}/1K`, tier: "diamond", category: "sessions" },
    { id: "sessions-5k", icon: "🌊", label: "Tsunami", description: "5.000 sessões", unlocked: sessions >= 5e3, progress: p(sessions, 5e3), progressLabel: `${sessions}/5K`, tier: "diamond", category: "sessions" },
    { id: "sessions-10k", icon: "🏔️", label: "Everest", description: "10.000 sessões", unlocked: sessions >= 1e4, progress: p(sessions, 1e4), progressLabel: `${sessions}/10K`, tier: "diamond", category: "sessions" },
    { id: "sessions-50k", icon: "🌌", label: "Galáxia", description: "50.000 sessões", unlocked: sessions >= 5e4, progress: p(sessions, 5e4), progressLabel: `${sessions}/50K`, tier: "diamond", category: "sessions" },

    // === DAYS (7 → 11) ===
    { id: "days-3", icon: "🌱", label: "Semente", description: "3 dias ativos", unlocked: activeDays >= 3, progress: p(activeDays, 3), progressLabel: `${activeDays}/3`, tier: "bronze", category: "days" },
    { id: "days-7", icon: "📅", label: "Primeira Semana", description: "7 dias ativos", unlocked: activeDays >= 7, progress: p(activeDays, 7), progressLabel: `${activeDays}/7`, tier: "bronze", category: "days" },
    { id: "days-14", icon: "🗓️", label: "Quinzena", description: "14 dias ativos", unlocked: activeDays >= 14, progress: p(activeDays, 14), progressLabel: `${activeDays}/14`, tier: "silver", category: "days" },
    { id: "days-30", icon: "📆", label: "Mês Completo", description: "30 dias ativos", unlocked: activeDays >= 30, progress: p(activeDays, 30), progressLabel: `${activeDays}/30`, tier: "silver", category: "days" },
    { id: "days-90", icon: "🏅", label: "Trimestre de Fogo", description: "90 dias ativos", unlocked: activeDays >= 90, progress: p(activeDays, 90), progressLabel: `${activeDays}/90`, tier: "gold", category: "days" },
    { id: "days-180", icon: "⭐", label: "Meio Ano", description: "180 dias ativos", unlocked: activeDays >= 180, progress: p(activeDays, 180), progressLabel: `${activeDays}/180`, tier: "gold", category: "days" },
    { id: "days-365", icon: "🎖️", label: "Veterano", description: "1 ano ativo", unlocked: activeDays >= 365, progress: p(activeDays, 365), progressLabel: `${activeDays}/365`, tier: "diamond", category: "days" },
    { id: "days-730", icon: "🏛️", label: "Monumento", description: "2 anos ativos", unlocked: activeDays >= 730, progress: p(activeDays, 730), progressLabel: `${activeDays}/730`, tier: "diamond", category: "days" },
    { id: "days-1825", icon: "🗿", label: "Pedra Angular", description: "5 anos ativos", unlocked: activeDays >= 1825, progress: p(activeDays, 1825), progressLabel: `${activeDays}/1825`, tier: "diamond", category: "days" },
    { id: "days-3650", icon: "🏺", label: "Relíquia", description: "10 anos ativos", unlocked: activeDays >= 3650, progress: p(activeDays, 3650), progressLabel: `${activeDays}/3650`, tier: "diamond", category: "days" },
    { id: "days-7300", icon: "⏳", label: "Imortal", description: "20 anos ativos", unlocked: activeDays >= 7300, progress: p(activeDays, 7300), progressLabel: `${activeDays}/7300`, tier: "diamond", category: "days" },

    // === CACHE SAVINGS (9 → 14) ===
    { id: "cache-10", icon: "🪙", label: "Primeiro Troco", description: "Economizou $10 em cache", unlocked: cacheSavings >= 10, progress: p(cacheSavings, 10), progressLabel: `${formatUSD(cacheSavings)}/$10`, tier: "bronze", category: "cache" },
    { id: "cache-25", icon: "🐷", label: "Cofrinho", description: "Economizou $25 em cache", unlocked: cacheSavings >= 25, progress: p(cacheSavings, 25), progressLabel: `${formatUSD(cacheSavings)}/$25`, tier: "bronze", category: "cache" },
    { id: "cache-50", icon: "💰", label: "Poupança", description: "Economizou $50 em cache", unlocked: cacheSavings >= 50, progress: p(cacheSavings, 50), progressLabel: `${formatUSD(cacheSavings)}/$50`, tier: "silver", category: "cache" },
    { id: "cache-100", icon: "📈", label: "Investidor de Cache", description: "Economizou $100 em cache", unlocked: cacheSavings >= 100, progress: p(cacheSavings, 100), progressLabel: `${formatUSD(cacheSavings)}/$100`, tier: "silver", category: "cache" },
    { id: "cache-250", icon: "🎯", label: "Rendimento", description: "Economizou $250 em cache", unlocked: cacheSavings >= 250, progress: p(cacheSavings, 250), progressLabel: `${formatUSD(cacheSavings)}/$250`, tier: "gold", category: "cache" },
    { id: "cache-500", icon: "⚙️", label: "Cache Machine", description: "Economizou $500 em cache", unlocked: cacheSavings >= 500, progress: p(cacheSavings, 500), progressLabel: `${formatUSD(cacheSavings)}/$500`, tier: "gold", category: "cache" },
    { id: "cache-1k", icon: "🏆", label: "Cofre de Ouro", description: "Economizou $1K em cache", unlocked: cacheSavings >= 1e3, progress: p(cacheSavings, 1e3), progressLabel: `${formatUSD(cacheSavings)}/$1K`, tier: "gold", category: "cache" },
    { id: "cache-2500", icon: "👔", label: "Tesoureiro", description: "Economizou $2.5K em cache", unlocked: cacheSavings >= 2500, progress: p(cacheSavings, 2500), progressLabel: `${formatUSD(cacheSavings)}/$2.5K`, tier: "diamond", category: "cache" },
    { id: "cache-5k", icon: "🏦", label: "Banco do Cache", description: "Economizou $5K em cache", unlocked: cacheSavings >= 5e3, progress: p(cacheSavings, 5e3), progressLabel: `${formatUSD(cacheSavings)}/$5K`, tier: "diamond", category: "cache" },
    { id: "cache-10k", icon: "💎", label: "Mina de Ouro", description: "Economizou $10K em cache", unlocked: cacheSavings >= 1e4, progress: p(cacheSavings, 1e4), progressLabel: `${formatUSD(cacheSavings)}/$10K`, tier: "diamond", category: "cache" },
    { id: "cache-25k", icon: "🏴‍☠️", label: "Tesouro Pirata", description: "Economizou $25K em cache", unlocked: cacheSavings >= 25e3, progress: p(cacheSavings, 25e3), progressLabel: `${formatUSD(cacheSavings)}/$25K`, tier: "diamond", category: "cache" },
    { id: "cache-50k", icon: "👑", label: "Rei do Cache", description: "Economizou $50K em cache", unlocked: cacheSavings >= 5e4, progress: p(cacheSavings, 5e4), progressLabel: `${formatUSD(cacheSavings)}/$50K`, tier: "diamond", category: "cache" },
    { id: "cache-100k", icon: "🗝️", label: "Chave do Cofre", description: "Economizou $100K em cache", unlocked: cacheSavings >= 1e5, progress: p(cacheSavings, 1e5), progressLabel: `${formatUSD(cacheSavings)}/$100K`, tier: "diamond", category: "cache" },
    { id: "cache-1m", icon: "🌟", label: "El Dorado", description: "Economizou $1M em cache", unlocked: cacheSavings >= 1e6, progress: p(cacheSavings, 1e6), progressLabel: `${formatUSD(cacheSavings)}/$1M`, tier: "diamond", category: "cache" },

    // === DIVERSIDADE ===
    { id: "models-2", icon: "🎨", label: "Bicampeão", description: "Usou 2+ modelos", unlocked: modelsUsed >= 2, progress: p(modelsUsed, 2), progressLabel: `${modelsUsed}/2`, tier: "bronze", category: "org" },
    { id: "models-3", icon: "🌈", label: "Polivalente", description: "Usou 3+ modelos", unlocked: modelsUsed >= 3, progress: p(modelsUsed, 3), progressLabel: `${modelsUsed}/3`, tier: "silver", category: "org" },
    { id: "projects-1", icon: "📁", label: "Inauguração", description: "Primeiro projeto criado", unlocked: projectCount >= 1, progress: p(projectCount, 1), progressLabel: `${projectCount}/1`, tier: "bronze", category: "org" },
    { id: "projects-3", icon: "🗄️", label: "Gerente", description: "3+ projetos", unlocked: projectCount >= 3, progress: p(projectCount, 3), progressLabel: `${projectCount}/3`, tier: "silver", category: "org" },
    { id: "projects-10", icon: "🏗️", label: "Arquiteto", description: "10+ projetos", unlocked: projectCount >= 10, progress: p(projectCount, 10), progressLabel: `${projectCount}/10`, tier: "gold", category: "org" },
    { id: "projects-25", icon: "🌆", label: "Urbanista", description: "25+ projetos", unlocked: projectCount >= 25, progress: p(projectCount, 25), progressLabel: `${projectCount}/25`, tier: "diamond", category: "org" },

    // === SESSÕES ÉPICAS (9 → 13) ===
    { id: "epic-100", icon: "🏃", label: "Corrida", description: "Sessão com 100+ calls", unlocked: maxSessionEntries >= 100, progress: p(maxSessionEntries, 100), progressLabel: `${maxSessionEntries}/100`, tier: "bronze", category: "epic" },
    { id: "epic-500", icon: "🏃‍♂️", label: "Maratonista", description: "Sessão com 500+ calls", unlocked: maxSessionEntries >= 500, progress: p(maxSessionEntries, 500), progressLabel: `${maxSessionEntries}/500`, tier: "silver", category: "epic" },
    { id: "epic-1k", icon: "🏋️", label: "Ultra Maratonista", description: "Sessão com 1K+ calls", unlocked: maxSessionEntries >= 1e3, progress: p(maxSessionEntries, 1e3), progressLabel: `${maxSessionEntries}/1K`, tier: "gold", category: "epic" },
    { id: "epic-5k", icon: "🦾", label: "Imparável", description: "Sessão com 5K+ calls", unlocked: maxSessionEntries >= 5e3, progress: p(maxSessionEntries, 5e3), progressLabel: `${maxSessionEntries}/5K`, tier: "diamond", category: "epic" },
    { id: "epic-10k", icon: "🧬", label: "DNA Artificial", description: "Sessão com 10K+ calls", unlocked: maxSessionEntries >= 1e4, progress: p(maxSessionEntries, 1e4), progressLabel: `${maxSessionEntries}/10K`, tier: "diamond", category: "epic" },
    { id: "whale-50", icon: "🐟", label: "Peixe", description: "Sessão $50+", unlocked: maxSessionCost >= 50, progress: p(maxSessionCost, 50), progressLabel: `${formatUSD(maxSessionCost)}/$50`, tier: "bronze", category: "epic" },
    { id: "whale-100", icon: "🐋", label: "Baleia", description: "Sessão $100+", unlocked: maxSessionCost >= 100, progress: p(maxSessionCost, 100), progressLabel: `${formatUSD(maxSessionCost)}/$100`, tier: "silver", category: "epic" },
    { id: "whale-500", icon: "🦈", label: "Megalodon", description: "Sessão $500+", unlocked: maxSessionCost >= 500, progress: p(maxSessionCost, 500), progressLabel: `${formatUSD(maxSessionCost)}/$500`, tier: "gold", category: "epic" },
    { id: "whale-1k", icon: "🐉", label: "Dragão", description: "Sessão $1K+", unlocked: maxSessionCost >= 1e3, progress: p(maxSessionCost, 1e3), progressLabel: `${formatUSD(maxSessionCost)}/$1K`, tier: "gold", category: "epic" },
    { id: "whale-5k", icon: "💀", label: "Lenda", description: "Sessão $5K+", unlocked: maxSessionCost >= 5e3, progress: p(maxSessionCost, 5e3), progressLabel: `${formatUSD(maxSessionCost)}/$5K`, tier: "diamond", category: "epic" },
    { id: "whale-10k", icon: "👁️", label: "Olho de Sauron", description: "Sessão $10K+", unlocked: maxSessionCost >= 1e4, progress: p(maxSessionCost, 1e4), progressLabel: `${formatUSD(maxSessionCost)}/$10K`, tier: "diamond", category: "epic" },
    { id: "whale-25k", icon: "🌋", label: "Erupção", description: "Sessão $25K+", unlocked: maxSessionCost >= 25e3, progress: p(maxSessionCost, 25e3), progressLabel: `${formatUSD(maxSessionCost)}/$25K`, tier: "diamond", category: "epic" },
    { id: "whale-50k", icon: "☠️", label: "Apocalipse", description: "Sessão $50K+", unlocked: maxSessionCost >= 5e4, progress: p(maxSessionCost, 5e4), progressLabel: `${formatUSD(maxSessionCost)}/$50K`, tier: "diamond", category: "epic" },
  ];
}
