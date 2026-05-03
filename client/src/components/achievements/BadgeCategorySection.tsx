import { Section } from "@/components/shared/Section";
import { BadgeCard } from "./BadgeCard";
import type { Badge } from "@/lib/badges";

interface Props {
  /** Category icon (emoji or unicode glyph). */
  icon: string;
  /** Category title. */
  label: string;
  /** Badges already filtered to this category. */
  badges: Badge[];
}

/**
 * BadgeCategorySection — Section wrapper rendering a 4-col grid of BadgeCard
 * tiles. Header shows icon + label + count.
 *
 * Extracted from AchievementsPage:230-267.
 */
export function BadgeCategorySection({ icon, label, badges }: Props) {
  if (!badges.length) return null;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <Section
      title={<span className="flex items-center gap-2">{icon} {label}</span>}
      actions={<span className="text-xs text-muted-foreground tabular-nums">{unlockedCount}/{badges.length}</span>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {badges.map((b) => (
          <BadgeCard key={b.id} badge={b} />
        ))}
      </div>
    </Section>
  );
}
