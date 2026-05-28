# Component Dedup Audit — Wave 8.2.1

> **Criado:** 2026-05-06
> **Source:** `client/src/` real listing (75 components + 17 hooks + 16 pages — todos lidos 1 a 1)
> **Output:** decisão por componente + plano consolidação Wave 8.2.2
> **GATE:** Patrick valida lista "matar/mergear/manter" antes de iniciar 8.2.2

## TL;DR

| Bucket | Count | Ação |
|---|---|---|
| ✅ Canonical (manter) | 55 | nenhuma |
| ⚠️ Duplicata estrutural / refactor | 12 | consolidar em Wave 8.2.2 |
| 🗑️ Deletar após migração | 2 | ClickableRow + SortableTableHeader (após migrar pages) |
| ⚠️ Token drift / inconsistência | 3 | ErrorBoundary, SettingsForm, ProjectComparison inline `<table>` |

**Achado crítico:** `ui/table.tsx` ainda tem **4 callsites ativos** (WebhookInfo, CsvImport, UserManagement, ProjectComparison usa inline `<table>`). NÃO é deletável imediato — refactor migrar pra `AppTable` primeiro.

---

## 1. Decisão por componente — tabela completa

### Pages (16) — todos canonical containers

Páginas são containers compostos. Não há duplicação inerente. Manter todas 16: `DashboardPage`, `SessionsPage`, `SessionDetailPage`, `SessionTimePage`, `AnalyticsPage`, `ProjectsPage`, `ProjectDetailPage`, `EntriesPage`, `SettingsPage`, `AchievementsPage`, `SkillsPage`, `SkillDetailPage`, `SystemPromptsPage`, `SystemPromptDetailPage`, `AdminPage`, `LoginPage`.

### UI Primitives (`components/ui/`, 11)

| Component | Decisão | Razão |
|---|---|---|
| `button.tsx` | ✅ canonical | wrap `@base-ui/react/button` + CVA variants |
| `input.tsx` | ✅ canonical | wrap `@base-ui/react/input` |
| `dialog.tsx` | ✅ canonical | wrap `@base-ui/react/dialog` |
| `tooltip.tsx` | ✅ canonical | wrap `@base-ui/react/tooltip` |
| `tabs.tsx` | ✅ canonical | wrap `@base-ui/react/tabs` |
| `progress.tsx` | ✅ canonical | wrap `@base-ui/react/progress` |
| `separator.tsx` | ✅ canonical | wrap `@base-ui/react/separator` |
| `badge.tsx` | ✅ canonical | composable via `useRender` |
| `label.tsx` | ✅ canonical | plain Tailwind |
| `skeleton.tsx` | ✅ canonical | plain Tailwind |
| `table.tsx` | ⚠️ deprecate gradual | 4 callsites ainda — migrar pra AppTable em 8.2.2, deletar depois |

### Layout & Navigation (4)

| Component | Decisão |
|---|---|
| `layout/AppLayout` | ✅ canonical (shell wrapper) |
| `layout/Sidebar` | ✅ canonical (Wave 6.0 CRM lift) |
| `layout/StreakCounter` | ✅ canonical (Wave 6.7b) |
| `navigation/UserMenu` | ✅ canonical (CRM 2-row card) |

### Shared (15)

| Component | Decisão | Razão |
|---|---|---|
| `PageHeader` | ✅ canonical | top-level h1 + subtitle + actions |
| `DetailHeader` | ✅ canonical | specialized variant (back link + badges) |
| `Section` | ✅ canonical | surface.section wrapper |
| `EmptyState` | ✅ canonical | "no data" semantic |
| `ErrorState` | ✅ canonical | "fail" semantic + retry CTA |
| `StatCard` | ✅ canonical | KPI variant "chip + divider" |
| `DateRangeFilter` | ✅ canonical | preset chips + inputs date (Wave 8.1 timezone fix) |
| `Pagination` | ✅ canonical | prev/next + N/total |
| `NavBreadcrumb` | ✅ canonical | breadcrumb router-aware |
| `NativeSelect` | ✅ canonical | HTML select wrapper |
| `FilterChip` + `FilterChipGroup` | ✅ canonical | atom + molecule |
| `ViewModeToggle` | ✅ canonical | binary/N-way toggle |
| `ConfettiBurst` | ✅ canonical | particle motion overlay |
| `SkeletonGrid` + `SkeletonRows` | ✅ canonical | loading placeholders |
| `InlineEditableText` | ✅ canonical | atom inline edit |
| `MarkdownDocPanel` | ✅ canonical | composition wrapper de MarkdownView |
| `ClickableRow` | 🗑️ deletar pós-migração | 4 pages ainda usam — migrar pra AppTable em 8.2.2 |
| `SortableTableHeader` | 🗑️ deletar pós-migração | mesma history |

