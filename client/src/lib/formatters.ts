import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const BRT = "America/Sao_Paulo";

export function formatDate(iso: string): string {
  const date = toZonedTime(parseISO(iso), BRT);
  return format(date, "dd/MM/yyyy HH:mm");
}

export function formatUSD(value: number | string): string {
  const n = Number(value) || 0;
  if (Math.abs(n) < 1 && n !== 0) {
    return `$${n.toFixed(4)}`;
  }
  return `$${n.toFixed(2)}`;
}

export function formatBRL(usd: number | string, rate: number | string): string {
  const brl = Number(usd) * Number(rate);
  return brl.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatTokens(n: number | string): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("pt-BR");
}

export function formatNumber(n: number | string): string {
  return Number(n).toLocaleString("pt-BR");
}

export function formatPercent(value: number | string): string {
  return `${Number(value).toFixed(1)}%`;
}

export function formatShortDate(iso: string): string {
  try { return format(parseISO(iso), "dd/MM"); } catch { return iso.slice(5, 10); }
}

export function formatFullDate(iso: string): string {
  try { return format(parseISO(iso), "dd/MM/yyyy"); } catch { return iso.slice(0, 10); }
}
