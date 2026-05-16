import { SOURCE_COLORS, displayLabel } from "@/lib/constants";
import { surface, surfaceHeader, surfaceContent } from "@/lib/surface";
import { SvgPieDonut, type PieDatum } from "@/components/charts/SvgPieDonut";

interface SourceData {
  source: string;
  cost_usd: number;
}

interface Props {
  data: SourceData[];
}

/**
 * CostBySourceChart — Wave 8.2.4 R8: SVG inline migration.
 * Source label kebab→Title Case via displayLabel.
 */
export function CostBySourceChart({ data }: Props) {
  const pieData: PieDatum[] = data.map((d) => ({
    label: displayLabel(d.source),
    value: d.cost_usd,
    color: SOURCE_COLORS[d.source] || "hsl(var(--muted-foreground))",
  }));

  return (
    <div className={surface.section}>
      <div className={surfaceHeader}>
        <h3 className="text-sm font-medium">Custo por Fonte</h3>
      </div>
      <div className={surfaceContent}>
        <SvgPieDonut data={pieData} height={250} />
      </div>
    </div>
  );
}
