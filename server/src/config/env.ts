import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  PORT: parseInt(process.env.PORT || "3001", 10),
  // Filesystem paths for skills + system-prompts services.
  // Defaults match Patrick's machine; override via .env on other deployments.
  SKILLFORGE_DIR:
    process.env.SKILLFORGE_DIR ||
    "C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/skills",
  OMC_DIR:
    process.env.OMC_DIR ||
    "C:/Users/Patrick Neuhaus/Documents/Github/oh-my-claudecode/skills",
  BUILTIN_CACHE:
    process.env.BUILTIN_CACHE ||
    "C:/Users/Patrick Neuhaus/.claude/plugins/cache",
  FIXES_FILE:
    process.env.FIXES_FILE ||
    "C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/FIXES-APLICADOS.md",
  GITHUB_ROOT_CLAUDE_MD:
    process.env.GITHUB_ROOT_CLAUDE_MD ||
    "C:/Users/Patrick Neuhaus/Documents/Github/CLAUDE.md",
  SKILLFORGE_CLAUDE_MD:
    process.env.SKILLFORGE_CLAUDE_MD ||
    "C:/Users/Patrick Neuhaus/Documents/Github/skillforge-arsenal/CLAUDE.md",
  OMC_CLAUDE_MD:
    process.env.OMC_CLAUDE_MD ||
    "C:/Users/Patrick Neuhaus/Documents/Github/oh-my-claudecode/CLAUDE.md",
  TOKEN_TRACKER_CLAUDE_MD:
    process.env.TOKEN_TRACKER_CLAUDE_MD ||
    "C:/Users/Patrick Neuhaus/Documents/Github/claude-token-tracker/CLAUDE.md",
  CLAUDE_RULES_DIR:
    process.env.CLAUDE_RULES_DIR ||
    "C:/Users/Patrick Neuhaus/.claude/rules",
};

const required = ["DATABASE_URL", "JWT_SECRET"] as const;
for (const key of required) {
  if (!env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

// SECURITY: reject placeholder JWT_SECRET (BUG-01).
// .env.example ships "change-me-to-a-random-string-at-least-32-chars" — if anyone
// deploys without rotating, attackers reading the public repo can forge any token.
const PLACEHOLDER_PATTERNS = [
  /^change-me/i,
  /^your-secret/i,
  /^secret$/i,
  /^changeme$/i,
];

if (env.JWT_SECRET.length < 32) {
  console.error(
    `[security] JWT_SECRET too short (${env.JWT_SECRET.length} chars). Minimum 32. Generate via: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
  );
  process.exit(1);
}

if (PLACEHOLDER_PATTERNS.some((re) => re.test(env.JWT_SECRET))) {
  console.error(
    `[security] JWT_SECRET still set to .env.example placeholder. Rotate before starting. Generate via: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
  );
  process.exit(1);
}
