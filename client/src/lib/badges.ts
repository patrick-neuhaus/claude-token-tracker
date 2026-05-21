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