### Data / Entries / Sessions (5)

| Component | Decisão | Razão |
|---|---|---|
| `data/AppTable` | ✅ canonical | declarative sortable table (Wave 6.2 CRM lift) |
| `entries/EntriesTable` | ⚠️ refactor | usa CSS Grid hardcoded — refactor pra AppTable em 8.2.2 |
| `sessions/SessionsTable` | ✅ canonical | já usa AppTable corretamente |
| `sessions/SessionNameEditor` | ⚠️ refactor | duplica state machine de InlineEditableText — refactor pra usar InlineEditableText |
| `sessions/SessionTimeFilters` | ⚠️ refactor | duplica preset chips do DateRangeFilter — refactor pra reuse `<DateRangeFilter />` + `<GapSlider />` |
| `sessions/SessionTimeScatterChart` | ✅ canonical | scatter plot specialized |
| `sessions/GapSlider` | ✅ canonical | range + presets specialized |

### Dashboard (10)

| Component | Decisão | Razão |
|---|---|---|
| `DashboardFilters` | ✅ canonical | wrapper de DateRangeFilter + extras |
| `SummaryCards` | ✅ canonical | grid de StatCards |
| `WebhookPing` | ✅ canonical | empty state + pulse loop |
| `PlanIndicator` | ✅ canonical | progress + reset info |
| `DailyBudgetProgress` | ✅ canonical | KPI variant "progress inline" (anatomia diferente de StatCard/KpiBox) |
| `BudgetAlert` | ✅ canonical | dismissible alert daily |
| `MonthNarrative` | ✅ canonical | text narrative gradient |
| `DailyCostChart` | ✅ canonical | stacked area por família (multi-series) |
| `CostByModelChart` | ⚠️ DUPLICATA | mesma anatomia de `charts/ModelPieChart` — só wrap diferente |
| `CostBySourceChart` | ⚠️ refactor | mesma estrutura pie+wrap — generalizar com primitive PieChart canonical |

### Analytics (8)

| Component | Decisão |
|---|---|
| `ContributionGraph` | ✅ canonical (Wave 8.1 atualizada — click+detail) |
| `HeatmapWeekHour` | ✅ canonical (Wave 7.6 click+detail) |
| `KpiBox` | ✅ canonical | KPI variant "inline icon + delta" |
| `DeltaBadge` | ✅ canonical |
| `PeriodComparisonGrid` | ✅ canonical |
| `StreaksKpiGrid` | ✅ canonical (uses KpiBox) |
| `ProjectComparison` | ⚠️ inline table | tabela hardcoded inline (linha 88-115) — refactor pra AppTable em 8.2.2 |
| `AchievementNotifier` | ✅ canonical |

### Charts (2)

| Component | Decisão |
|---|---|
| `ModelPieChart` | ✅ canonical (preferred) |
| `DailyCostAreaChart` | ✅ canonical (single series, diferente de DailyCostChart stacked) |

### Settings (4)

| Component | Decisão | Razão |
|---|---|---|
| `SettingsForm` | ⚠️ inconsistência | usa `surface.section + surfaceHeader + surfaceContent` direto em vez de `<Section>` — padronizar pra `<Section>` |
| `WebhookInfo` | ⚠️ refactor | (a) usa `ui/table` na pricing list — migrar pra AppTable; (b) usa inline `<table>` na fields list (linha 152) — também migrar |
| `CsvImport` | ⚠️ refactor | usa `ui/table` no preview — migrar pra AppTable |
| `PricingDrawer` | ✅ canonical (Wave 7.3) |

### Achievements (3) — todos canonical

`BadgeCard`, `BadgeCategorySection`, `TierProgressBar`. ✅ canonical.

### Admin (1)

| Component | Decisão |
|---|---|
| `UserManagement` | ⚠️ refactor | usa `ui/table` — migrar pra AppTable |

### Auth (2)

| Component | Decisão |
|---|---|
| `LoginForm` | ⚠️ duplicação parcial | 95% mesma estrutura de RegisterForm (form fields + isPendingApproval state) — pode extrair `<AuthFormShell>` molecule |
| `RegisterForm` | ⚠️ duplicação parcial | idem |

### Onboarding (1)

| Component | Decisão |
|---|---|
| `OnboardingWizard` | ✅ canonical | mas tem subcomponentes inline (`WelcomeStep`, `HookStep`, `PricingStep`, `BudgetStep`, `DoneStep`, `FeatureChip`, `PricingOption`, `StepIndicator`) — manter inline (contextual) |

**Sub-pattern reusable:** `PricingOption` (linha 449) é card-selecionável com border accent — variant útil pra DS. **Documentar como CARD-SELECT primitive em CRM-MATCH-MAP.md**.

### Projects (2) — canonical

`ProjectHeaderEditable`, `AddSessionDialog`. ✅ canonical.

