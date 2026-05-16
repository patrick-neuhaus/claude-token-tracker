import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useSkillUsageStats } from "@/hooks/useSkillUsage";
import { SkillUsageStats } from "@/components/skills/SkillUsageStats";
import { SkillUsageTimeSeries } from "@/components/skills/SkillUsageTimeSeries";
import {
  DateRangeFilter,
  type DateRange,
} from "@/components/shared/DateRangeFilter";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/Section";
import { SkeletonGrid } from "@/components/shared/SkeletonGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatNumber, formatPercent } from "@/lib/formatters";
import type { TopSkill } from "@/hooks/useSkillUsage";

const TABLE_COLS = "minmax(0,1fr) 100px 80px 32px";

function TopSkillsTable({ data }: { data: TopSkill[] }) {
  const total = useMemo(
    () => data.reduce((sum, s) => sum + s.count, 0),
    [data],
  );

  if (data.length === 0) {
    return <EmptyState message="Nenhuma invocação ainda" />;
  }

  const top10 = data.slice(0, 10);

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <div
        className="grid gap-3 px-5 py-3 border-b border-border bg-muted/30"
        style={{ gridTemplateColumns: TABLE_COLS }}
      >
        <span className="text-xs font-medium text-muted-foreground">
          Skill
        </span>
        <span className="text-xs font-medium text-muted-foreground text-right">
          Invocações
        </span>
        <span className="text-xs font-medium text-muted-foreground text-right">
          %
        </span>
        <span />
      </div>
      <div className="divide-y divide-border">
        {top10.map((s) => {
          const pct = total > 0 ? (s.count / total) * 100 : 0;
          return (
            <Link
              key={s.skill_name}
              to={`/skills/${encodeURIComponent(s.skill_name)}`}
              className="grid gap-3 px-5 py-2.5 hover:bg-muted/40 transition-colors items-center group"
              style={{ gridTemplateColumns: TABLE_COLS }}
            >
              <span className="font-mono text-sm text-foreground group-hover:text-info transition-colors truncate">
                {s.skill_name}
              </span>
              <span className="text-sm text-right tabular-nums text-foreground">
                {formatNumber(s.count)}
              </span>
              <span className="text-xs text-right tabular-nums text-muted-foreground">
                {formatPercent(pct)}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity justify-self-end" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SkillUsagePage() {
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "7d" });
  const { data, isLoading, isError, refetch } = useSkillUsageStats(
    dateRange.from,
    dateRange.to,
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Uso de Skills" />
        <Skeleton className="h-10 w-full" />
        <SkeletonGrid count={4} cols={4} />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Erro ao carregar uso de skills"
        description="Verifica se o backend tá rodando e o endpoint /api/skill-invocations/stats responde."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Uso de Skills"
        subtitle={
          <>
            {formatNumber(data.topSkills?.length ?? 0)} skills invocadas no
            período
          </>
        }
      />

      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      <SkillUsageStats data={data} />

      <Section title="Invocações por dia">
        <SkillUsageTimeSeries data={data.dailyCount ?? []} />
      </Section>

      <Section
        title="Top skills"
        description="As 10 skills mais invocadas no período selecionado."
      >
        <TopSkillsTable data={data.topSkills ?? []} />
      </Section>
    </div>
  );
}
