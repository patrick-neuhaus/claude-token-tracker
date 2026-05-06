# WCAG Validation Report — Wave 4

**Generated:** 2026-05-06T16:34:42.944Z
**Total pairs:** 19 | **Passing:** 18 | **Failing:** 1

## Pairs

| Pair | FG | BG | Ratio | Level | Pass |
|------|-----|-----|------:|-------|------|
| Foreground / Background | `#F2F4F7` (--foreground) | `#0C111D` (--background) | 17.12:1 | AAA | ✅ |
| Foreground / Card | `#F2F4F7` (--card-foreground) | `#101828` (--card) | 16.11:1 | AAA | ✅ |
| Muted-fg / Background | `#98A2B3` (--muted-foreground) | `#0C111D` (--background) | 7.32:1 | AAA | ✅ |
| Muted-fg / Card | `#98A2B3` (--muted-foreground) | `#101828` (--card) | 6.89:1 | AA | ✅ |
| Muted-fg / Muted | `#98A2B3` (--muted-foreground) | `#182230` (--muted) | 6.22:1 | AA | ✅ |
| Primary-fg / Primary | `#F2F4F7` (--primary-foreground) | `#0848C5` (--primary) | 6.95:1 | AA | ✅ |
| Accent-fg / Accent | `#F2F4F7` (--accent-foreground) | `#005EFF` (--accent) | 4.71:1 | AA | ✅ |
| Accent vs Background (UI) | `#005EFF` (--accent) | `#0C111D` (--background) | 3.63:1 | OK | ✅ |
| Primary vs Background (UI) | `#0848C5` (--primary) | `#0C111D` (--background) | 2.46:1 | FAIL | ❌ |
| Border vs Card (UI) | `#667085` (--border) | `#101828` (--card) | 3.57:1 | OK | ✅ |
| Border vs Background (UI) | `#667085` (--border) | `#0C111D` (--background) | 3.79:1 | OK | ✅ |
| Ring vs Background (UI) | `#005EFF` (--ring) | `#0C111D` (--background) | 3.63:1 | OK | ✅ |
| Status info-fg / Card | `#1E93FF` (--status-info-fg) | `#101828` (--card) | 5.64:1 | AA | ✅ |
| Status success-fg / Card | `#12B76A` (--status-success-fg) | `#101828` (--card) | 6.77:1 | AA | ✅ |
| Status warning-fg / Card | `#F79009` (--status-warning-fg) | `#101828` (--card) | 7.56:1 | AAA | ✅ |
| Status error-fg / Card | `#F04438` (--status-error-fg) | `#101828` (--card) | 4.72:1 | AA | ✅ |
| Sidebar-fg / Sidebar-bg | `#F2F4F7` (--sidebar-foreground) | `#0C111D` (--sidebar-background) | 17.12:1 | AAA | ✅ |
| Sidebar-fg / Sidebar-accent | `#F2F4F7` (--sidebar-accent-foreground) | `#101828` (--sidebar-accent) | 16.11:1 | AAA | ✅ |
| Sidebar-indicator vs bg (UI) | `#005EFF` (--sidebar-indicator) | `#0C111D` (--sidebar-background) | 3.63:1 | OK | ✅ |

## Failing pairs (must fix before Wave 6 implementation)

- **Primary vs Background (UI)** (2.46:1, FAIL) — UI graphic 3:1 required.

## Notes

- Text pairs: AA = 4.5:1 (normal text), AAA = 7:1 (preferred).
- UI graphic pairs (borders, focus rings, accent vs surface): 3:1 minimum (WCAG 1.4.11).
- Status colors use Untitled UI 500-tier (lighter) for dark mode visibility.
- Foreground tokens NEVER use pure `0 0% L%` — every neutral carries Untitled UI hue (~220°).