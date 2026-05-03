import { query } from "../config/database.js";
import { CACHE_SAVINGS_USD_SQL } from "../utils/cacheSavings.js";

/**
 * achievementsService — Wave B4.1 V001
 *
 * Server-side authoritative source for achievement catalog (BADGE_DEFINITIONS).
 * Replaces 3-way client duplication (AchievementsPage, Achievements.tsx,
 * AchievementNotifier).
 *
 * Catalog: 93 badges (80 from lib/badges.ts + 13 reconciled from old
 * Achievements.tsx + 2 cache-rate variants distinct from cache-savings).
 *
 * Note: client/src/lib/badges.ts kept temporarily as fallback during migration.
 * TODO B7: delete lib/badges.ts after this endpoint proven stable.
 */

export type BadgeTier = "bronze" | "silver" | "gold" | "diamond";

export interface BadgeDefinition {
  id: string;
  icon: string;
  label: string;
  description: string;
  tier: BadgeTier;
  category: string;
  /** Field name on stats record to compare against `target` */
  metric: keyof AchievementStats;
  target: number;
  /** Optional formatter for `progressLabel` */
  format?: "int" | "usd" | "tokens" | "rate";
  /** When true, badge requires hasCacheData (totalInput > 0) to unlock */
  requiresCacheData?: boolean;
}

export interface UnlockedBadge {
  id: string;
  icon: string;
  label: string;
  description: string;
  tier: BadgeTier;
  category: string;
  unlocked: boolean;
  progress: number;
  progressLabel: string;
  target: number;
}

export interface AchievementStats {
  total_entries: number;
  total_cost: number;
  total_tokens: number;
  total_sessions: number;
  active_days: number;
  models_used: number;
  project_count: number;
  max_session_entries: number;
  max_session_cost: number;
  cache_savings_usd: number;
  total_cache_read: number;
  total_input: number;
  cache_rate: number;
  has_cache_data: boolean;
}

function formatUSD(v: number): string {
  return `$${v.toFixed(2)}`;
}

function tokenLabel(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return `${v}`;
}

function pct(current: number, target: number): number {
  return Math.min(100, (current / target) * 100);
}

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

