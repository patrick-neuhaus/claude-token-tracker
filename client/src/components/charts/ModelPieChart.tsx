import { ModelCostBars } from "./ModelCostBars";

interface Datum {
  model: string;
  cost_usd: number;
}

interface Props {
  data: Datum[];
  /** @deprecated kept for API compat. Ignored. */
  height?: number;
  /** @deprecated kept for API compat. Ignored. */
  innerRadius?: number;
  /** @deprecated kept for API compat. Ignored. */
  outerRadius?: number;
}

/**
 * ModelPieChart — Wave 8.2.4 R8-FIX: was donut, now horizontal bars.
 * Kept name pra API compat; consumers (Session/Project pages) seguem funcionando.
 * height/innerRadius/outerRadius props deprecated (ignored).
 */
export function ModelPieChart({ data }: Props) {
  return <ModelCostBars data={data} maxBars={8} topN={4} />;
}
