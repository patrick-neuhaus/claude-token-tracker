import fs from "fs/promises";
import path from "path";

// Hard-coded — Patrick é único user; edit trivial se mudar.
const SKILLFORGE_DIR = "C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/skills";
const OMC_DIR = "C:/Users/Patrick Neuhaus/Documents/Github/oh-my-claudecode/skills";
const BUILTIN_CACHE = "C:/Users/Patrick Neuhaus/.claude/plugins/cache";
const FIXES_FILE = "C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/FIXES-APLICADOS.md";

export type SkillSource = "skillforge" | "omc" | "builtin";

export interface SkillSummary {
  name: string;
  description: string;
  lockedAt: string | null;
  fileCount: number;
  category: string | null;
  source: SkillSource;
}

export interface SkillFile {
  path: string;
  type: "file" | "dir";
  size?: number;
}

export interface SkillDetail {
  name: string;
  description: string;
  body: string;
  lockedAt: string | null;
  files: SkillFile[];
  source: SkillSource;
}

// In-memory cache
let cache: {
  listAt: number;
  list?: SkillSummary[];
  locked?: Map<string, string>;
  /** name -> source -> dir (canonical skill dir on disk) */
  index?: Map<string, Map<SkillSource, string>>;
} = { listAt: 0 };
const TTL_MS = 60_000;

function isFresh(ts: number) {
  return Date.now() - ts < TTL_MS;
}

/** Parse YAML frontmatter. Skill.md frontmatter is simple: name + description (sometimes license). */
export function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: content };
  const meta: Record<string, string> = {};
  const lines = m[1].split(/\r?\n/);
  let currentKey: string | null = null;
  let currentVal = "";
  let inQuoted = false;
  let quoteChar = "";
  for (const line of lines) {
    if (inQuoted) {
      currentVal += "\n" + line;
      if (line.trimEnd().endsWith(quoteChar)) {
        meta[currentKey!] = currentVal.replace(new RegExp(`^${quoteChar}|${quoteChar}$`, "g"), "").trim();
        inQuoted = false;
        currentKey = null;
        currentVal = "";
      }
      continue;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();
    if ((val.startsWith('"') || val.startsWith("'")) && !val.slice(1).includes(val[0])) {
      inQuoted = true;
      quoteChar = val[0];
      currentKey = key;
      currentVal = val;
      continue;
    }
    val = val.replace(/^["']|["']$/g, "");
    meta[key] = val;
  }
  if (inQuoted && currentKey) {
    meta[currentKey] = currentVal.replace(new RegExp(`^${quoteChar}|${quoteChar}$`, "g"), "").trim();
  }
  return { meta, body: m[2] };
}

async function parseLockedSkills(): Promise<Map<string, string>> {
  if (cache.locked && isFresh(cache.listAt)) return cache.locked;
  const map = new Map<string, string>();
  try {
    const content = await fs.readFile(FIXES_FILE, "utf-8");
    let lastDate: string | null = null;
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const dateMatch = line.match(/validated:(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) lastDate = dateMatch[1];
      const bulletMatch = line.match(/^\s*-\s+([a-z][a-z0-9-]*)\b/);
      if (bulletMatch && lastDate) {
        map.set(bulletMatch[1], lastDate);
      }
    }
  } catch {
    /* noop */
  }
  return map;
}

/** Hard-coded category map. Covers skillforge + OMC + built-in plugins. */
const CATEGORY_MAP: Record<string, string> = {
  // === Skillforge — meta ===
  maestro: "meta", "skill-builder": "meta", "prompt-engineer": "meta", "context-tree": "meta",
  // === Skillforge — optimization ===
  "geo-optimizer": "optimization", "cli-skill-wrapper": "optimization",
  // === Skillforge — code-review ===
  trident: "code-review", "react-patterns": "code-review", "security-audit": "code-review",
  // === Skillforge — guard ===
  "architecture-guard": "guard", "code-dedup-scanner": "guard", "context-guardian": "guard",
  // === Skillforge — implementation ===
  sdd: "implementation", "component-architect": "implementation", "supabase-db-architect": "implementation",
  "n8n-architect": "implementation", "lovable-router": "implementation", "lovable-knowledge": "implementation",
  // === Skillforge — design ===
  "ui-design-system": "design", "design-system-audit": "design", "ux-audit": "design",
  "product-discovery-prd": "design", "test-lab-architect": "design", seo: "design",
  // === Skillforge — knowledge ===
  "reference-finder": "knowledge", "pattern-importer": "knowledge",
  // === Built-in Anthropic — content ===
  pdf: "content", docx: "content", pptx: "content", xlsx: "content",
  // === Skillforge — infra/people/meeting/workflow ===
  "vps-infra-audit": "infra",
  "tech-lead-pm": "people", "comunicacao-clientes": "people",
  "meeting-sync": "meeting", schedule: "workflow",
  // === Skillforge — marketing ===
  copy: "marketing", "product-marketing-context": "marketing", "ai-seo": "marketing",
  "site-architecture": "marketing", "competitor-alternatives": "marketing",
  "sales-enablement": "marketing", "free-tool-strategy": "marketing", "launch-strategy": "marketing",
  // === OMC — workflow (loops, autopilots, orchestration) ===
  autopilot: "workflow", ralph: "workflow", ralplan: "workflow", "deepinit": "workflow",
  ccg: "workflow", "omc-teams": "workflow", "deep-interview": "workflow",
  // === OMC — meta (skill management, self-improve) ===
  skill: "meta", skillify: "meta", "self-improve": "meta", remember: "meta",
  "project-session-manager": "meta", "external-context": "meta",
  // === OMC — code-review / guard ===
  "ai-slop-cleaner": "guard", "omc-doctor": "guard",
  // === OMC — knowledge / interactive ===
  ask: "knowledge", "deep-dive": "knowledge", learner: "knowledge", "omc-reference": "knowledge",
  sciomc: "knowledge",
  // === OMC — implementation ===
  debug: "implementation", plan: "implementation", release: "implementation",
  // === OMC — workflow control ===
  cancel: "workflow", "configure-notifications": "workflow", hud: "workflow",
  setup: "workflow", "omc-setup": "workflow", "mcp-setup": "workflow",
  // === Caveman built-in ===
  caveman: "meta", "caveman-commit": "implementation", "caveman-help": "knowledge",
  "caveman-review": "code-review", "caveman-compress": "optimization", compress: "optimization",
};

/** Keyword heuristic fallback when name not in map. Scans description. */
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/(skill|prompt|context.window|orchestrat|router)/i, "meta"],
  [/(review|audit|lint|security|vulnerab)/i, "code-review"],
  [/(implement|architect|build|design.system|component|database|schema|n8n)/i, "implementation"],
  [/(workflow|automat|loop|pipeline|autonomous|orchestr)/i, "workflow"],
  [/(market|copy|seo|launch|sales|landing|pitch)/i, "marketing"],
  [/(meeting|transcript|standup|daily)/i, "meeting"],
  [/(reference|knowledge|research|find|catalog|pattern)/i, "knowledge"],
  [/(communicat|whatsapp|telegram|email)/i, "people"],
  [/(vps|server|deploy|docker|infra)/i, "infra"],
  [/(pdf|docx|pptx|xlsx|document|spreadsheet|presentation)/i, "content"],
];

