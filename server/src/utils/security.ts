/**
 * Security helpers — log sanitization etc.
 *
 * Wave B6.7 (Trident BUG-12+13): keep PII out of structured logs.
 */

/**
 * Mask an email so the log shows enough to debug without leaking the address.
 * `john.doe@gmail.com` -> `j**@gmail.com`. Falsy / malformed input is tagged
 * as `<no-email>` / `<invalid-email>` so downstream parsing still works.
 */
export function maskEmail(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) return "<no-email>";
  const at = raw.indexOf("@");
  if (at < 1) return "<invalid-email>";
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const head = local[0];
  return `${head}**@${domain}`;
}

/** Compact representation of an unknown error for logs (no full message). */
export function describeError(err: unknown): { name: string; code?: string } {
  if (err && typeof err === "object") {
    const name = (err as { name?: string }).name || err.constructor?.name || "Error";
    const code = (err as { code?: string | number }).code;
    return code !== undefined ? { name, code: String(code) } : { name };
  }
  return { name: typeof err };
}
