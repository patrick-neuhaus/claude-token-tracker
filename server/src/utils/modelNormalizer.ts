/**
 * Normalize a raw model string to a versioned pricing key.
 *
 * Examples:
 *   "claude-opus-4-7"            → "opus-4-7"
 *   "claude-opus-4-7-20260101"   → "opus-4-7"
 *   "claude-3-5-sonnet-20240620" → "sonnet-3-5"
 *   "claude-sonnet-4-6"          → "sonnet-4-6"
 *   "claude-haiku-4-5-20251001"  → "haiku-4-5"
 *
 * Falls back to family ("opus" / "sonnet" / "haiku") if version not extractable.
 */

const FAMILIES = ["opus", "sonnet", "haiku"] as const;
type Family = typeof FAMILIES[number];

function detectFamily(s: string): Family | null {
  for (const f of FAMILIES) if (s.includes(f)) return f;
  return null;
}

/**
 * Extract version like "4-7", "4-5", "3-5" near the family name.
 * Anthropic IDs are flexible: "claude-opus-4-7", "claude-3-5-sonnet-...", etc.
 */
function extractVersion(s: string, family: Family): string | null {
  // Try post-family version: "opus-4-7" or "opus-4-7-20260101"
  const post = new RegExp(`${family}-(\\d+)(?:-(\\d+))?`).exec(s);
  if (post) {
    return post[2] ? `${post[1]}-${post[2]}` : post[1];
  }
  // Try pre-family version: "3-5-sonnet" → "3-5"
  const pre = new RegExp(`(\\d+)(?:-(\\d+))?-${family}`).exec(s);
  if (pre) {
    return pre[2] ? `${pre[1]}-${pre[2]}` : pre[1];
  }
  return null;
}

export function normalizeModel(raw: string): string {
  const lower = raw.toLowerCase();
  const family = detectFamily(lower);
  if (!family) return "sonnet"; // unknown → assume sonnet

  const version = extractVersion(lower, family);
  return version ? `${family}-${version}` : family;
}

export function modelDisplayName(raw: string): string {
  const family = detectFamily(raw.toLowerCase());
  if (!family) return "Sonnet";
  return family.charAt(0).toUpperCase() + family.slice(1);
}