function inferCategory(name: string, description?: string): string | null {
  if (CATEGORY_MAP[name]) return CATEGORY_MAP[name];
  if (description) {
    for (const [re, cat] of CATEGORY_KEYWORDS) {
      if (re.test(description)) return cat;
    }
  }
  return null;
}

async function countFilesRecursive(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) count += await countFilesRecursive(path.join(dir, e.name));
      else count += 1;
    }
  } catch {
    /* noop */
  }
  return count;
}

interface RawSkillEntry {
  dirName: string; // folder name on disk
  fullDir: string; // absolute path
  source: SkillSource;
}

/** Scan a flat dir of skill folders (skillforge + omc share this layout). */
async function scanFlatDir(baseDir: string, source: SkillSource): Promise<RawSkillEntry[]> {
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const out: RawSkillEntry[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      out.push({ dirName: e.name, fullDir: path.join(baseDir, e.name), source });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Built-in plugins live at:
 *   cache/<plugin>/<repo>/<version-or-hash>/skills/<name>/SKILL.md
 * Find that canonical `skills/` dir. Skip duplicates in `.cursor/`, `.windsurf/`, `plugins/`.
 */
async function scanBuiltinPlugins(): Promise<RawSkillEntry[]> {
  const out: RawSkillEntry[] = [];
  let plugins: { name: string }[] = [];
  try {
    plugins = (await fs.readdir(BUILTIN_CACHE, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name }));
  } catch {
    return out;
  }
  for (const plugin of plugins) {
    // cache/<plugin>/<repo>/<version>/skills/
    const pluginRoot = path.join(BUILTIN_CACHE, plugin.name);
    let repos: string[] = [];
    try {
      repos = (await fs.readdir(pluginRoot, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      continue;
    }
    for (const repo of repos) {
      const repoRoot = path.join(pluginRoot, repo);
      let versions: string[] = [];
      try {
        versions = (await fs.readdir(repoRoot, { withFileTypes: true }))
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
      } catch {
        continue;
      }
      // Pick latest version dir alphabetically (works for semver + commit hashes alike when a single one exists)
      const version = versions.sort().reverse()[0];
      if (!version) continue;
      const skillsDir = path.join(repoRoot, version, "skills");
      try {
        const skillEntries = await fs.readdir(skillsDir, { withFileTypes: true });
        for (const e of skillEntries) {
          if (!e.isDirectory()) continue;
          out.push({ dirName: e.name, fullDir: path.join(skillsDir, e.name), source: "builtin" });
        }
      } catch {
        /* no canonical skills dir, skip */
      }
    }
  }
  return out;
}

async function buildSummaryFromEntry(
  entry: RawSkillEntry,
  locked: Map<string, string>,
): Promise<SkillSummary | null> {
  const skillMd = path.join(entry.fullDir, "SKILL.md");
  try {
    const content = await fs.readFile(skillMd, "utf-8");
    const { meta } = parseFrontmatter(content);
    const fileCount = await countFilesRecursive(entry.fullDir);
    return {
      name: meta.name || entry.dirName,
      description: meta.description || "",
      lockedAt: locked.get(entry.dirName) || null,
      fileCount,
      category: inferCategory(entry.dirName, meta.description),
      source: entry.source,
    };
  } catch {
    return null;
  }
}

export async function listSkills(): Promise<SkillSummary[]> {
  if (cache.list && isFresh(cache.listAt)) return cache.list;

  const locked = await parseLockedSkills();

  const [skillforgeRaw, omcRaw, builtinRaw] = await Promise.all([
    scanFlatDir(SKILLFORGE_DIR, "skillforge"),
    scanFlatDir(OMC_DIR, "omc"),
    scanBuiltinPlugins(),
  ]);

  // Dedup with precedence skillforge > omc > builtin (by skill name).
  const seen = new Map<string, RawSkillEntry>();
  for (const list of [skillforgeRaw, omcRaw, builtinRaw]) {
    for (const e of list) {
      if (!seen.has(e.dirName)) seen.set(e.dirName, e);
    }
  }

  // Build full source index (so getSkill can find a name in any source even after dedup)
  const index = new Map<string, Map<SkillSource, string>>();
  for (const list of [skillforgeRaw, omcRaw, builtinRaw]) {
    for (const e of list) {
      if (!index.has(e.dirName)) index.set(e.dirName, new Map());
      const inner = index.get(e.dirName)!;
      if (!inner.has(e.source)) inner.set(e.source, e.fullDir);
    }
  }

  const summaries: SkillSummary[] = [];
  for (const entry of seen.values()) {
    const s = await buildSummaryFromEntry(entry, locked);
    if (s) summaries.push(s);
  }

  summaries.sort((a, b) => a.name.localeCompare(b.name));
  cache = { listAt: Date.now(), list: summaries, locked, index };
  return summaries;
}

/** Resolve the on-disk dir for a skill name + optional source. */
async function resolveSkillDir(name: string, source?: SkillSource): Promise<{ dir: string; source: SkillSource } | null> {
  if (!cache.index || !isFresh(cache.listAt)) await listSkills();
  const inner = cache.index?.get(name);
  if (!inner || inner.size === 0) return null;
  if (source && inner.has(source)) {
    return { dir: inner.get(source)!, source };
  }
  // Fallback precedence
  for (const s of ["skillforge", "omc", "builtin"] as SkillSource[]) {
    if (inner.has(s)) return { dir: inner.get(s)!, source: s };
  }
  return null;
}

async function listFilesRecursive(baseDir: string, currentDir: string): Promise<SkillFile[]> {
  const files: SkillFile[] = [];
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relative = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      files.push({ path: relative, type: "dir" });
      const sub = await listFilesRecursive(baseDir, fullPath);
      files.push(...sub);
    } else {
      let size: number | undefined;
      try {
        const stat = await fs.stat(fullPath);
        size = stat.size;
      } catch {
        /* noop */
      }
      files.push({ path: relative, type: "file", size });
    }
  }
  return files;
}

export async function getSkill(name: string, source?: SkillSource): Promise<SkillDetail | null> {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return null;
  const resolved = await resolveSkillDir(name, source);
  if (!resolved) return null;
  const skillMd = path.join(resolved.dir, "SKILL.md");
  let content: string;
  try {
    content = await fs.readFile(skillMd, "utf-8");
  } catch {
    return null;
  }
  const { meta, body } = parseFrontmatter(content);
  const locked = await parseLockedSkills();
  const files = await listFilesRecursive(resolved.dir, resolved.dir);
  return {
    name: meta.name || name,
    description: meta.description || "",
    body,
    lockedAt: locked.get(name) || null,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    source: resolved.source,
  };
}

export async function getSkillFile(
  name: string,
  relativePath: string,
  source?: SkillSource,
): Promise<string | null> {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return null;
  const resolved = await resolveSkillDir(name, source);
  if (!resolved) return null;
  const skillDir = path.resolve(resolved.dir);
  const fullPath = path.resolve(skillDir, relativePath);
  if (!fullPath.startsWith(skillDir)) return null; // traversal blocked
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }
}
