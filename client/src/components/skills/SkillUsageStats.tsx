import { Trophy, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { formatNumber, formatPercent } from "@/lib/formatters";
import type { SkillUsageStats as SkillUsageStatsData } from "@/hooks/useSkillUsage";

interface Props {
  data: SkillUsageStatsData;
}

/**
 * SkillUsageStats — grid de 4 KPI cards pra a page /skill-usage.
 *
 * Cards: Top skill, Total invocações no período, Allow rate, Deprecated invoked.
 */
export function SkillUsageStats({ data }: Props) {
  const topSkill = data.topSkills?.[0];

  let totalAllow = 0;
  let totalDeny = 0;
  for (const day of data.dailyCount ?? []) {
    totalAllow += day.allow;
    totalDeny += day.deny;
  }
  const totalCount = totalAllow + totalDeny;
  const allowRate = totalCount > 0 ? (totalAllow / totalCount) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={Trophy}
        iconColor="text-chart-3"
        label="Top skill"
        value={topSkill ? topSkill.skill_name : "—"}
        hint={
          topSkill ? (
            <span className="text-xs text-muted-foreground">
              {formatNumber(topSkill.count)} invocações
            </span>
          ) : undefined
        }
      />
      <StatCard
        icon={Activity}
        iconColor="text-info"
        label="Total invocações"
        value={formatNumber(totalCount)}
        hint={
          <span className="text-xs text-muted-foreground">
            no período selecionado
          </span>
        }
      />
      <StatCard
        icon={CheckCircle2}
        iconColor="text-success"
        label="Allow rate"
        value={totalCount > 0 ? formatPercent(allowRate) : "—"}
        hint={
          totalCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {formatNumber(totalAllow)} allow / {formatNumber(totalDeny)} deny
            </span>
          ) : undefined
        }
      />
      <StatCard
        icon={AlertTriangle}
        iconColor={
          data.deprecatedCount > 0 ? "text-warning" : "text-muted-foreground"
        }
        label="Deprecated invocadas"
        value={formatNumber(data.deprecatedCount ?? 0)}
        hint={
          <span className="text-xs text-muted-foreground">
            skills marcadas mas ainda usadas
          </span>
        }
      />
    </div>
  );
}
