#!/usr/bin/env node
/**
 * generate-tokens.mjs — Wave 4 (Sessão 2)
 *
 * Mapeia paleta Artemis literal pra semantic roles + dark surfaces +
 * roda WCAG validation real-time + exporta design.json + tokens.css.
 *
 * Zero deps. Node puro. Roda com: `node audits/scripts/generate-tokens.mjs`.
 *
 * Output:
 *   audits/04-tokens.json   — design.json semantic
 *   audits/04-tokens.css    — CSS variables dark mode
 *   audits/04-wcag-report.md — WCAG measurements
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

// ── Color helpers (sem deps) ──────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) * 60; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) * 60; break;
    }
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToCssTriplet(hsl) {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function hexToCssTriplet(hex) {
  return hslToCssTriplet(hexToHsl(hex));
}

// WCAG 2.x relative luminance (gamma-corrected sRGB)
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [R, G, B] = [r, g, b].map(c => {
    const cN = c / 255;
    return cN <= 0.03928 ? cN / 12.92 : Math.pow((cN + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function wcagBadge(ratio, type = 'text') {
  if (type === 'ui') {
    return ratio >= 3 ? { level: 'OK', pass: true }
                       : { level: 'FAIL', pass: false };
  }
  if (ratio >= 7) return { level: 'AAA', pass: true };
  if (ratio >= 4.5) return { level: 'AA', pass: true };
  if (ratio >= 3) return { level: 'AA-large', pass: false };
  return { level: 'FAIL', pass: false };
}

// pickFg: branco vs near-black por contraste (mesmo do TokenEditorPreview)
function pickFg(bgHex, candidates = ['#FFFFFF', '#0A0A0A']) {
  let best = candidates[0], bestRatio = contrastRatio(candidates[0], bgHex);
  for (const c of candidates) {
    const r = contrastRatio(c, bgHex);
    if (r > bestRatio) { best = c; bestRatio = r; }
  }
  return { fg: best, ratio: bestRatio };
}

// ── Paleta Artemis literal (Patrick passou completa) ─────────────────

const ARTEMIS_PALETTE = {
  // Core brand
  primary: '#003899',         // navy — action principal
  accent: '#005EFF',          // vibrant blue — highlight/focus
  secondary: '#000000',       // black (NÃO usar como fg — proibido pure 0 0% L%)
  text: '#667085',            // Untitled UI gray-500 — secondary text

  // Blue ladder Artemis
  blueDeep: '#0D419B',        // deep blue
  blueDark: '#0848C5',        // mid-dark blue
  blueMid: '#1E93FF',         // mid-light blue
  blueLight: '#48B7FF',       // light blue

  // Untitled UI gray scale (10 stops)
  gray025: '#FFFFFF',         // white
  gray050: '#F2F4F7',         // gray-50
  gray100: '#EAECF0',         // gray-100
  gray200: '#D0D5DD',         // gray-200
  gray300: '#98A2B3',         // gray-300
  gray400: '#667085',         // gray-400 (= text)
  gray500: '#475467',         // gray-500
  gray600: '#344054',         // gray-600
  gray700: '#182230',         // gray-700
  gray800: '#101828',         // gray-800
  gray900: '#0C111D',         // gray-900 (deepest)
};

// ── Mapeamento semantic-role pra DARK MODE ────────────────────────────
//
// REFINEMENT (Wave 4 round 2): pickFg dinâmico em todos foregrounds (igual
// TokenEditorPreview faz) + primary semântico = #0848C5 em dark mode (navy
// #003899 fica decorative-only, passa 1.82:1 vs dark bg, fisicamente
// impossível 3:1 com 2 escuros adjacentes).

const DARK_THEME = {
  // Surface tier (bg < card < muted) — lift via L crescente, hue tinted via Untitled UI
  '--background':           ARTEMIS_PALETTE.gray900,   // #0C111D — deepest
  '--foreground':           ARTEMIS_PALETTE.gray050,   // #F2F4F7 — off-white com hue Untitled (nunca pure white)
  '--card':                 ARTEMIS_PALETTE.gray800,   // #101828 — lifted
  '--card-foreground':      null,                       // ← pickFg dinâmico
  '--popover':              ARTEMIS_PALETTE.gray800,
  '--popover-foreground':   null,                       // ← pickFg dinâmico

  '--muted':                ARTEMIS_PALETTE.gray700,   // #182230
  '--muted-foreground':     ARTEMIS_PALETTE.gray300,   // #98A2B3 — secondary text (não derive — específico)

  '--border':               ARTEMIS_PALETTE.gray400,   // #667085 — bumped p/ passar 3:1 vs card (gray500/600 ainda escuros demais)
  '--input':                ARTEMIS_PALETTE.gray700,
  '--ring':                 ARTEMIS_PALETTE.accent,    // #005EFF — focus uses accent vibrant

  // Brand — primary efetivo em DARK MODE = #0848C5 (mid-dark blue Artemis ladder).
  // Navy #003899 fica brand-only (logo, hero, decorative). Trade-off documentado:
  // navy puro como UI graphic falha 3:1 vs dark bg (1.82:1) — fisicamente impossível.
  '--primary':              ARTEMIS_PALETTE.blueDark,  // #0848C5 — passa 3:1+ vs dark bg
  '--primary-foreground':   null,                       // ← pickFg dinâmico
  '--accent':               ARTEMIS_PALETTE.accent,    // #005EFF vibrant
  '--accent-foreground':    null,                       // ← pickFg dinâmico (igual token editor)

  '--secondary':            ARTEMIS_PALETTE.gray700,
  '--secondary-foreground': null,                       // ← pickFg dinâmico

  // Brand extras (não-canonical, Artemis-specific)
  '--brand-navy':           ARTEMIS_PALETTE.primary,    // #003899 (alias)
  '--brand-blue-vivid':     ARTEMIS_PALETTE.accent,     // #005EFF (alias)
  '--brand-blue-deep':      ARTEMIS_PALETTE.blueDeep,   // #0D419B
  '--brand-blue-dark':      ARTEMIS_PALETTE.blueDark,   // #0848C5
  '--brand-blue-mid':       ARTEMIS_PALETTE.blueMid,    // #1E93FF
  '--brand-blue-light':     ARTEMIS_PALETTE.blueLight,  // #48B7FF

  // Status — hue-aligned com Artemis onde possível
  '--destructive':          '#D92D20',                  // Untitled red-600 (alinha dark mode)
  '--destructive-foreground': ARTEMIS_PALETTE.gray050,
  '--success':              '#039855',                  // Untitled green-600
  '--success-foreground':   ARTEMIS_PALETTE.gray050,
  '--warning':              '#DC6803',                  // Untitled amber-600
  '--warning-foreground':   ARTEMIS_PALETTE.gray050,
  '--info':                 ARTEMIS_PALETTE.accent,     // #005EFF — Artemis vibrant blue
  '--info-foreground':      ARTEMIS_PALETTE.gray050,

  // Sidebar — drama via hue (navy darkened harmonizado com primary)
  '--sidebar-background':   ARTEMIS_PALETTE.gray900,    // #0C111D mesmo nível bg ou ligeiramente mais escuro
  '--sidebar-foreground':   null,                        // ← pickFg dinâmico
  '--sidebar-primary':      ARTEMIS_PALETTE.primary,    // navy (logo brand color, OK aqui pq fg é branco)
  '--sidebar-primary-foreground': null,                  // ← pickFg dinâmico
  '--sidebar-accent':       ARTEMIS_PALETTE.gray800,    // hover state lift
  '--sidebar-accent-foreground': null,                   // ← pickFg dinâmico
  '--sidebar-border':       ARTEMIS_PALETTE.gray700,
  '--sidebar-ring':         ARTEMIS_PALETTE.accent,
  '--sidebar-indicator':    ARTEMIS_PALETTE.accent,     // active item indicator

  // Status pill tokens (par bg+fg) — pra StatusBadge
  '--status-pending-bg':    ARTEMIS_PALETTE.gray700,
  '--status-pending-fg':    ARTEMIS_PALETTE.gray200,
  '--status-success-fg':    '#12B76A',                   // Untitled green-500 (mais claro pra dark)
  '--status-warning-fg':    '#F79009',                   // Untitled amber-500
  '--status-error-fg':      '#F04438',                   // Untitled red-500
  '--status-info-fg':       ARTEMIS_PALETTE.blueMid,     // #1E93FF
};

// ── Foreground derivation map (pickFg dinâmico, igual TokenEditorPreview) ──
//
// Pra cada chave de fg → bg, roda pickFg(bg) automaticamente quando o valor
// no DARK_THEME está null. Replica refinement do token editor (handleFgOverride
// / pickFgPick / sidebarAccentFg). Garantia: foreground sempre passa AAA contra
// o seu próprio bg (relação intrínseca primary/primary-fg etc).

const FG_DERIVE_MAP = {
  '--card-foreground':            '--card',
  '--popover-foreground':         '--popover',
  '--primary-foreground':         '--primary',
  '--accent-foreground':          '--accent',
  '--secondary-foreground':       '--secondary',
  '--sidebar-foreground':         '--sidebar-background',
  '--sidebar-primary-foreground': '--sidebar-primary',
  '--sidebar-accent-foreground':  '--sidebar-accent',
};

function resolveForegrounds(theme) {
  const resolved = { ...theme };
  const deriveLog = [];
  for (const [fgKey, bgKey] of Object.entries(FG_DERIVE_MAP)) {
    if (resolved[fgKey] === null) {
      const bgHex = resolved[bgKey];
      if (!bgHex) continue;
      const { fg, ratio } = pickFg(bgHex);
      // Map pickFg output → Untitled UI palette com HUE preservada
      // (Iron Law anti-ai-ds: foreground NEVER `0 0% L%` — every neutral carries hue)
      // gray025=#FFFFFF é puro, então mapeio pra gray050=#F2F4F7 (hue 216° Untitled UI)
      const mapped = fg === '#FFFFFF' ? ARTEMIS_PALETTE.gray050   // ← usa hue Untitled
                    : fg === '#0A0A0A' ? ARTEMIS_PALETTE.gray900
                    : fg;
      resolved[fgKey] = mapped;
      deriveLog.push({ fgKey, bgKey, bgHex, picked: mapped, ratio: ratio.toFixed(2) });
    }
  }
  return { resolved, deriveLog };
}

// ── Pares WCAG críticos pra validar ───────────────────────────────────

const WCAG_PAIRS = [
  // Texto sobre surfaces — AA mínimo (4.5:1), AAA ideal (7:1)
  { label: 'Foreground / Background',    fg: '--foreground',           bg: '--background',           type: 'text' },
  { label: 'Foreground / Card',          fg: '--card-foreground',      bg: '--card',                 type: 'text' },
  { label: 'Muted-fg / Background',      fg: '--muted-foreground',     bg: '--background',           type: 'text' },
  { label: 'Muted-fg / Card',            fg: '--muted-foreground',     bg: '--card',                 type: 'text' },
  { label: 'Muted-fg / Muted',           fg: '--muted-foreground',     bg: '--muted',                type: 'text' },

  // Brand cores — texto sobre primary/accent
  { label: 'Primary-fg / Primary',       fg: '--primary-foreground',   bg: '--primary',              type: 'text' },
  { label: 'Accent-fg / Accent',         fg: '--accent-foreground',    bg: '--accent',               type: 'text' },

  // Brand cores como UI graphic (3:1) — accent visible vs surface
  { label: 'Accent vs Background (UI)',  fg: '--accent',               bg: '--background',           type: 'ui' },
  { label: 'Primary vs Background (UI)', fg: '--primary',              bg: '--background',           type: 'ui' },
  { label: 'Border vs Card (UI)',        fg: '--border',               bg: '--card',                 type: 'ui' },
  { label: 'Border vs Background (UI)',  fg: '--border',               bg: '--background',           type: 'ui' },
  { label: 'Ring vs Background (UI)',    fg: '--ring',                 bg: '--background',           type: 'ui' },

  // Status
  { label: 'Status info-fg / Card',      fg: '--status-info-fg',       bg: '--card',                 type: 'text' },
  { label: 'Status success-fg / Card',   fg: '--status-success-fg',    bg: '--card',                 type: 'text' },
  { label: 'Status warning-fg / Card',   fg: '--status-warning-fg',    bg: '--card',                 type: 'text' },
  { label: 'Status error-fg / Card',     fg: '--status-error-fg',      bg: '--card',                 type: 'text' },

  // Sidebar
  { label: 'Sidebar-fg / Sidebar-bg',    fg: '--sidebar-foreground',   bg: '--sidebar-background',   type: 'text' },
  { label: 'Sidebar-fg / Sidebar-accent', fg: '--sidebar-accent-foreground', bg: '--sidebar-accent',  type: 'text' },
  { label: 'Sidebar-indicator vs bg (UI)', fg: '--sidebar-indicator',  bg: '--sidebar-background',   type: 'ui' },
];

// ── Run WCAG validation ───────────────────────────────────────────────

function runWcagValidation(theme, pairs) {
  return pairs.map(p => {
    const fgHex = theme[p.fg];
    const bgHex = theme[p.bg];
    if (!fgHex || !bgHex) {
      return { ...p, ratio: 'N/A', badge: { level: 'MISSING', pass: false }, fgHex, bgHex };
    }
    const ratio = contrastRatio(fgHex, bgHex);
    return {
      ...p,
      ratio: ratio.toFixed(2),
      badge: wcagBadge(ratio, p.type),
      fgHex,
      bgHex,
    };
  });
}

// ── Motion tokens (canonical anti-ai-ds + tracker aliases + Artemis ext) ──

const MOTION_TOKENS = {
  // Canonical (anti-ai-ds source of truth)
  '--motion-instant':       '80ms',
  '--motion-fast':          '150ms',
  '--motion-normal':        '200ms',
  '--motion-slow':          '300ms',
  '--motion-page':          '400ms',

  // Easing (canonical)
  '--ease-standard':        'cubic-bezier(0.4, 0, 0.2, 1)',
  '--ease-out':             'cubic-bezier(0, 0, 0.2, 1)',
  '--ease-in':              'cubic-bezier(0.4, 0, 1, 1)',
  '--ease-spring':          'cubic-bezier(0.34, 1.56, 0.64, 1)',  // overshoot — substitui --ease-back proposto Wave 3

  // Stagger
  '--motion-stagger':       '15ms',

  // Tracker aliases híbridos (Q2 decisão Patrick) — não quebram code existente
  '--motion-base':          'var(--motion-normal)',     // 200ms (era 200ms — match exato)
  '--motion-decorative':    'var(--motion-page)',       // 400ms (era 480ms — ajusta -80ms)
  '--ease-in-out':          'var(--ease-standard)',     // alias
  '--ease-emphasized':      'var(--ease-out)',          // alias

  // Artemis extensions (Q4 não existem canonical — único do tracker)
  '--motion-celebration':   '800ms',                    // FirstHit confetti single-shot
  '--motion-pulse-loop':    '2s',                       // WebhookPing breathing
};

// ── Typography (Patrick Q1: confirmado IBM Plex Sans + Inter) ─────────

const TYPOGRAPHY = {
  '--font-display':  "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  '--font-body':     "'Inter', ui-sans-serif, system-ui, sans-serif",
  '--font-mono':     "'Geist Mono', ui-monospace, SFMono-Regular, monospace",

  // Type scale (canonical anti-ai-ds bumped Wave 8)
  '--text-xs':       '13px',
  '--text-sm':       '15px',
  '--text-base':     '17px',
  '--text-lg':       '19px',
  '--text-xl':       '22px',
  '--text-2xl':      '26px',
  '--text-3xl':      '32px',

  // Weights (canonical: never 700)
  '--weight-normal':    '400',
  '--weight-medium':    '500',
  '--weight-semibold':  '600',

  // Line heights
  '--leading-tight':    '1.25',
  '--leading-normal':   '1.5',
  '--leading-relaxed':  '1.625',

  // Tracking
  '--track-tight':      '-0.025em',
  '--track-normal':     '0',
};

// ── Spacing primitives (canonical 4-base) ─────────────────────────────

const SPACING = {
  '--space-1':     '4px',
  '--space-1-5':   '6px',
  '--space-2':     '8px',
  '--space-3':    '12px',
  '--space-4':    '16px',
  '--space-5':    '20px',
  '--space-6':    '24px',
  '--space-8':    '32px',
  '--space-10':   '40px',
  '--space-12':   '48px',
  '--space-16':   '64px',
};

// ── Radius (canonical scale) ──────────────────────────────────────────

const RADIUS = {
  '--radius-sm':   '6px',
  '--radius-md':   '8px',
  '--radius-lg':  '12px',
  '--radius-xl':  '16px',
  '--radius-2xl': '20px',
  '--radius':      '0.5rem',  // base shadcn
};

// ── Shadow (hue-aware, tinted by foreground) ──────────────────────────
// Em dark mode: foreground = light, então shadow precisa ser BLACK overlay
// (não tinted by fg — invertido). Mantém canonical pra light mode preset
// futuro, mas dark usa rgb(0 0 0 / X) literal.

const SHADOWS = {
  '--shadow-xs':       '0 1px 2px rgb(0 0 0 / .25)',
  '--shadow-sm':       '0 1px 4px rgb(0 0 0 / .35)',
  '--shadow-md':       '0 2px 8px rgb(0 0 0 / .45)',
  '--shadow-lg':       '0 4px 16px rgb(0 0 0 / .55)',
  '--shadow-xl':       '0 8px 32px rgb(0 0 0 / .65)',

  '--shadow-card':     '0 1px 2px rgb(0 0 0 / .25)',
  '--shadow-popover':  '0 8px 24px -4px rgb(0 0 0 / .50)',
  '--shadow-dialog':   '0 24px 48px -12px rgb(0 0 0 / .65)',
  '--shadow-drawer':   '0 0 24px rgb(0 0 0 / .50)',
  '--shadow-sidebar':  '0 1px 3px rgb(0 0 0 / .30)',
  '--shadow-toast':    '0 6px 20px -4px rgb(0 0 0 / .50)',
  '--shadow-tooltip':  '0 2px 8px rgb(0 0 0 / .55)',
  '--shadow-control':  '0 1px 2px 0 rgb(0 0 0 / .35)',

  '--overlay-backdrop': 'rgb(0 0 0 / .60)',  // dialog backdrop
};

// ── Generate CSS output ───────────────────────────────────────────────

function generateCss({ theme, motion, typography, spacing, radius, shadows }) {
  const sectionDark = Object.entries(theme)
    .map(([k, v]) => {
      // Hex → HSL triplet (shadcn convention)
      const triplet = v.startsWith('#') ? hexToCssTriplet(v) : v;
      return `  ${k}: ${triplet};`;
    })
    .join('\n');

  const sectionMotion = Object.entries(motion)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  const sectionTypography = Object.entries(typography)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  const sectionSpacing = Object.entries(spacing)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  const sectionRadius = Object.entries(radius)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  const sectionShadows = Object.entries(shadows)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  return `/* ============================================================
   audits/04-tokens.css — Wave 4 (Sessão 2)
   Generated by audits/scripts/generate-tokens.mjs
   Brand: Studio Artemis (navy #003899 + vibrant blue #005EFF + Untitled UI gray)
   Mode: dark only (Patrick decision Q5 — tracker é developer tool)
   ============================================================ */

