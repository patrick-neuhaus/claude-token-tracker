/**
 * SVG chart helpers — canonical CRM lift (anti-ai-design-system).
 * Wave 8.2.4 R8 — drop Recharts dependency.
 *
 * Functional helpers for inline SVG charts: scales, paths, ticks, arcs.
 * No state, no DOM — pure data → SVG strings.
 */

/** Linear scale: (value) → pixel position in [r0, r1]. */
export function linearScale(d0: number, d1: number, r0: number, r1: number) {
  if (d1 === d0) return () => (r0 + r1) / 2;
  const k = (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** Categorical scale: (label) → center pixel position in [r0, r1]. */
export function bandScale(items: string[], r0: number, r1: number) {
  const step = (r1 - r0) / items.length;
  return (label: string) => {
    const i = items.indexOf(label);
    if (i < 0) return r0;
    return r0 + step * (i + 0.5);
  };
}

/** Generate ~`count` evenly-spaced "nice" tick values in [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (max <= min) return [min];
  const span = max - min;
  const step = niceStep(span / count);
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exp);
  const norm = rough / base;
  let nice;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return nice * base;
}

/** Build SVG `d` string for line through points. Auto-skips invalid Y. */
export function linePath(points: { x: number; y: number | null | undefined }[]): string {
  let d = "";
  let inSegment = false;
  for (const p of points) {
    if (p.y == null || !Number.isFinite(p.y as number)) {
      inSegment = false;
      continue;
    }
    d += `${inSegment ? "L" : "M"}${p.x.toFixed(2)},${(p.y as number).toFixed(2)} `;
    inSegment = true;
  }
  return d.trim();
}

/** Build SVG `d` string for area under line (closed at baseline y0). */
export function areaPath(points: { x: number; y: number | null | undefined }[], y0: number): string {
  const valid = points.filter((p) => p.y != null && Number.isFinite(p.y as number));
  if (valid.length === 0) return "";
  let d = `M${valid[0].x.toFixed(2)},${y0.toFixed(2)} `;
  for (const p of valid) d += `L${p.x.toFixed(2)},${(p.y as number).toFixed(2)} `;
  d += `L${valid[valid.length - 1].x.toFixed(2)},${y0.toFixed(2)} Z`;
  return d.trim();
}

/** Pie/donut arc segment path. Angles in radians, 0 = top. */
export function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const sa = startAngle - Math.PI / 2;
  const ea = endAngle - Math.PI / 2;
  const x1 = cx + outerR * Math.cos(sa);
  const y1 = cy + outerR * Math.sin(sa);
  const x2 = cx + outerR * Math.cos(ea);
  const y2 = cy + outerR * Math.sin(ea);
  const x3 = cx + innerR * Math.cos(ea);
  const y3 = cy + innerR * Math.sin(ea);
  const x4 = cx + innerR * Math.cos(sa);
  const y4 = cy + innerR * Math.sin(sa);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M${x1.toFixed(2)},${y1.toFixed(2)}`,
    `A${outerR},${outerR} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
    `L${x3.toFixed(2)},${y3.toFixed(2)}`,
    `A${innerR},${innerR} 0 ${large} 0 ${x4.toFixed(2)},${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** Compute pie segments from data: [{value, color, label}, ...] → rendered list. */
export interface PieSegment<T> {
  data: T;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  percent: number;
}

export function computePieSegments<T extends { value: number }>(
  items: T[],
  paddingAngle = 0,
): PieSegment<T>[] {
  const total = items.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total <= 0) return [];
  const out: PieSegment<T>[] = [];
  const totalPad = paddingAngle * items.filter((x) => x.value > 0).length;
  const usable = Math.PI * 2 - totalPad;
  let acc = 0;
  for (const item of items) {
    const v = Math.max(0, item.value);
    if (v <= 0) continue;
    const span = (v / total) * usable;
    const start = acc;
    const end = acc + span;
    out.push({
      data: item,
      startAngle: start,
      endAngle: end,
      midAngle: (start + end) / 2,
      percent: v / total,
    });
    acc = end + paddingAngle;
  }
  return out;
}
