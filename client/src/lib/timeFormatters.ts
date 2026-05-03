/**
 * Time formatting + date input helpers extracted from SessionTimePage.
 *
 * `formatDuration(s)` → human-readable "Xh Ym" / "Xm" / "Xs" / "0m".
 * `toDateInputValue(d)` → "YYYY-MM-DD" using LOCAL timezone (Windows clock).
 * `dayStartIso(s)` / `dayEndIso(s)` → start/end of day in local timezone as ISO.
 */

export function formatDuration(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  if (s === 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayStartIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 0, 0, 0, 0);
  return local.toISOString();
}

export function dayEndIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 23, 59, 59, 999);
  return local.toISOString();
}