### Skills (2) — canonical

`SkillFileTree`, `SkillSearch`. ✅ canonical.

### Search (1)

`GlobalSearch`. ✅ canonical (Cmd+K Fuse.js).

### Markdown (1)

`MarkdownView`. ✅ canonical.

### Forms (1)

`FormField`. ✅ canonical (Wave 6.5 lift).

### Root (3)

| Component | Decisão | Razão |
|---|---|---|
| `ErrorBoundary` | ⚠️ DUPLICATA estrutural | mesma estrutura de RouteErrorBoundary; tem token drift (`text-red-400`/`text-red-500/30` hardcoded em vez de `text-destructive`); modo full-reload |
| `RouteErrorBoundary` | ✅ canonical (preferred) | navigate `/dashboard` em vez de full reload |
| `ShortcutsOverlay` | ✅ canonical (lista atalhos teclado) |

**Decisão Boundary:** unificar em `<ErrorBoundary mode="full" \| "route" />` OU manter ambos mas trocar `text-red-*` por tokens canonical (`text-destructive`/`bg-destructive/10`).

### Hooks (17) — todos canonical

Todos têm propósitos distintos: `useDashboard`, `useAnalytics`, `useSessions`, `useSessionDetail`, `useSessionTime`, `useProjects`, `useEntries`, `useSettings`, `useSkills`, `useSystemPrompts`, `useAchievements`, `usePlanStatus`, `useImport`, `useCustomPricing`, `useCountUp`, `useDebounce`, `useLocalStorage`. ✅ MANTER all.

---

## 2. Duplicações categorizadas

### 2.1 Tabelas (4 implementações → 1 canonical)

**Estado atual:**
- `ui/table.tsx` — HTML semantic (4 callsites: WebhookInfo, CsvImport, UserManagement)
- `data/AppTable.tsx` — CSS Grid declarative sortable (canonical, Wave 6.2)
- `entries/EntriesTable.tsx` — CSS Grid hardcoded 10 cols
- `sessions/SessionsTable.tsx` — usa AppTable ✅
- `analytics/ProjectComparison.tsx` — inline `<table>` linha 88-115

**Plano consolidação:**
1. Refactor `EntriesTable` pra `AppTable<Entry>` com columns config
2. Refactor `WebhookInfo` (2 lugares) pra AppTable
3. Refactor `CsvImport` preview pra AppTable
4. Refactor `UserManagement` pra AppTable
5. Refactor `ProjectComparison` inline `<table>` pra AppTable
6. **Após migração:** delete `ui/table.tsx`

### 2.2 Pies (3 implementações → 1 primitive)

**Estado atual:**
- `dashboard/CostByModelChart` — pie + Section wrap
- `charts/ModelPieChart` — pie sem wrap (canonical)
- `dashboard/CostBySourceChart` — pie + Section wrap, source kebab

**Plano consolidação:**
1. Manter `charts/ModelPieChart` como primitive canonical (sem wrap)
2. Generalizar pra aceitar `data + colors + labelFn` props (suporta model OR source)
3. Refactor `dashboard/CostByModelChart` virar wrapper Section + `<ModelPieChart />`
4. Refactor `dashboard/CostBySourceChart` idem (passa `SOURCE_COLORS` + `displayLabel` como props)
5. OU: renomear `ModelPieChart` → `PieChart` canonical genérico

### 2.3 Inline edits (2 → 1)

**Estado atual:**
- `shared/InlineEditableText` — canonical (renderDisplay function)
- `sessions/SessionNameEditor` — duplica state machine, hardcoded pra session name

**Plano:** refactor `SessionNameEditor` pra usar `<InlineEditableText>` internamente, mantendo `generateSmartName` placeholder logic.

### 2.4 Date filters (2 → 1)

**Estado atual:**
- `shared/DateRangeFilter` — canonical (presets configuráveis)
- `sessions/SessionTimeFilters` — duplica preset row hardcoded (Hoje/7d/30d/Este mês) + inputs date manuais + GapSlider

**Plano:** refactor `SessionTimeFilters` pra renderizar `<DateRangeFilter presets={...} />` + `<GapSlider />` lado-a-lado em surface.section.

### 2.5 KPI tiles (3 anatomias)

**Estado atual:**
- `StatCard` — chip + divider + 28px
- `KpiBox` — inline icon + 28px + delta
- `DailyBudgetProgress` — progress bar + label

**Decisão:** NÃO consolidar agora. 3 anatomias distintas com casos de uso reais. Avaliar após Wave 8.2.3 (cross-check CRM) — se CRM tem KPI canonical único, alinhar.

### 2.6 Error boundaries (2 → 1)

**Estado atual:**
- `ErrorBoundary` — full reload + token drift
- `RouteErrorBoundary` — navigate /dashboard + tokens (preferred)

