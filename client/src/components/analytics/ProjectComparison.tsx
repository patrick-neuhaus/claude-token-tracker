import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Section } from "@/components/shared/Section";
import { FilterChip } from "@/components/shared/FilterChip";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";
import { useProjects } from "@/hooks/useProjects";
import { formatUSD, formatTokens, formatNumber } from "@/lib/formatters";
import { CHART_COLORS } from "@/lib/constants";
import type { ProjectComparisonData } from "@/lib/types";
import { SvgLineChart, type LineSeries } from "@/components/charts/SvgLineChart";

interface SummaryRow {
  project_id: string;
  project: string;
  total_cost_usd: number;
  session_count: number;
  entry_count: number;
  total_tokens: string;
  cost_per_session: number;
  _color: string;
}

interface Props {
  dateRange: { from?: string; to?: string };
}

const summaryColumns: AppTableColumn<SummaryRow>[] = [
  {
    key: "project",
    header: "Projeto",
    width: "minmax(180px,2fr)",
    render: (v, r) => (
      <span className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full inline-block flex-none" style={{ background: r._color }} />
        <span className="truncate">{v}</span>
      </span>
    ),
  },
  {
    key: "total_cost_usd",
    header: "Custo total",
    width: "120px",
    align: "right",
    mono: true,
    render: (v) => <span className="font-medium">{formatUSD(v)}</span>,
  },
  {
    key: "session_count",
    header: "Sessões",
    width: "100px",
    align: "right",
    mono: true,
    render: (v) => formatNumber(v),
  },
  {
    key: "total_tokens",
    header: "Tokens",
    width: "120px",
    align: "right",
    mono: true,
    render: (v) => formatTokens(v),
  },
  {
    key: "cost_per_session",
    header: "Custo/sessão",
    width: "130px",
    align: "right",
    mono: true,
    render: (v) => formatUSD(v),
  },
];

/**
 * ProjectComparison — multi-project comparison with table + line chart.
 * Allows up to 3 projects selected via FilterChip with disabled-on-limit.
 *
 * Self-contained: owns selection state + fetches comparison data.
 * Extracted from AnalyticsPage:81-194.
 */
export function ProjectComparison({ dateRange }: Props) {
  const { data: projectsData } = useProjects();
  const projects = projectsData || [];
  const [selected, setSelected] = useState<string[]>([]);

  const qs = new URLSearchParams();
  if (selected.length) qs.set("projects", selected.join(","));
  if (dateRange.from) qs.set("from", dateRange.from);
  if (dateRange.to) qs.set("to", dateRange.to);

  const { data: compareData } = useQuery({
    queryKey: ["analytics", "compare", selected, dateRange],
    queryFn: () => api.get(`/analytics/compare?${qs.toString()}`),
    enabled: selected.length >= 2,
  });

  const cd = compareData as ProjectComparisonData | undefined;

  // pivot daily por projeto
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const row of (cd?.daily || [])) {
    const day = row.day.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = {};
    dailyMap[day][row.project] = (dailyMap[day][row.project] || 0) + row.cost_usd;
  }
  const projectNamesInComparison = [...new Set<string>((cd?.daily || []).map((r) => r.project))];
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, costs]) => {
      const filled: Record<string, number> = {};
      for (const name of projectNamesInComparison) filled[name] = costs[name] || 0;
      return { day, ...filled };
    });

  function toggleProject(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  if (projects.length < 2) return null;

  return (
    <Section title="Comparação de Projetos" description="Selecione até 3 projetos para comparar">
      <div className="space-y-4">
        {/* Seleção */}
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <FilterChip
              key={p.id}
              label={p.name}
              active={selected.includes(p.id)}
              onClick={() => toggleProject(p.id)}
              variant="primary"
              disabled={selected.length === 3 && !selected.includes(p.id)}
            />
          ))}
        </div>

        {selected.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-4">Selecione pelo menos 2 projetos</p>
        )}

        {selected.length >= 2 && cd && (
          <>
            {/* Tabela comparativa */}
            <AppTable<SummaryRow>
              rowKey="project_id"
              data={(cd.summary || []).map((row, i) => ({
                ...row,
                _color: CHART_COLORS[i % CHART_COLORS.length],
              }))}
              columns={summaryColumns}
            />

            {/* Gráfico sobrepostos — SVG inline (R8) */}
            {dailyData.length > 0 && (
              <SvgLineChart
                data={dailyData as Array<Record<string, string | number>>}
                xKey="day"
                series={projectNamesInComparison.map((name, i): LineSeries => ({
                  key: name,
                  label: name,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                height={240}
              />
            )}
          </>
        )}
      </div>
    </Section>
  );
}
