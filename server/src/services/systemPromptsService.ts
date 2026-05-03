import fs from "fs/promises";
import path from "path";
import { env } from "../config/env.js";
import { isFresh } from "../utils/ttlCache.js";

interface FixedSource {
  kind: "file";
  id: string;
  label: string;
  path: string;
}

interface GlobSource {
  kind: "glob";
  idPrefix: string;
  labelPrefix: string;
  dir: string;
  pattern: RegExp; // applied to filename
}

type Source = FixedSource | GlobSource;

// Source list driven by env (defaults in env.ts match Patrick's machine).
const SOURCES: Source[] = [
  {
    kind: "file",
    id: "github-root",
    label: "Github root CLAUDE.md",
    path: env.GITHUB_ROOT_CLAUDE_MD,
  },
  {
    kind: "file",
    id: "skillforge-claude",
    label: "Skillforge CLAUDE.md",
    path: env.SKILLFORGE_CLAUDE_MD,
  },
  {
    kind: "file",
    id: "omc-claude",
    label: "OMC CLAUDE.md",
    path: env.OMC_CLAUDE_MD,
  },
  {
    kind: "file",
    id: "claude-token-tracker-claude",
    label: "Claude Token Tracker CLAUDE.md",
    path: env.TOKEN_TRACKER_CLAUDE_MD,
  },
  {
    kind: "glob",
    idPrefix: "rules-",
    labelPrefix: "Rules: ",
    dir: env.CLAUDE_RULES_DIR,
    pattern: /\.md$/i,
  },
];

export interface SystemPromptSummary {
  id: string;
  label: string;
  path: string;
  exists: boolean;
  lineCount: number;
  lastModified: string | null; // ISO string
  bytes: number;
}

export interface SystemPromptDetail extends SystemPromptSummary {
  body: string;
}

interface CacheEntry {
  at: number;
  data: SystemPromptSummary[];
}

let listCache: CacheEntry | null = null;
const TTL_MS = 60_000;

async function statFile(p: string): Promise<{ exists: boolean; lineCount: number; lastModified: string | null; bytes: number; body?: string }> {
  try {
    const body = await fs.readFile(p, "utf-8");
    const stat = await fs.stat(p);
    return {
      exists: true,
      lineCount: body.split(/\r?\n/).length,
      lastModified: stat.mtime.toISOString(),
      bytes: stat.size,
      body,
    };
  } catch {
    return { exists: false, lineCount: 0, lastModified: null, bytes: 0 };
  }
}

async function expandSources(): Promise<{ id: string; label: string; path: string }[]> {
  const out: { id: string; label: string; path: string }[] = [];
  for (const s of SOURCES) {
    if (s.kind === "file") {
      out.push({ id: s.id, label: s.label, path: s.path });
    } else {
      try {
        const entries = await fs.readdir(s.dir, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isFile()) continue;
          if (!s.pattern.test(e.name)) continue;
          const baseName = e.name.replace(/\.md$/i, "");
          out.push({
            id: `${s.idPrefix}${baseName}`,
            label: `${s.labelPrefix}${baseName}`,
            path: path.join(s.dir, e.name).replace(/\\/g, "/"),
          });
        }
      } catch {
        /* glob dir missing — skip */
      }
    }
  }
  return out;
}

export async function listSystemPrompts(): Promise<SystemPromptSummary[]> {
  if (listCache && isFresh(listCache.at, TTL_MS)) return listCache.data;
  const expanded = await expandSources();
  const out: SystemPromptSummary[] = [];
  for (const src of expanded) {
    const meta = await statFile(src.path);
    out.push({
      id: src.id,
      label: src.label,
      path: src.path,
      exists: meta.exists,
      lineCount: meta.lineCount,
      lastModified: meta.lastModified,
      bytes: meta.bytes,
    });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  listCache = { at: Date.now(), data: out };
  return out;
}

export async function getSystemPrompt(id: string): Promise<SystemPromptDetail | null> {
  // Validate id (alnum + dash + dot)
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) return null;
  const expanded = await expandSources();
  const src = expanded.find((s) => s.id === id);
  if (!src) return null;
  const meta = await statFile(src.path);
  if (!meta.exists) return null;
  return {
    id: src.id,
    label: src.label,
    path: src.path,
    exists: true,
    lineCount: meta.lineCount,
    lastModified: meta.lastModified,
    bytes: meta.bytes,
    body: meta.body || "",
  };
}