/**
 * BADGE_DEFINITIONS — single source of truth.
 * IMPORTANT: order matters for UI grouping inside category.
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // === CALLS (11) ===
  { id: "calls-100", icon: "📞", label: "Primeiras 100", description: "100 chamadas à API", tier: "bronze", category: "calls", metric: "total_entries", target: 100, format: "int" },
  { id: "calls-500", icon: "📱", label: "Frequentador", description: "500 chamadas à API", tier: "bronze", category: "calls", metric: "total_entries", target: 500, format: "int" },
  { id: "calls-1k", icon: "🔥", label: "Mil e Uma Noites", description: "1.000 chamadas à API", tier: "silver", category: "calls", metric: "total_entries", target: 1e3, format: "int" },
  { id: "calls-5k", icon: "⚡", label: "Viciado", description: "5.000 chamadas à API", tier: "silver", category: "calls", metric: "total_entries", target: 5e3, format: "int" },
  { id: "calls-10k", icon: "💎", label: "Dependente Químico", description: "10.000 chamadas à API", tier: "gold", category: "calls", metric: "total_entries", target: 1e4, format: "int" },
  { id: "calls-50k", icon: "🌋", label: "Sem Volta", description: "50.000 chamadas à API", tier: "gold", category: "calls", metric: "total_entries", target: 5e4, format: "int" },
  { id: "calls-100k", icon: "☄️", label: "Fusão Nuclear", description: "100.000 chamadas", tier: "diamond", category: "calls", metric: "total_entries", target: 1e5, format: "int" },
  { id: "calls-500k", icon: "🕳️", label: "Buraco Negro", description: "500.000 chamadas", tier: "diamond", category: "calls", metric: "total_entries", target: 5e5, format: "int" },
  { id: "calls-1m", icon: "🧬", label: "Transcendência", description: "1 milhão de chamadas", tier: "diamond", category: "calls", metric: "total_entries", target: 1e6, format: "int" },
  { id: "calls-5m", icon: "⏳", label: "Eterno", description: "5 milhões de chamadas", tier: "diamond", category: "calls", metric: "total_entries", target: 5e6, format: "int" },
  { id: "calls-10m", icon: "🌀", label: "Além do Infinito", description: "10 milhões de chamadas", tier: "diamond", category: "calls", metric: "total_entries", target: 1e7, format: "int" },

  // === COST (13) ===
  { id: "cost-100", icon: "💵", label: "Centenário", description: "Gastou $100", tier: "bronze", category: "cost", metric: "total_cost", target: 100, format: "usd" },
  { id: "cost-500", icon: "💸", label: "Meia Entrada", description: "Gastou $500", tier: "bronze", category: "cost", metric: "total_cost", target: 500, format: "usd" },
  { id: "cost-1k", icon: "💰", label: "Clube do Milhar", description: "Gastou $1.000", tier: "silver", category: "cost", metric: "total_cost", target: 1e3, format: "usd" },
  { id: "cost-5k", icon: "🤑", label: "All In", description: "Gastou $5.000", tier: "silver", category: "cost", metric: "total_cost", target: 5e3, format: "usd" },
  { id: "cost-10k", icon: "👑", label: "Rei do Token", description: "Gastou $10.000", tier: "gold", category: "cost", metric: "total_cost", target: 1e4, format: "usd" },
  { id: "cost-25k", icon: "🏦", label: "Banco Central", description: "Gastou $25.000", tier: "gold", category: "cost", metric: "total_cost", target: 25e3, format: "usd" },
  { id: "cost-50k", icon: "🚀", label: "To the Moon", description: "Gastou $50.000", tier: "gold", category: "cost", metric: "total_cost", target: 5e4, format: "usd" },
  { id: "cost-100k", icon: "🏴‍☠️", label: "Sem Limites", description: "Gastou $100.000", tier: "diamond", category: "cost", metric: "total_cost", target: 1e5, format: "usd" },
  { id: "cost-250k", icon: "🪙", label: "Midas", description: "Gastou $250.000", tier: "diamond", category: "cost", metric: "total_cost", target: 25e4, format: "usd" },
  { id: "cost-500k", icon: "💎", label: "Diamante Bruto", description: "Gastou $500.000", tier: "diamond", category: "cost", metric: "total_cost", target: 5e5, format: "usd" },
  { id: "cost-1m", icon: "🏰", label: "Castelo de Tokens", description: "Gastou $1 milhão", tier: "diamond", category: "cost", metric: "total_cost", target: 1e6, format: "usd" },
  { id: "cost-5m", icon: "🌍", label: "Patrimônio Global", description: "Gastou $5 milhões", tier: "diamond", category: "cost", metric: "total_cost", target: 5e6, format: "usd" },
  { id: "cost-10m", icon: "🕳️", label: "Horizonte de Eventos", description: "Gastou $10 milhões", tier: "diamond", category: "cost", metric: "total_cost", target: 1e7, format: "usd" },

  // === TOKENS (12) ===
  { id: "tokens-1m", icon: "🔢", label: "Primeiro Milhão", description: "1M tokens", tier: "bronze", category: "tokens", metric: "total_tokens", target: 1e6, format: "tokens" },
  { id: "tokens-10m", icon: "📊", label: "Dez Milhões", description: "10M tokens", tier: "bronze", category: "tokens", metric: "total_tokens", target: 1e7, format: "tokens" },
  { id: "tokens-100m", icon: "🧮", label: "Cem Milhões", description: "100M tokens", tier: "silver", category: "tokens", metric: "total_tokens", target: 1e8, format: "tokens" },
  { id: "tokens-1b", icon: "🌌", label: "Bilionário", description: "1B tokens", tier: "silver", category: "tokens", metric: "total_tokens", target: 1e9, format: "tokens" },
  { id: "tokens-10b", icon: "🪐", label: "Plutão", description: "10B tokens", tier: "gold", category: "tokens", metric: "total_tokens", target: 1e10, format: "tokens" },
  { id: "tokens-100b", icon: "🌟", label: "Via Láctea", description: "100B tokens", tier: "gold", category: "tokens", metric: "total_tokens", target: 1e11, format: "tokens" },
  { id: "tokens-1t", icon: "🔮", label: "Singularidade", description: "1 trilhão de tokens", tier: "diamond", category: "tokens", metric: "total_tokens", target: 1e12, format: "tokens" },
  { id: "tokens-10t", icon: "⚛️", label: "Fissão", description: "10 trilhões de tokens", tier: "diamond", category: "tokens", metric: "total_tokens", target: 1e13, format: "tokens" },
  { id: "tokens-100t", icon: "🧪", label: "Antimatéria", description: "100 trilhões de tokens", tier: "diamond", category: "tokens", metric: "total_tokens", target: 1e14, format: "tokens" },
  { id: "tokens-1q", icon: "🌀", label: "Quasar", description: "1 quatrilhão de tokens", tier: "diamond", category: "tokens", metric: "total_tokens", target: 1e15, format: "tokens" },
  { id: "tokens-10q", icon: "💫", label: "Big Bang", description: "10 quatrilhões de tokens", tier: "diamond", category: "tokens", metric: "total_tokens", target: 1e16, format: "tokens" },
  { id: "tokens-100q", icon: "🕳️", label: "Multiverso", description: "100 quatrilhões de tokens", tier: "diamond", category: "tokens", metric: "total_tokens", target: 1e17, format: "tokens" },

  // === SESSIONS (11) ===
  { id: "sessions-5", icon: "🗂️", label: "Iniciante", description: "5 sessões", tier: "bronze", category: "sessions", metric: "total_sessions", target: 5, format: "int" },
  { id: "sessions-10", icon: "📋", label: "Multitarefa", description: "10 sessões", tier: "bronze", category: "sessions", metric: "total_sessions", target: 10, format: "int" },
  { id: "sessions-25", icon: "📚", label: "Produtivo", description: "25 sessões", tier: "silver", category: "sessions", metric: "total_sessions", target: 25, format: "int" },
  { id: "sessions-50", icon: "🏭", label: "Fábrica", description: "50 sessões", tier: "silver", category: "sessions", metric: "total_sessions", target: 50, format: "int" },
  { id: "sessions-100", icon: "🌐", label: "Centenário", description: "100 sessões", tier: "gold", category: "sessions", metric: "total_sessions", target: 100, format: "int" },
  { id: "sessions-250", icon: "🏗️", label: "Colecionador", description: "250 sessões", tier: "gold", category: "sessions", metric: "total_sessions", target: 250, format: "int" },
  { id: "sessions-500", icon: "🧲", label: "Obsessivo", description: "500 sessões", tier: "gold", category: "sessions", metric: "total_sessions", target: 500, format: "int" },
  { id: "sessions-1k", icon: "♾️", label: "Infinito", description: "1.000 sessões", tier: "diamond", category: "sessions", metric: "total_sessions", target: 1e3, format: "int" },
  { id: "sessions-5k", icon: "🌊", label: "Tsunami", description: "5.000 sessões", tier: "diamond", category: "sessions", metric: "total_sessions", target: 5e3, format: "int" },
  { id: "sessions-10k", icon: "🏔️", label: "Everest", description: "10.000 sessões", tier: "diamond", category: "sessions", metric: "total_sessions", target: 1e4, format: "int" },
  { id: "sessions-50k", icon: "🌌", label: "Galáxia", description: "50.000 sessões", tier: "diamond", category: "sessions", metric: "total_sessions", target: 5e4, format: "int" },

  // === DAYS (11) ===
  { id: "days-3", icon: "🌱", label: "Semente", description: "3 dias ativos", tier: "bronze", category: "days", metric: "active_days", target: 3, format: "int" },
  { id: "days-7", icon: "📅", label: "Primeira Semana", description: "7 dias ativos", tier: "bronze", category: "days", metric: "active_days", target: 7, format: "int" },
  { id: "days-14", icon: "🗓️", label: "Quinzena", description: "14 dias ativos", tier: "silver", category: "days", metric: "active_days", target: 14, format: "int" },
  { id: "days-30", icon: "📆", label: "Mês Completo", description: "30 dias ativos", tier: "silver", category: "days", metric: "active_days", target: 30, format: "int" },
  { id: "days-90", icon: "🏅", label: "Trimestre de Fogo", description: "90 dias ativos", tier: "gold", category: "days", metric: "active_days", target: 90, format: "int" },
  { id: "days-180", icon: "⭐", label: "Meio Ano", description: "180 dias ativos", tier: "gold", category: "days", metric: "active_days", target: 180, format: "int" },
  { id: "days-365", icon: "🎖️", label: "Veterano", description: "1 ano ativo", tier: "diamond", category: "days", metric: "active_days", target: 365, format: "int" },
  { id: "days-730", icon: "🏛️", label: "Monumento", description: "2 anos ativos", tier: "diamond", category: "days", metric: "active_days", target: 730, format: "int" },
  { id: "days-1825", icon: "🗿", label: "Pedra Angular", description: "5 anos ativos", tier: "diamond", category: "days", metric: "active_days", target: 1825, format: "int" },
  { id: "days-3650", icon: "🏺", label: "Relíquia", description: "10 anos ativos", tier: "diamond", category: "days", metric: "active_days", target: 3650, format: "int" },
  { id: "days-7300", icon: "⏳", label: "Imortal", description: "20 anos ativos", tier: "diamond", category: "days", metric: "active_days", target: 7300, format: "int" },

  // === CACHE SAVINGS USD (14) ===
  { id: "cache-10", icon: "🪙", label: "Primeiro Troco", description: "Economizou $10 em cache", tier: "bronze", category: "cache", metric: "cache_savings_usd", target: 10, format: "usd" },
  { id: "cache-25", icon: "🐷", label: "Cofrinho", description: "Economizou $25 em cache", tier: "bronze", category: "cache", metric: "cache_savings_usd", target: 25, format: "usd" },
  { id: "cache-50", icon: "💰", label: "Poupança", description: "Economizou $50 em cache", tier: "silver", category: "cache", metric: "cache_savings_usd", target: 50, format: "usd" },
  { id: "cache-100", icon: "📈", label: "Investidor de Cache", description: "Economizou $100 em cache", tier: "silver", category: "cache", metric: "cache_savings_usd", target: 100, format: "usd" },
  { id: "cache-250", icon: "🎯", label: "Rendimento", description: "Economizou $250 em cache", tier: "gold", category: "cache", metric: "cache_savings_usd", target: 250, format: "usd" },
  { id: "cache-500", icon: "⚙️", label: "Cache Machine", description: "Economizou $500 em cache", tier: "gold", category: "cache", metric: "cache_savings_usd", target: 500, format: "usd" },
  { id: "cache-1k", icon: "🏆", label: "Cofre de Ouro", description: "Economizou $1K em cache", tier: "gold", category: "cache", metric: "cache_savings_usd", target: 1e3, format: "usd" },
  { id: "cache-2500", icon: "👔", label: "Tesoureiro", description: "Economizou $2.5K em cache", tier: "diamond", category: "cache", metric: "cache_savings_usd", target: 2500, format: "usd" },
  { id: "cache-5k", icon: "🏦", label: "Banco do Cache", description: "Economizou $5K em cache", tier: "diamond", category: "cache", metric: "cache_savings_usd", target: 5e3, format: "usd" },
  { id: "cache-10k", icon: "💎", label: "Mina de Ouro", description: "Economizou $10K em cache", tier: "diamond", category: "cache", metric: "cache_savings_usd", target: 1e4, format: "usd" },
  { id: "cache-25k", icon: "🏴‍☠️", label: "Tesouro Pirata", description: "Economizou $25K em cache", tier: "diamond", category: "cache", metric: "cache_savings_usd", target: 25e3, format: "usd" },
  { id: "cache-50k", icon: "👑", label: "Rei do Cache", description: "Economizou $50K em cache", tier: "diamond", category: "cache", metric: "cache_savings_usd", target: 5e4, format: "usd" },
  { id: "cache-100k", icon: "🗝️", label: "Chave do Cofre", description: "Economizou $100K em cache", tier: "diamond", category: "cache", metric: "cache_savings_usd", target: 1e5, format: "usd" },
  { id: "cache-1m", icon: "🌟", label: "El Dorado", description: "Economizou $1M em cache", tier: "diamond", category: "cache", metric: "cache_savings_usd", target: 1e6, format: "usd" },

  // === CACHE HIT RATE (eficiência) (2) ===
  { id: "cache-rate-50", icon: "🎯", label: "Cache Master", description: "Cache hit rate acima de 50%", tier: "silver", category: "cache", metric: "cache_rate", target: 50, format: "rate", requiresCacheData: true },
  { id: "cache-rate-80", icon: "🏆", label: "Cache God", description: "Cache hit rate acima de 80%", tier: "gold", category: "cache", metric: "cache_rate", target: 80, format: "rate", requiresCacheData: true },

  // === DIVERSIDADE (6) ===
  { id: "models-2", icon: "🎨", label: "Bicampeão", description: "Usou 2+ modelos", tier: "bronze", category: "org", metric: "models_used", target: 2, format: "int" },
  { id: "models-3", icon: "🌈", label: "Polivalente", description: "Usou 3+ modelos", tier: "silver", category: "org", metric: "models_used", target: 3, format: "int" },
  { id: "projects-1", icon: "📁", label: "Inauguração", description: "Primeiro projeto criado", tier: "bronze", category: "org", metric: "project_count", target: 1, format: "int" },
  { id: "projects-3", icon: "🗄️", label: "Gerente", description: "3+ projetos", tier: "silver", category: "org", metric: "project_count", target: 3, format: "int" },
  { id: "projects-10", icon: "🏗️", label: "Arquiteto", description: "10+ projetos", tier: "gold", category: "org", metric: "project_count", target: 10, format: "int" },
  { id: "projects-25", icon: "🌆", label: "Urbanista", description: "25+ projetos", tier: "diamond", category: "org", metric: "project_count", target: 25, format: "int" },

  // === SESSÕES ÉPICAS (13) ===
  { id: "epic-100", icon: "🏃", label: "Corrida", description: "Sessão com 100+ calls", tier: "bronze", category: "epic", metric: "max_session_entries", target: 100, format: "int" },
  { id: "epic-500", icon: "🏃‍♂️", label: "Maratonista", description: "Sessão com 500+ calls", tier: "silver", category: "epic", metric: "max_session_entries", target: 500, format: "int" },
  { id: "epic-1k", icon: "🏋️", label: "Ultra Maratonista", description: "Sessão com 1K+ calls", tier: "gold", category: "epic", metric: "max_session_entries", target: 1e3, format: "int" },
  { id: "epic-5k", icon: "🦾", label: "Imparável", description: "Sessão com 5K+ calls", tier: "diamond", category: "epic", metric: "max_session_entries", target: 5e3, format: "int" },
  { id: "epic-10k", icon: "🧬", label: "DNA Artificial", description: "Sessão com 10K+ calls", tier: "diamond", category: "epic", metric: "max_session_entries", target: 1e4, format: "int" },
  { id: "whale-50", icon: "🐟", label: "Peixe", description: "Sessão $50+", tier: "bronze", category: "epic", metric: "max_session_cost", target: 50, format: "usd" },
  { id: "whale-100", icon: "🐋", label: "Baleia", description: "Sessão $100+", tier: "silver", category: "epic", metric: "max_session_cost", target: 100, format: "usd" },
  { id: "whale-500", icon: "🦈", label: "Megalodon", description: "Sessão $500+", tier: "gold", category: "epic", metric: "max_session_cost", target: 500, format: "usd" },
  { id: "whale-1k", icon: "🐉", label: "Dragão", description: "Sessão $1K+", tier: "gold", category: "epic", metric: "max_session_cost", target: 1e3, format: "usd" },
  { id: "whale-5k", icon: "💀", label: "Lenda", description: "Sessão $5K+", tier: "diamond", category: "epic", metric: "max_session_cost", target: 5e3, format: "usd" },
  { id: "whale-10k", icon: "👁️", label: "Olho de Sauron", description: "Sessão $10K+", tier: "diamond", category: "epic", metric: "max_session_cost", target: 1e4, format: "usd" },
  { id: "whale-25k", icon: "🌋", label: "Erupção", description: "Sessão $25K+", tier: "diamond", category: "epic", metric: "max_session_cost", target: 25e3, format: "usd" },
  { id: "whale-50k", icon: "☠️", label: "Apocalipse", description: "Sessão $50K+", tier: "diamond", category: "epic", metric: "max_session_cost", target: 5e4, format: "usd" },
];

function formatProgressLabel(value: number, target: number, format: BadgeDefinition["format"]): string {
  switch (format) {
    case "usd":
      return `${formatUSD(value)}/${formatUSD(target)}`;
    case "tokens":
      return `${tokenLabel(value)}/${tokenLabel(target)}`;
    case "rate":
      return `${value.toFixed(0)}%`;
    case "int":
    default:
      return `${value}/${target}`;
  }
}

/**
 * Loads aggregate stats for a user, single SQL query.
 * Mirror of analyticsService.getAchievements (kept compatible by intent — returns
 * superset of fields). Computed cache_rate + has_cache_data inline for badge logic.
 */
