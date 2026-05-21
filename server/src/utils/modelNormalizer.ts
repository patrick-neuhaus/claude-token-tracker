/**
 * Normalize raw model strings to pricing keys.
 *
 * Examples:
 *   "gpt-5.5"                    -> "gpt-5.5"
 *   "gpt-5.4-mini"               -> "gpt-5.4-mini"
 *   "gpt-5.3-codex"              -> "gpt-5.3-codex"
 *   "claude-opus-4-7"            -> "opus-4-7"
 *   "claude-3-5-sonnet-20240620" -> "sonnet-3-5"
 */

const CLAUDE_FAMILIES = ["opus", "sonnet", "haiku"] as const;
type ClaudeFamily = typeof CLAUDE_FAMILIES[number];

function detectClaudeFamily(s: string): ClaudeFamily | null {
  for (const f of CLAUDE_FAMILIES) if (s.includes(f)) return f;
  return null;
}

function extractClaudeVersion(s: string, family: ClaudeFamily): string | null {
  const post = new RegExp(`${family}-(\\d+)(?:-(\\d+))?`).exec(s);
  if (post) return post[2] ? `${post[1]}-${post[2]}` : post[1] ?? null;

  const pre = new RegExp(`(\\d+)(?:-(\\d+))?-${family}`).exec(s);
  if (pre) return pre[2] ? `${pre[1]}-${pre[2]}` : pre[1] ?? null;

  return null;
}

function normalizeGptModel(s: string): string | null {
  const match = s.match(/gpt[-_]?(\d+(?:\.\d+)?)(?:[-_]?((?:mini|nano|pro|codex)))?/);
  if (!match) return null;
  const version = match[1];
  const suffix = match[2] ? `-${match[2]}` : "";
  return `gpt-${version}${suffix}`;
}

export function normalizeModel(raw: string): string {
  const lower = raw.toLowerCase();

  const gpt = normalizeGptModel(lower);
  if (gpt) return gpt;

  const family = detectClaudeFamily(lower);
  if (!family) return "gpt-5";

  const version = extractClaudeVersion(lower, family);
  return version ? `${family}-${version}` : family;
}

export function modelDisplayName(raw: string): string {
  const lower = raw.toLowerCase();
  const gpt = normalizeGptModel(lower);
  if (gpt) return gpt.toUpperCase();

  const family = detectClaudeFamily(lower);
  if (!family) return "GPT-5";
  return family.charAt(0).toUpperCase() + family.slice(1);
}
