import fs from "fs/promises";
import path from "path";

// Hard-coded — Patrick é único user; edit trivial se mudar.
const SKILLS_DIR = "C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/skills";
const FIXES_FILE = "C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/FIXES-APLICADOS.md";

export interface SkillSummary {
  name: string;
  description: string;
  lockedAt: string | null;
  fileCount: number;
  category: string | null;
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
}

// In-memory cache
let cache: { listAt: number; list?: SkillSummary[]; locked?: Map<string, string> } = { listAt: 0 };
const TTL_MS = 60_000;

function isFresh(ts: number) {
  return Date.now() - ts < TTL_MS;
}

/** Parse YAML frontmatter. Skill.md frontmatter is simple: name + description (sometimes license). */
export function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: content };
  const meta: Record<string, string> = {};
  // Multi-line aware: handle quoted strings spanning lines is rare, but values often span if quoted
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
      // multi-line quoted starts
      inQuoted = true;
      quoteChar = val[0];
      currentKey = key;
      currentVal = val;
      continue;
    }
    val = val.replace(/^["']|["']$/g, "");
    meta[key] = val;
  }
  // Handle case where a quoted value never closed (single-line quote that was self-closed)
  if (inQuoted && currentKey) {
    meta[currentKey] = currentVal.replace(new RegExp(`^${quoteChar}|${quoteChar}$`, "g"), "").trim();
  }
  return { meta, body: m[2] };
}

/** Parse FIXES-APLICADOS.md to extract validated:DATE markers per skill name. */
async function parseLockedSkills(): Promise<Map<string, string>> {
  if (cache.locked && isFresh(cache.listAt)) return cache.locked;
  const map = new Map<string, string>();
  try {
    const content = await fs.readFile(FIXES_FILE, "utf-8");
    // Find sections referencing "validated:YYYY-MM-DD" with a date and look for skill name lists
    const dateRegex = /validated:(\d{4}-\d{2}-\d{2})/g;
    let lastDate: string | null = null;
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const dateMatch = line.match(/validated:(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) lastDate = dateMatch[1];
      // Bullet list items: "- skill-name" or "- skill-name:" or "- skill-name —" etc
      const bulletMatch = line.match(/^\s*-\s+([a-z][a-z0-9-]*)\b/);
      if (bulletMatch && lastDate) {
        // Only register if it's a known skill (skip generic bullets) — verified later by listSkills filter
        map.set(bulletMatch[1], lastDate);
      }
    }
    void dateRegex; // silence unused
  } catch {
    // FIXES-APLICADOS.md may not exist — silent fallback
  }
  return map;
}

/** Heuristic categorization based on skill name. Mirrors maestro Phase 1 routing table. */
function inferCategory(name: string): string | null {
  const map: Record<string, string> = {
    maestro: "meta", "skill-builder": "meta", "prompt-engineer": "meta", "context-tree": "meta",
    "geo-optimizer": "optimization", "cli-skill-wrapper": "optimization",
    trident: "code-review", "react-patterns": "code-review", "security-audit": "code-review",
    "architecture-guard": "guard", "code-dedup-scanner": "guard", "context-guardian": "guard",
    sdd: "implementation", "component-architect": "implementation", "supabase-db-architect": "implementation",
    "n8n-architect": "implementation", "lovable-router": "implementation", "lovable-knowledge": "implementation",
    "ui-design-system": "design", "design-system-audit": "design", "ux-audit": "design",
    "product-discovery-prd": "design", "test-lab-architect": "design", seo: "design",
    "reference-finder": "knowledge", "pattern-importer": "knowledge",
    pdf: "content", docx: "content", pptx: "content", xlsx: "content",
    "vps-infra-audit": "infra",
    "tech-lead-pm": "people", "comunicacao-clientes": "people",
    "meeting-sync": "meeting", schedule: "workflow",
    copy: "marketing", "product-marketing-context": "marketing", "ai-seo": "marketing",
    "site-architecture": "marketing", "competitor-alternatives": "marketing",
    "sales-enablement": "marketing", "free-tool-strategy": "marketing", "launch-strategy": "marketing",
  };
  return map[name] || null;
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

export async function listSkills(): Promise<SkillSummary[]> {
  if (cache.list && isFresh(cache.listAt)) return cache.list;

  const locked = await parseLockedSkills();
  const dirEntries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
  const skills: SkillSummary[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(SKILLS_DIR, entry.name);
    const skillMd = path.join(skillDir, "SKILL.md");
    try {
      const content = await fs.readFile(skillMd, "utf-8");
      const { meta } = parseFrontmatter(content);
      const fileCount = await countFilesRecursive(skillDir);
      skills.push({
        name: meta.name || entry.name,
        description: meta.description || "",
        lockedAt: locked.get(entry.name) || null,
        fileCount,
        category: inferCategory(entry.name),
      });
    } catch {
      // Skip dirs without SKILL.md
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  cache = { listAt: Date.now(), list: skills, locked };
  return skills;
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

export async function getSkill(name: string): Promise<SkillDetail | null> {
  // Validate name to prevent traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return null;
  const skillDir = path.join(SKILLS_DIR, name);
  const skillMd = path.join(skillDir, "SKILL.md");
  let content: string;
  try {
    content = await fs.readFile(skillMd, "utf-8");
  } catch {
    return null;
  }
  const { meta, body } = parseFrontmatter(content);
  const locked = await parseLockedSkills();
  const files = await listFilesRecursive(skillDir, skillDir);
  return {
    name: meta.name || name,
    description: meta.description || "",
    body,
    lockedAt: locked.get(name) || null,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export async function getSkillFile(name: string, relativePath: string): Promise<string | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return null;
  // Resolve and ensure the resulting path stays within the skill dir
  const skillDir = path.resolve(SKILLS_DIR, name);
  const fullPath = path.resolve(skillDir, relativePath);
  if (!fullPath.startsWith(skillDir)) return null; // traversal blocked
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }
}
