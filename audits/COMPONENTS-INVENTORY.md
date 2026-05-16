# Components Inventory — Claude Token Tracker

> **Criado:** 2026-05-06
> **Source of truth:** `client/src/` real listing (validado via Glob+Grep)
> **Propósito:** mapear todos componentes visuais antes de migração pra DS final (Patrick decidiu NÃO usar shadcn)

## TL;DR

| Métrica | Valor |
|---|---|
| Pages | 16 |
| Components total | ~75 |
| UI primitives (`components/ui/`) | 11 (8 wrap `@base-ui/react`, 3 plain Tailwind) |
| Hooks customizados | 17 |
| Stack runtime | React 19 + Vite + Tailwind 4 + `@base-ui/react` + recharts + lucide-react + sonner + tanstack/react-query |
| `shadcn` em package.json | apenas CLI scaffolder, não runtime |
| Auth/Theme | React Context (AuthContext, ThemeContext) |

**Implicação pro DS final:** primitives já são headless via `@base-ui/react` (Tailwind = styling layer). Migração pro DS Patrick (`anti-ai-design-system`?) significa **trocar layer de styling**, não trocar primitive engine. Refactor leve em primitives, refactor grande em components/pages que herdam tokens.

---

## 1. Pages (16) — `client/src/pages/`

| Page | Rota provável | Domínio |
|---|---|---|
| DashboardPage | `/` ou `/dashboard` | Dashboard (J1 — uso 50x/dia) |
| SessionsPage | `/sessions` | Sessões lista |
| SessionDetailPage | `/sessions/:id` | Sessão detalhe |
| SessionTimePage | `/sessions/time` | Sessão tempo (scatter chart) |
| AnalyticsPage | `/analytics` | Analytics (heatmaps, trends, top sessions) |
| ProjectsPage | `/projects` | Projetos lista |
| ProjectDetailPage | `/projects/:id` | Projeto detalhe |
| EntriesPage | `/entries` | Entries (token logs) |
| SettingsPage | `/settings` | Config user (rate, budget, webhook, pricing) |
| AchievementsPage | `/achievements` | Badges/streaks gamification |
| SkillsPage | `/skills` | Skills library |
| SkillDetailPage | `/skills/:id` | Skill detalhe |
| SystemPromptsPage | `/system-prompts` | System prompts library |
| SystemPromptDetailPage | `/system-prompts/:id` | Prompt detalhe |
| AdminPage | `/admin` | User management (super_admin) |
| LoginPage | `/login` | Auth (sign in / register) |

---

## 2. UI Primitives (11) — `client/src/components/ui/`

| Component | Engine | Styling layer | Usage |
|---|---|---|---|
| `button.tsx` | `@base-ui/react/button` | Tailwind + CVA (variant, size) | Generic button |
| `input.tsx` | `@base-ui/react/input` | Tailwind | Text/number/email inputs |
| `dialog.tsx` | `@base-ui/react/dialog` | Tailwind + portal | Modal dialog (cancel/confirm) |
| `tooltip.tsx` | `@base-ui/react/tooltip` | Tailwind + portal | Hover tooltip |
| `tabs.tsx` | `@base-ui/react/tabs` | Tailwind + CVA | Tabbed interface |
| `progress.tsx` | `@base-ui/react/progress` | Tailwind | Progress bar |
| `separator.tsx` | `@base-ui/react/separator` | Tailwind | Horizontal/vertical divider |
| `badge.tsx` | `@base-ui/react/use-render` (composable) | Tailwind + CVA | Status pill/tag |
| `label.tsx` | plain React | Tailwind | Form label |
| `skeleton.tsx` | plain React | Tailwind animate-pulse | Loading skeleton |
| `table.tsx` | plain React (HTML semantic) | Tailwind | Generic table wrapper |

**Observação:** `cn()` helper em `@/lib/utils` (clsx + tailwind-merge). CVA usado nos 3 mais variáveis (button, badge, tabs).

---

## 3. Layout & Navigation (4) — `client/src/components/{layout,navigation}/`

| Component | Path | Função |
|---|---|---|
| `AppLayout` | `layout/AppLayout.tsx` | Shell raiz: header + Sidebar + Outlet (rotas filhas) |
| `Sidebar` | `layout/Sidebar.tsx` | Wave 6.0 canonical sidebar com brand lockup, nav groups (Workspace/Insights/Showcase/Admin), collapse toggle, search trigger, PlanCountdown footer, UserMenu rodapé |
| `StreakCounter` | `layout/StreakCounter.tsx` | Wave 6.7b — 🔥 + dias atual no rodapé sidebar (acima PlanCountdown). Bump motion + tooltip recorde. Esconde quando collapsed OU current=0 |
| `UserMenu` | `navigation/UserMenu.tsx` | Avatar + nome dropdown — Profile / Config / Logout / Theme toggle |

