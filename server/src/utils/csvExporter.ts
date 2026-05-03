/**
 * Pure CSV serialization helpers (no Express coupling).
 *
 * Quote rules: a field is wrapped in double-quotes if it contains a comma,
 * double-quote, or newline. Embedded double-quotes are escaped by doubling them
 * (RFC 4180).
 */

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/** Headers for the entries export, in canonical column order. */
export const ENTRIES_CSV_HEADERS = [
  "timestamp",
  "source",
  "model",
  "input_tokens",
  "output_tokens",
  "cache_read",
  "cache_write",
  "total_tokens",
  "cost_usd",
  "session_id",
  "session_name",
  "conversation_url",
] as const;

/** Serialize entry rows (matching ENTRIES_CSV_HEADERS) into a CSV string. */
export function serializeEntriesToCsv(rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [ENTRIES_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(ENTRIES_CSV_HEADERS.map((h) => escapeCsvCell(row[h])).join(","));
  }
  return lines.join("\n");
}
