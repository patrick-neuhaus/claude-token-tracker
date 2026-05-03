import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Section } from "@/components/shared/Section";
import { FilterChip } from "@/components/shared/FilterChip";
import { useProjects } from "@/hooks/useProjects";
import { formatUSD, formatTokens, formatNumber, formatShortDate } from "@/lib/formatters";
import { CHART_COLORS } from "@/lib/constants";
import { TOOLTIP_PROPS } from "@/lib/chartConfig";
import type { ProjectComparisonData } from "@/lib/types";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

interface Props {
  dateRange: { from?: string; to?: string };
}

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
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, costs]) => ({ day, ...costs }));
  const projectNamesInComparison = [...new Set<string>((cd?.daily || []).map((r) => r.project))];

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
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-3 font-medium">Projeto</th>
                    <th className="text-right p-3 font-medium">Custo total</th>
                    <th className="text-right p-3 font-medium">Sessões</th>
                    <th className="text-right p-3 font-medium">Tokens</th>
                    <th className="text-right p-3 font-medium">Custo/sessão</th>
                  </tr>
                </thead>
                <tbody>
                  {(cd.summary || []).map((row, i) => (
                    <tr key={row.project_id} className="border-b last:border-0">
                      <td className="p-3 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {row.project}
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">{formatUSD(row.total_cost_usd)}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(row.session_count)}</td>
                      <td className="p-3 text-right tabular-nums">{formatTokens(row.total_tokens)}</td>
                      <td className="p-3 text-right tabular-nums">{formatUSD(row.cost_per_session)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gráfico sobrepostos */}
            {dailyData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} width={56} />
                  <Tooltip formatter={(v) => formatUSD(Number(v))} labelFormatter={(v) => formatShortDate(String(v))} {...TOOLTIP_PROPS} />
                  <Legend />
                  {projectNamesInComparison.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} dot={false} strokeWidth={2} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
