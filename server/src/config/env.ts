import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  BCRYPT_COST: parseInt(process.env.BCRYPT_COST ?? "12", 10),
  PORT: parseInt(process.env.PORT || "3002", 10),
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
  // SMTP (transactional emails — Brevo). All optional: if unset, emailService
  // falls back to console log of the email envelope.
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  APP_BASE_URL: process.env.APP_BASE_URL,
  // SECURITY: bootstrap gate for first-user-becomes-super_admin flow.
  // If set, only this email can become super_admin on first /register.
  // If unset, first registered user becomes super_admin (UNSAFE in public deploys).
  // See authService.registerUser for enforcement + warning.
  BOOTSTRAP_SUPER_ADMIN_EMAIL: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL,
  // Comma-separated list of CORS allowed origins. If unset, defaults to
  // http://localhost:3002,http://localhost:5173 (dev). Override in prod.
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
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

// Validate BCRYPT_COST range (10-14 recommended). Warn outside range; refuse parse-NaN.
if (!Number.isInteger(env.BCRYPT_COST) || Number.isNaN(env.BCRYPT_COST)) {
  console.error(
    `[security] BCRYPT_COST invalid (got '${process.env.BCRYPT_COST}'). Must be integer 10-14.`
  );
  process.exit(1);
}
if (env.BCRYPT_COST < 10 || env.BCRYPT_COST > 14) {
  console.warn(
    `[security] BCRYPT_COST=${env.BCRYPT_COST} outside recommended range 10-14. <10 = unsafe; >14 = slow on common hardware.`
  );
}

// SECURITY: warn if BOOTSTRAP_SUPER_ADMIN_EMAIL gate is missing.
// Without it, the first user to hit /register becomes super_admin — unsafe in
// any public deploy. See authService.registerUser for runtime enforcement.
if (!env.BOOTSTRAP_SUPER_ADMIN_EMAIL) {
  console.warn(
    "[BOOTSTRAP] BOOTSTRAP_SUPER_ADMIN_EMAIL not set. First user to /register will receive super_admin role. UNSAFE in public deploys — set this env var to restrict bootstrap to a single email."
  );
}