---

## 4. Shared / Utility (15) — `client/src/components/shared/`

| Component | Função |
|---|---|
| `PageHeader` | Top h1 + subtitle + actions slot |
| `Section` | Surface canonical container (rounded-xl border) com title + actions |
| `EmptyState` | Fallback no-data com icon + message + opcional CTA |
| `ErrorState` | Error fallback com mensagem + retry |
| `SkeletonGrid` | Grid de skeletons (count, cols, itemHeight) |
| `Pagination` | Paginação clássica (prev/next + numbers) |
| `NavBreadcrumb` | Breadcrumb router-aware |
| `DetailHeader` | Header de detail page (back + title + meta) |
| `StatCard` | Wave 6.1 KPI tile — icon chip + label + valor + sublabel + trend + skeleton |
| `FilterChip` | Chip pra preset/filter (selected vs unselected state) |
| `ViewModeToggle` | Toggle de view mode (grid vs list, etc) |
| `ClickableRow` | Row table clickable (Wave 6.2 deprecated em favor de AppTable) |
| `SortableTableHeader` | Header sortable com seta (Wave 6.2 deprecated em favor de AppTable) |
| `InlineEditableText` | Inline edit (button → input) com save/cancel |
| `MarkdownDocPanel` | Painel markdown render (read-only) |
| `ConfettiBurst` | Wave 6.7a — confetti overlay pra unlock achievement |
| `DateRangeFilter` | Wave 8.1 — preset chips + 2 inputs date (from/to). Bug B3 fixed (timezone BR via date-fns-tz) |

---

## 5. Dashboard-specific (10) — `client/src/components/dashboard/`

| Component | Função |
|---|---|
| `DashboardFilters` | Wrapper DateRangeFilter + Source NativeSelect + Modelo Input + Project NativeSelect |
| `SummaryCards` | Grid de StatCards do dashboard (cost total, sessions, etc) |
| `WebhookPing` | KPI canonical Wave 6.1 — last webhook ping recebido |
| `PlanIndicator` | Plan vs gasto atual (above/below) |
| `DailyBudgetProgress` | Progress bar de daily budget |
| `BudgetAlert` | Alert se passou daily/session budget |
| `MonthNarrative` | Narrative mensal (texto + KPIs) |
| `DailyCostChart` | Chart custo diário recharts (line) |
| `CostByModelChart` | Wave 7.2 — Top 6 modelos pie + "Outros (N)" |
| `CostBySourceChart` | Wave 7.2 — pie por source (Claude Code, Codex, etc) |

---

## 6. Analytics-specific (6) — `client/src/components/analytics/`

| Component | Função |
|---|---|
| `ContributionGraph` | Wave 8.1 — heatmap GitHub-style 7×weeks. Tile vira button + click → painel detalhe inline (B1 fix) |
| `HeatmapWeekHour` | Wave 7.6 — heatmap 7×24 (dia×hora). Tile button + click → detail panel |
| `KpiBox` | KPI display generic (icon + label + value + suffix + hint) |
| `DeltaBadge` | Wave 6.3 — % delta com TrendingUp/Down icon + cor sentiment |
| `PeriodComparisonGrid` | Grid stats current vs previous period |
| `StreaksKpiGrid` | KPIs gamification (current_streak + longest + cost_per_active_hour + top sessions) |
| `ProjectComparison` | Bar chart projetos comparados (cost, sessions) |
| `AchievementNotifier` | Wave 6.7a — toast unlock + ConfettiBurst dispatch |

---

## 7. Sessions-specific (4) — `client/src/components/sessions/`

| Component | Função |
|---|---|
| `SessionsTable` | Tabela sessions (Wave 6.2 AppTable port) com inline rename |
| `SessionNameEditor` | Inline edit nome sessão (button ↔ input) |
| `SessionTimeFilters` | Preset chips + DateRangeFilter + GapSlider |
| `SessionTimeScatterChart` | Scatter cost (Y) × tempo útil (X), point size ∝ calls |
| `GapSlider` | Range slider 0-500min com preset chips |

---

## 8. Settings-specific (3) — `client/src/components/settings/`

| Component | Função |
|---|---|
| `SettingsForm` | Wave 6.5 canonical — FormField wrapper, rate USD→BRL, plan cost, daily/session budget, weekly reset DOW/hour |
| `WebhookInfo` | Webhook URL + token + curl examples (Disclosure expand) |
| `CsvImport` | Drag-drop CSV upload + preview + processFile util |
| `PricingDrawer` | Wave 7.3 / F-NEW-8 — right-anchored side panel pra custom pricing per modelo (4 rates inputs + lista overrides) |

