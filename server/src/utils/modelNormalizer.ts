const MODEL_FAMILIES: [string, string][] = [
  ["opus", "opus"],
  ["sonnet", "sonnet"],
  ["haiku", "haiku"],
];

export function normalizeModel(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [keyword, family] of MODEL_FAMILIES) {
    if (lower.includes(keyword)) return family;
  }
  return "sonnet"; // fallback
}

export function modelDisplayName(raw: string): string {
  const family = normalizeModel(raw);
  return family.charAt(0).toUpperCase() + family.slice(1);
}