export async function getAchievementStats(userId: string): Promise<AchievementStats> {
  const result = await query(
    `SELECT
       COUNT(*)::int AS total_entries,
       COALESCE(SUM(cost_usd), 0)::float AS total_cost,
       COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
       COUNT(DISTINCT session_id)::int AS total_sessions,
       COUNT(DISTINCT (timestamp AT TIME ZONE 'America/Sao_Paulo')::date)::int AS active_days,
       COUNT(DISTINCT model)::int AS models_used,
       MAX(cost_usd)::float AS max_single_entry_cost,
       COALESCE(SUM(cache_read), 0)::bigint AS total_cache_read,
       COALESCE(SUM(input_tokens), 0)::bigint AS total_input,
       (SELECT COUNT(DISTINCT p.id)::int FROM projects p JOIN sessions s ON s.project_id = p.id WHERE s.user_id = $1) AS project_count,
       (SELECT MAX(entry_count)::int FROM sessions WHERE user_id = $1) AS max_session_entries,
       (SELECT MAX(total_cost_usd)::float FROM sessions WHERE user_id = $1) AS max_session_cost,
       ${CACHE_SAVINGS_USD_SQL} AS cache_savings_usd
     FROM token_entries
     WHERE user_id = $1`,
    [userId]
  );

  const r = result.rows[0] || {};
  const totalEntries = Number(r.total_entries) || 0;
  const totalCost = Number(r.total_cost) || 0;
  const totalTokens = Number(r.total_tokens) || 0;
  const totalSessions = Number(r.total_sessions) || 0;
  const activeDays = Number(r.active_days) || 0;
  const modelsUsed = Number(r.models_used) || 0;
  const projectCount = Number(r.project_count) || 0;
  const maxSessionEntries = Number(r.max_session_entries) || 0;
  const maxSessionCost = Number(r.max_session_cost) || 0;
  const cacheSavingsUsd = Number(r.cache_savings_usd) || 0;
  const totalCacheRead = Number(r.total_cache_read) || 0;
  const totalInput = Number(r.total_input) || 0;
  const cacheRate = totalCacheRead + totalInput > 0
    ? (totalCacheRead / (totalCacheRead + totalInput)) * 100
    : 0;

  return {
    total_entries: totalEntries,
    total_cost: totalCost,
    total_tokens: totalTokens,
    total_sessions: totalSessions,
    active_days: activeDays,
    models_used: modelsUsed,
    project_count: projectCount,
    max_session_entries: maxSessionEntries,
    max_session_cost: maxSessionCost,
    cache_savings_usd: cacheSavingsUsd,
    total_cache_read: totalCacheRead,
    total_input: totalInput,
    cache_rate: cacheRate,
    has_cache_data: totalInput > 0,
  };
}

