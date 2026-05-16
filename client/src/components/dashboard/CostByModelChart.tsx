import { Section } from "@/components/shared/Section";
import { ModelCostBars } from "@/components/charts/ModelCostBars";

interface ModelData {
  model: string;
  cost_usd: number;
}

interface Props {
  data: ModelData[];
}

/**
 * CostByModelChart — Wave 8.2.4 R8-FIX: horizontal bars (was donut).
 * Every model visible, no 0.0% lies. Top 4 cores distintas, resto muted.
 */
export function CostByModelChart({ data }: Props) {
  return (
    <Section title="Custo por Modelo">
      <ModelCostBars data={data} maxBars={10} topN={4} />
    </Section>
  );
}