---

## 9. Achievements (3) — `client/src/components/achievements/`

| Component | Função |
|---|---|
| `BadgeCard` | Wave 6.7a — single tile com motion spring overshoot (cubic-bezier(0.34, 1.56, 0.64, 1)) IntersectionObserver triggered |
| `BadgeCategorySection` | Wrapper category com header (icon + label + unlocked/total) + grid 1/2/3/4 cols responsive |
| `TierProgressBar` | Progress bar com milestone markers 25/50/75/100% |

---

## 10. Charts (2) — `client/src/components/charts/`

| Component | Função |
|---|---|
| `ModelPieChart` | Wave 7.2 — Top 6 modelos donut + "Outros (N)" agregado |
| `DailyCostAreaChart` | Area chart cost cumulative |

(charts adicionais ficam em `dashboard/` — DailyCostChart, CostByModelChart, CostBySourceChart, e em `sessions/` — SessionTimeScatterChart)

---

## 11. Outros (10) — categorias menores

| Path | Component | Função |
|---|---|---|
| `auth/LoginForm.tsx` | LoginForm | Form email+pass login |
| `auth/RegisterForm.tsx` | RegisterForm | Form registro novo user |
| `admin/UserManagement.tsx` | UserManagement | Tabela admin users + role buttons (Approve/Reject/Promote) |
| `data/AppTable.tsx` | AppTable | Wave 6.2 — tabela CSS Grid declarativa (columns + sortable + onRowClick) |
| `entries/EntriesTable.tsx` | EntriesTable | Tabela 10-col token entries (timestamp/source/model/in/out/cache_r/cache_w/total/cost/session) |
| `forms/FormField.tsx` | FormField | Wave 6.5 — wrapper label+input+error+helper, clona children injetando aria |
| `markdown/MarkdownView.tsx` | MarkdownView | Render markdown (react-markdown + remark-gfm) |
| `onboarding/OnboardingWizard.tsx` | OnboardingWizard | Wave 6.4b — 5 steps onboarding, live detection, confetti motion |
| `projects/ProjectHeaderEditable.tsx` | ProjectHeaderEditable | Header projeto com nome editable inline |
| `projects/AddSessionDialog.tsx` | AddSessionDialog | Dialog pra adicionar sessão a projeto |
| `search/GlobalSearch.tsx` | GlobalSearch | Cmd+K search dialog (Fuse.js client-side) |
| `skills/SkillFileTree.tsx` | SkillFileTree | Tree view files de skill |
| `skills/SkillSearch.tsx` | SkillSearch | Search bar skills |
| `ErrorBoundary.tsx` (root) | ErrorBoundary | Class boundary genérico |
| `RouteErrorBoundary.tsx` (root) | RouteErrorBoundary | Boundary específico router |
| `ShortcutsOverlay.tsx` (root) | ShortcutsOverlay | Overlay com keyboard shortcuts (Cmd+K + ?) |

---

## 12. Hooks (17) — `client/src/hooks/`

| Hook | Função |
|---|---|
| `useDashboard` | Fetch dashboard data (cost summary, recent activity) |
| `useAnalytics` | Fetch analytics (project_trend, model_trend, heatmap, streaks, period_comparison, top_sessions) |
| `useSessions` | Lista sessions com filtros |
| `useSessionDetail` | Sessão única detalhe |
| `useSessionTime` | Sessão time analysis |
| `useProjects` | Projetos lista |
| `useEntries` | Entries lista paginada |
| `useSettings` | User settings (rate, budgets) |
| `useSkills` | Skills lista |
| `useSystemPrompts` | System prompts lista |
| `useAchievements` | Achievements unlocked |
| `usePlanStatus` | Plan status atual (above/below cost) |
| `useImport` | CSV import mutation |
| `useCustomPricing` | Wave 7.3 — overrides pricing (list/upsert/delete) |
| `useCountUp` | Animate number 0→target via IntersectionObserver |
| `useDebounce` | Debounce value |
| `useLocalStorage` | LocalStorage sync hook |

**Auth/Theme:** ficam em `client/src/contexts/` (AuthContext.tsx, ThemeContext.tsx) com hooks `useAuth` / `useTheme` exportados.

---

## 13. Utilities & Constants

| Path | Função |
|---|---|
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) |
| `lib/api.ts` | API client + ApiError class |
| `lib/formatters.ts` | formatUSD, formatShortDate, formatDate, formatNumber |
| `lib/constants.ts` | MONTH_LABELS, DOW_LABELS_FULL, MS_PER_DAY, CHART_COLORS, displayModelName, getModelColor, displayLabel |
| `lib/types.ts` | AnalyticsData, User, Session, Project, Entry, Achievement, PricingOverride |
| `lib/surface.ts` | Surface classes helpers (referencia shadcn-style mas custom) |
| `lib/chartConfig.ts` | TOOLTIP_PROPS recharts shared |
| `lib/badges.ts` | TIER_STYLES + badges metadata |

