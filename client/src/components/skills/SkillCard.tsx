import { Link } from "react-router-dom";
import { Lock, FileCode } from "lucide-react";
import type { SkillSummary } from "@/hooks/useSkills";
import { surface } from "@/lib/surface";

const CATEGORY_COLOR: Record<string, string> = {
  meta: "text-chart-4 border-chart-4/40 bg-chart-4/10",
  "code-review": "text-info border-info/40 bg-info/10",
  guard: "text-warning border-warning/40 bg-warning/10",
  optimization: "text-success border-success/40 bg-success/10",
  implementation: "text-info border-info/40 bg-info/10",
  design: "text-chart-5 border-chart-5/40 bg-chart-5/10",
  knowledge: "text-chart-2 border-chart-2/40 bg-chart-2/10",
  content: "text-muted-foreground border-border bg-muted/30",
  infra: "text-warning border-warning/40 bg-warning/10",
  people: "text-chart-3 border-chart-3/40 bg-chart-3/10",
  meeting: "text-chart-3 border-chart-3/40 bg-chart-3/10",
  workflow: "text-info border-info/40 bg-info/10",
  marketing: "text-chart-5 border-chart-5/40 bg-chart-5/10",
};

interface Props {
  skill: SkillSummary;
}

export function SkillCard({ skill }: Props) {
  const trim = skill.description.length > 180
    ? skill.description.slice(0, 177).replace(/\s+\S*$/, "") + "…"
    : skill.description;

  const categoryClass = skill.category ? (CATEGORY_COLOR[skill.category] || "text-muted-foreground border-border bg-muted/30") : "";

  return (
    <Link
      to={`/skills/${skill.name}`}
      className={`${surface.section} block px-5 py-4 hover:bg-muted/30 hover:border-ring/40 transition-colors group`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-info transition-colors flex items-center gap-2">
          <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
          {skill.name}
        </h3>
        {skill.lockedAt && (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-warning border border-warning/40 bg-warning/10 px-1.5 py-0.5 rounded-sm"
            title={`Lock-in IL-10: validated ${skill.lockedAt}`}
          >
            <Lock className="h-2.5 w-2.5" />
            {skill.lockedAt.slice(5)}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{trim}</p>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
        {skill.category && (
          <span className={`px-1.5 py-0.5 rounded-sm border ${categoryClass}`}>{skill.category}</span>
        )}
        <span className="tabular-nums">{skill.fileCount} {skill.fileCount === 1 ? "arquivo" : "arquivos"}</span>
      </div>
    </Link>
  );
}