export interface ComputedBadgesResponse {
  badges: UnlockedBadge[];
  totalUnlocked: number;
  total: number;
  byTier: Record<BadgeTier, { unlocked: number; total: number }>;
  /** Useful for client backwards-compat / debugging */
  stats: AchievementStats;
}

/**
 * Computes all 93 badges for a user.
 * Returns the full catalog with unlocked status + progress.
 */
export async function computeBadges(userId: string): Promise<ComputedBadgesResponse> {
  const stats = await getAchievementStats(userId);

  const badges: UnlockedBadge[] = BADGE_DEFINITIONS.map((def) => {
    const value = Number(stats[def.metric]) || 0;
    const meetsCacheRequirement = !def.requiresCacheData || stats.has_cache_data;
    const unlocked = meetsCacheRequirement && value >= def.target;
    const progress = meetsCacheRequirement ? pct(value, def.target) : 0;
    let progressLabel: string;
    if (def.requiresCacheData && !stats.has_cache_data) {
      progressLabel = "sem dados";
    } else {
      progressLabel = formatProgressLabel(value, def.target, def.format);
    }

    return {
      id: def.id,
      icon: def.icon,
      label: def.label,
      description: def.description,
      tier: def.tier,
      category: def.category,
      unlocked,
      progress,
      progressLabel,
      target: def.target,
    };
  });

  const totalUnlocked = badges.filter((b) => b.unlocked).length;
  const tiers: BadgeTier[] = ["bronze", "silver", "gold", "diamond"];
  const byTier = tiers.reduce(
    (acc, tier) => {
      const subset = badges.filter((b) => b.tier === tier);
      acc[tier] = {
        unlocked: subset.filter((b) => b.unlocked).length,
        total: subset.length,
      };
      return acc;
    },
    {} as Record<BadgeTier, { unlocked: number; total: number }>
  );

  return {
    badges,
    totalUnlocked,
    total: badges.length,
    byTier,
    stats,
  };
}