**Plano:** unificar em `<ErrorBoundary mode="full" \| "route" />` OR keep both + corrigir tokens em ErrorBoundary.

### 2.7 Auth forms (2 com 95% overlap)

**Estado atual:**
- `LoginForm` — email + password + error + isPendingApproval
- `RegisterForm` — email + password + confirm + error + isPendingApproval

**Plano:** opcional — extrair `<AuthFormShell>` molecule com slots pra fields. Baixa prioridade (overhead extração ≈ ganho).

### 2.8 Surface system (2 paths)

**Estado atual:**
- `<Section>` component — wrapper com title/actions/flush
- `surface.section + surfaceHeader + surfaceContent` direto — usado em `SettingsForm`, `CostByModelChart`, `CostBySourceChart`, `DailyCostChart`, `PlanIndicator`, `SessionTimeFilters`

**Plano:** padronizar pra `<Section>` em todos casos OR documentar quando usar cada. Decisão Patrick em 8.2.3.

---

## 3. Plano consolidação Wave 8.2.2

Sequência de execução (dependências entre tasks):

### Lote A — Tabela canonical (3-5h)

1. Refactor `EntriesTable` → `AppTable<Entry>`
2. Refactor `WebhookInfo` (2 callsites de `ui/table`) → `AppTable`
3. Refactor `CsvImport` preview → `AppTable`
4. Refactor `UserManagement` → `AppTable`
5. Refactor `ProjectComparison` inline table → `AppTable`
6. Migrar pages que usam `ClickableRow` + `SortableTableHeader`:
   - `SystemPromptsPage`
   - `SkillsPage`
   - `ProjectDetailPage`
   - `ProjectsPage`
7. Delete `ui/table.tsx`
8. Delete `shared/ClickableRow.tsx`
9. Delete `shared/SortableTableHeader.tsx`

### Lote B — Charts pies (1-2h)

1. Generalize `charts/ModelPieChart` pra aceitar `colors + labelFn` props
2. Refactor `dashboard/CostByModelChart` → wrapper Section + ModelPieChart
3. Refactor `dashboard/CostBySourceChart` idem

### Lote C — Inline edit + date filter consolidation (1-2h)

1. Refactor `SessionNameEditor` → wrapper `<InlineEditableText>` + smart placeholder
2. Refactor `SessionTimeFilters` → composição `<DateRangeFilter>` + `<GapSlider>`

### Lote D — Error boundary + tokens (30min)

1. Unify `ErrorBoundary` + `RouteErrorBoundary` (mode prop) OR fix tokens em ErrorBoundary
2. Replace `text-red-*` por `text-destructive` / `bg-destructive/10`

### Lote E — Surface system (30min)

1. Padronizar `<Section>` em SettingsForm + outros que usam helpers diretamente
2. (Opcional) extrair `<AuthFormShell>` se ganho > overhead

**Total estimado:** 6-10h (Lote A é o pesado)

**Ordem recomendada:** A → B → C → D → E (dependências quebram E pode ir paralelo)

---

## 4. Componentes que viram candidatos a primitive no DS final

Pra documentar em Wave 8.2.5 (`CANDIDATES-FOR-DS.md`):

| Tracker component | Por quê DS canonical |
|---|---|
| `AppTable` | Tabela declarativa CSS Grid sortable — pattern canonical |
| `StatCard` | KPI tile com chip + divider |
| `KpiBox` | KPI inline com delta |
| `FilterChip` + `FilterChipGroup` | Atom + molecule pra filters |
| `ViewModeToggle` | Binary/N-way toggle |
| `ConfettiBurst` | Celebration motion overlay |
| `OnboardingWizard.PricingOption` | Card-selectable variant |
| `BadgeCard` | Achievement tile com motion |
| `TierProgressBar` | Progress com milestones |
| `ContributionGraph` | GitHub-style heatmap (Wave 8.1) |
| `HeatmapWeekHour` | 7×24 heatmap |
| `StreakCounter` | Streak counter sidebar |
| `WebhookPing` | Empty state pulse loop |
| `MonthNarrative` | Narrative gradient text |
| `PricingDrawer` | Right-anchored side panel pattern |
| `OnboardingWizard` | Multi-step wizard pattern |
| `GlobalSearch` | Cmd+K search dialog |

---

## 5. Output / GATE Patrick

**Pergunta gate:**

> Patrick valida lista de duplicações + plano consolidação Lote A→E?

**Se OK:** prossigo Wave 8.2.2 (Lote A primeiro). Estimativa 6-10h em 2-3 sessões.

**Se ajustar:** Patrick aponta o que mudar (pular lote, prioridade diferente, etc).

**Se descartar dedup:** vai direto pra Wave 8.2.3 (cross-check CRM) e tracker fica com duplicação. Não recomendo — duplicação amplifica custo de migração DS.
