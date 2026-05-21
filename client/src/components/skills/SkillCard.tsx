import { NavLink } from "react-router-dom";
import { Lock } from "lucide-react";
import { Pill } from "@/components/shared/Pill";
import type { SkillSummary, SkillSource, SkillStatus } from "@/hooks/useSkills";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<SkillSource, string> = {
  skillforge: "skillforge",
  omc: "omc",
  builtin: "built-in",
};

interface Props {
  skill: SkillSummary;
}

function StatusPill({ status }: { status: SkillStatus | null }) {
  if (status === "active") return <Pill variant="ok">Ativa</Pill>;
  if (status === "deprecated") return <Pill variant="err">Deprecated</Pill>;
  return (
    <Pill variant="neutral" dot={false}>
      sem status
    </Pill>
  );
}

/**
 * SkillCard — visual card for skills grid layout.
 * Header (name + status), badges row (source + category),
 * description with line-clamp, footer with file count + lock-in.
 */
export function SkillCard({ skill }: Props) {
  return (
    <NavLink
      to={`/skills/${encodeURIComponent(skill.name)}?source=${encodeURIComponent(skill.source)}`}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        "min-h-[180px] transition-all duration-150",
        "hover:border-info/50 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {/* Header: name + status */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <h3
          className="font-mono text-sm font-semibold text-foreground group-hover:text-info transition-colors line-clamp-2 break-all"
          title={skill.name}
        >
          {skill.name}
        </h3>
        <div className="shrink-0">
          <StatusPill status={skill.status ?? null} />
        </div>
      </div>

      {/* Badges row: source + category */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Pill
          variant={
            skill.source === "skillforge"
              ? "ok"
              : skill.source === "omc"
              ? "info"
              : "neutral"
          }
        >
          {SOURCE_LABEL[skill.source]}
        </Pill>
        {skill.category && (
          <Pill variant="neutral" dot={false}>
            {skill.category}
          </Pill>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {skill.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums pt-2 border-t border-border/50">
        <span className="font-mono">{skill.fileCount} arq</span>
        {skill.lockedAt ? (
          <span className="inline-flex items-center gap-1 text-warning">
            <Lock className="h-3 w-3" />
            <span className="font-mono">{skill.lockedAt}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </div>
    </NavLink>
  );
}