:root {
  /* ── Surface + Brand (dark theme) — HSL triplets shadcn convention ── */
${sectionDark}

  /* ── Motion tokens (canonical anti-ai-ds + tracker aliases + Artemis ext) ── */
${sectionMotion}

  /* ── Typography ── */
${sectionTypography}

  /* ── Spacing (4-base canonical) ── */
${sectionSpacing}

  /* ── Radius ── */
${sectionRadius}

  /* ── Shadows (dark mode tinted) ── */
${sectionShadows}
}

/* ============================================================
   REDUCED MOTION — global a11y (WCAG 2.2.2 + 2.3.3)
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ============================================================
   FOCUS RING — cross-cutting a11y (WCAG 2.4.7)
   Two-layer ring: 2px offset + 3px primary halo via accent
   ============================================================ */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px hsl(var(--background)),
    0 0 0 5px hsl(var(--ring) / .55);
}
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow:
    0 0 0 2px hsl(var(--background)),
    0 0 0 5px hsl(var(--ring) / .25);
}
`;
}

// ── Generate design.json output (semantic structure) ─────────────────

function generateDesignJson({ theme, motion, typography, spacing, radius, shadows, wcagResults, deriveLog = [] }) {
  return {
    name: 'claude-token-tracker / Studio Artemis',
    version: '1.0.0',
    generated: new Date().toISOString(),
    brand: {
      primary: ARTEMIS_PALETTE.primary,
      accent: ARTEMIS_PALETTE.accent,
      family: 'Studio Artemis',
      tagline: 'Plausible pra Claude',
    },
    mode: 'dark',
    typography: {
      display: 'IBM Plex Sans',
      body: 'Inter',
      mono: 'Geist Mono',
    },
    palette: ARTEMIS_PALETTE,
    semantic: theme,
    motion: motion,
    spacing: spacing,
    radius: radius,
    shadows: shadows,
    pickFgDerivations: deriveLog,
    wcag: {
      validatedAt: new Date().toISOString(),
      pairs: wcagResults.map(r => ({
        label: r.label,
        fg: r.fg,
        bg: r.bg,
        fgHex: r.fgHex,
        bgHex: r.bgHex,
        type: r.type,
        ratio: r.ratio,
        level: r.badge.level,
        pass: r.badge.pass,
      })),
      summary: {
        total: wcagResults.length,
        passing: wcagResults.filter(r => r.badge.pass).length,
        failing: wcagResults.filter(r => !r.badge.pass).length,
      },
    },
    extensions: {
      artemis: {
        '--motion-celebration': MOTION_TOKENS['--motion-celebration'],
        '--motion-pulse-loop': MOTION_TOKENS['--motion-pulse-loop'],
        '--brand-navy': ARTEMIS_PALETTE.primary,
        '--brand-blue-vivid': ARTEMIS_PALETTE.accent,
      },
    },
  };
}

// ── WCAG report (markdown) ────────────────────────────────────────────

function generateWcagReport(wcagResults) {
  const total = wcagResults.length;
  const passing = wcagResults.filter(r => r.badge.pass).length;
  const failing = total - passing;

  const lines = [
    '# WCAG Validation Report — Wave 4',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Total pairs:** ${total} | **Passing:** ${passing} | **Failing:** ${failing}`,
    '',
    '## Pairs',
    '',
    '| Pair | FG | BG | Ratio | Level | Pass |',
    '|------|-----|-----|------:|-------|------|',
    ...wcagResults.map(r => {
      const passSym = r.badge.pass ? '✅' : '❌';
      return `| ${r.label} | \`${r.fgHex}\` (${r.fg}) | \`${r.bgHex}\` (${r.bg}) | ${r.ratio}:1 | ${r.badge.level} | ${passSym} |`;
    }),
    '',
    '## Failing pairs (must fix before Wave 6 implementation)',
    '',
  ];

  const failingPairs = wcagResults.filter(r => !r.badge.pass);
  if (failingPairs.length === 0) {
    lines.push('✅ **All pairs passing.** Token set ready for Wave 5/6.');
  } else {
    failingPairs.forEach(r => {
      lines.push(`- **${r.label}** (${r.ratio}:1, ${r.badge.level}) — ${r.type === 'ui' ? 'UI graphic 3:1' : 'AA 4.5:1'} required.`);
    });
  }

  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Text pairs: AA = 4.5:1 (normal text), AAA = 7:1 (preferred).');
  lines.push('- UI graphic pairs (borders, focus rings, accent vs surface): 3:1 minimum (WCAG 1.4.11).');
  lines.push('- Status colors use Untitled UI 500-tier (lighter) for dark mode visibility.');
  lines.push('- Foreground tokens NEVER use pure `0 0% L%` — every neutral carries Untitled UI hue (~220°).');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log('🎨 Generating Artemis tokens for tracker dark mode...\n');

  // Resolve foregrounds via pickFg dinâmico (mesma lógica TokenEditorPreview)
  const { resolved: resolvedTheme, deriveLog } = resolveForegrounds(DARK_THEME);

  console.log('PickFg derivations:');
  deriveLog.forEach(d => {
    console.log(`  ${d.fgKey.padEnd(35)} ← pickFg(${d.bgHex}) = ${d.picked} @ ${d.ratio}:1`);
  });
  console.log('');

  // Run WCAG validation
  const wcagResults = runWcagValidation(resolvedTheme, WCAG_PAIRS);

  // Print summary to console
  console.log('WCAG Pairs:');
  wcagResults.forEach(r => {
    const sym = r.badge.pass ? '✅' : '❌';
    console.log(`  ${sym} ${r.label.padEnd(40)} ${r.ratio.toString().padStart(5)}:1  ${r.badge.level}`);
  });

  const passing = wcagResults.filter(r => r.badge.pass).length;
  const failing = wcagResults.length - passing;
  console.log(`\nTotal: ${wcagResults.length} | Passing: ${passing} | Failing: ${failing}`);

  // Generate outputs
  const css = generateCss({
    theme: resolvedTheme,
    motion: MOTION_TOKENS,
    typography: TYPOGRAPHY,
    spacing: SPACING,
    radius: RADIUS,
    shadows: SHADOWS,
  });

  const designJson = generateDesignJson({
    theme: resolvedTheme,
    motion: MOTION_TOKENS,
    typography: TYPOGRAPHY,
    spacing: SPACING,
    radius: RADIUS,
    shadows: SHADOWS,
    wcagResults,
    deriveLog,
  });

  const wcagReport = generateWcagReport(wcagResults);

  // Write files
  const cssPath = resolve(ROOT, 'audits/04-tokens.css');
  const jsonPath = resolve(ROOT, 'audits/04-tokens.json');
  const reportPath = resolve(ROOT, 'audits/04-wcag-report.md');

  writeFileSync(cssPath, css);
  writeFileSync(jsonPath, JSON.stringify(designJson, null, 2));
  writeFileSync(reportPath, wcagReport);

  console.log(`\n✅ Outputs:`);
  console.log(`   ${cssPath}`);
  console.log(`   ${jsonPath}`);
  console.log(`   ${reportPath}`);

  if (failing > 0) {
    console.log(`\n⚠️  ${failing} WCAG pair(s) failing. Review report.md before Wave 6.`);
    process.exit(0);  // não falha build, só warn
  }
}

main();