---

## 14. Análise — implicações pra DS final

### Componentes shadcn-flavor (`components/ui/`)

8 deles wrap `@base-ui/react` (estável, headless, 0 styling default). Migração DS:
- **Engine** (base-ui) — fica
- **Styling layer** (Tailwind classes via CVA) — troca pra tokens DS Patrick

Refactor cirúrgico em 11 arquivos. Não destruir, só re-skinar.

### Componentes que duplicam função (CANDIDATOS A CONSOLIDAR)

| Função | Componentes |
|---|---|
| Tabela | `ui/table.tsx` (HTML wrapper) + `data/AppTable.tsx` (Grid declarative) + `entries/EntriesTable.tsx` (10-col specific) + `sessions/SessionsTable.tsx` (sortable+rename) |
| Date range filter | `shared/DateRangeFilter.tsx` + `sessions/SessionTimeFilters.tsx` (envolve DateRangeFilter + extras) |
| KPI tile | `shared/StatCard.tsx` (Wave 6.1) + `analytics/KpiBox.tsx` (mais simples) + `dashboard/DailyBudgetProgress.tsx` (com progress bar) |
| Empty state | `shared/EmptyState.tsx` + inline `EmptyChart` definido em pages |
| Inline edit | `shared/InlineEditableText.tsx` + `sessions/SessionNameEditor.tsx` (mesma anatomia) |

**Recomendação:** auditar duplicação ANTES de migração DS — consolidar em primitives canonical do DS final.

### Componentes deprecated (Wave 6.2 substituiu)

- `shared/ClickableRow.tsx` — substituído por `data/AppTable.tsx onRowClick`
- `shared/SortableTableHeader.tsx` — substituído por `data/AppTable.tsx columns[].sortable`

**Ação:** remover esses 2 se não há callsites restantes.

### Lacunas pro DS Patrick

Componentes que provavelmente **NÃO existem** no anti-ai-design-system canonical e precisam port custom:
- `OnboardingWizard` (Wave 6.4b — 5 steps + confetti)
- `PricingDrawer` (Wave 7.3 — side panel custom)
- `ContributionGraph` (Wave 8.1 — GitHub heatmap)
- `HeatmapWeekHour` (Wave 7.6 — 7×24)
- `SessionTimeScatterChart` (recharts wrapper)
- `BadgeCard` + `TierProgressBar` (Wave 6.7a — gamification)
- `StreakCounter` (Wave 6.7b — 🔥 sidebar)
- `GlobalSearch` (Cmd+K)

### Refactor batch sugerido pra migração DS

1. **Phase A — Tokens swap (fundação):** trocar tokens `index.css` pelo DS Patrick
2. **Phase B — Primitives re-skin (`components/ui/*`):** 11 arquivos, mantém engine base-ui
3. **Phase C — Shared components re-skin:** ~15 arquivos
4. **Phase D — Domain components (dashboard/analytics/sessions/etc):** ~50 arquivos
5. **Phase E — Pages:** 16 — geralmente cascade de Phase B-D
6. **Phase F — Specials (custom não-DS):** OnboardingWizard, PricingDrawer, heatmaps, charts — port manual

---

## 15. Source notes (auditoria)

- **`shadcn` em package.json:** confirmado CLI tool (`shadcn@^4.1.1`), não runtime lib. Usado pra scaffolding inicial.
- **`shadcn` em código:** 3 referências apenas em `lib/surface.ts`, `index.css`, `SortableTableHeader.tsx` — todas em comentários/CSS-vars-naming, não import runtime.
- **`@headlessui/react`:** **NÃO existe** no projeto. Agent inicial alucinou. Engine real é `@base-ui/react`.
- **`@radix-ui/*`:** NÃO existe.
- **Reduced motion:** respeitado via `prefers-reduced-motion` query em motion specs (Waves 3, 6.7a).

---

## 16. Próxima ação — decisão Patrick

Pra fazer migração DS final, precisa:

1. **Confirmar DS alvo** — `~/Documents/Github/anti-ai-design-system/ui_kits/default/`?
2. **Decidir scope:** re-skin only OR refactor estrutural (consolidar duplicações)?
3. **Decidir ordem:** big-bang (1 sessão pesada) OR incremental (Phase A→F sequencial)?

**Recomendação default:** incremental Phase A → B → C → D → E → F. Cada phase tem gate visual Patrick antes de prosseguir. Total ~3-5 sessões dedicadas.
