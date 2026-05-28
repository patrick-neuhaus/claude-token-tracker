# Match-Map tracker → anti-ai DS

> **Wave 8.2.3** · 2026-05-06 · **GATE Patrick respondido 2026-05-06**
> **Source CRM:** `anti-ai-design-system/ui_kits/default/index.html` (`?demo=crm`)
> **Source Library:** `anti-ai-design-system/ui_kits/default/components/`
> **Wiki template:** ❌ ignorado (não-aprovado Patrick)
>
> ## Regras absolutas (Patrick 2026-05-06)
>
> 1. **DS SEMPRE ganha vs tracker.** Sem dúvida. Tracker adopta DS.
> 2. **CRM template > library** quando ambos têm o mesmo componente (CRM aprovado, mais atualizado).
> 3. **Exceção AUTH:** library tem `LoginScreen + RegisterScreen + ForgotPasswordScreen + ResetPasswordScreen + ConfirmEmailScreen` — mais completo que CRM. **Library ganha em auth.**
> 4. Tracker NÃO copia UX CRM (kanban/leads/pipeline) — só componentes/visual.

## TL;DR (pós-GATE Patrick)

| Bucket | Count | Ação Wave 8.2.4 |
|---|---|---|
| ✅ idêntico DS — confirmar imports | 12 | Verify tokens/API |
| ⚠️ adaptar tracker pro DS | 26 | Refactor visual (CRM-style ou library) |
| 🆕 tracker-only — parking lot | 22 | Documentar (Wave 8.2.5 ou futuro Wiki) |
| ⚪ infra/hook (sem visual) | 15 | Sem ação |
| **Total** | 75 | — |

🟡 ambíguos (8 anteriores) → **resolvidos** pelas regras absolutas. Mergeados em ⚠️.

## 1. Patterns visuais CRM (extraídos)

Antes de mapear componente-a-componente, registro padrões CRM usados como "régua":

| Pattern CRM | Como aparece | Aplicar tracker? |
|---|---|---|
| `page-content` wrapper | div container com gap stack | já existe (AppLayout) |
| `page-header` + `page-header-stack` | crumb mono + h2 display + sub | tracker usa PageHeader — alinhar tipografia |
| `page-crumb` (mono uppercase, muted) | "crm · vendas · dashboard" | tracker NavBreadcrumb — adaptar visual |
| `page-title` (display font Lora) | h2 grande | tracker PageHeader title — confirmar fonte |
| `page-sub` (muted-foreground) | subtitle line | tracker já tem subtitle — alinhar |
| `page-actions` slot direito | botões primary/secondary | tracker já tem actions slot ✅ |
| `kpis` grid `repeat(auto-fit,minmax(160px,1fr))` | 4 KPIs em row | tracker SummaryCards usa md:grid-cols-3 — re-config |
| `kpi` (kpi-label uppercase + kpi-value 22-28px + kpi-delta up/dn) | Tile com delta colorido | tracker StatCard tem chip+divider DIFERENTE — ⚠️ adaptar |
| `card` padding 16px 20px header + 4px 20px 20px content | divs simples (no `<Card><CardHeader>`) | tracker surface.section próximo, mas precisa harmonizar paddings |
| `tbl` classe (HTML table) | data list | tracker usa AppTable CSS Grid — ✅ canonical (anti-AI tell: NO `<table>`) |
| `pill` com `dot` inline + status (ok/warn/info/err/neutral) | Status badge com bolinha | tracker Badge não tem dot — ⚠️ adaptar |
| `mono` classe | font-mono pra IDs | tracker usa font-mono inline — alinhar via classe canonical |
| `muted` classe | text-muted-foreground | tracker usa direto — OK |
| `tabs-nav` + `tab-item` active | underline + accent | tracker @base-ui/react Tabs — ⚠️ confirmar visual |
| FilterBar | search + saved views chips + filter chips | tracker FilterChip + DateRangeFilter — diferente, considerar molecule novo |
| CountUpNumber | entry animation | tracker useCountUp ✅ tem |
| Inline SVG charts | FunnelStagesChart (bars), PipelineTrendChart (area+gradient) | tracker usa Recharts — ⚠️ DS prefere SVG inline (anti-AI tell: minimal lib) |

## 2. Mapping por categoria

### 2.1 Layout & Shell (4)

| Tracker | DS canonical | Bucket | Ação |
|---|---|---|---|
| `layout/AppLayout` | `components/layout/AppLayout.jsx` | ✅ idêntico | confirmar imports/tokens batem |
| `layout/Sidebar` | `components/navigation/Sidebar.jsx` (CRM usa AppSidebar wrapper) | ✅ idêntico | já é Wave 6.0 lift — confirmar 272/72px collapsed |
| `layout/StreakCounter` | nada | 🆕 tracker-only | parking lot |
| `navigation/UserMenu` | `components/navigation/UserMenu.jsx` | ⚠️ provavelmente diff | Read library + comparar |

### 2.2 UI Primitives (10)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `ui/button` | `components/base/Button.jsx` (+ `_aa-btn.css`) | ⚠️ diff | tracker usa CVA + base-ui, DS usa classe `aa-btn`. Decisão: manter wrapper tracker mas alinhar tokens |
| `ui/input` | `components/base/Input.jsx` (+ `_aa-input.css`) | ⚠️ diff | mesma — wrapper base-ui ok, alinhar visual |
| `ui/dialog` | `components/display/Dialog.jsx` | ⚠️ diff | base-ui vs DS canonical — confirmar shape |
| `ui/tooltip` | `components/display/Tooltip.jsx` | ⚠️ diff | mesma |
| `ui/tabs` | `components/navigation/Tabs.jsx` | ⚠️ diff | confirmar visual |
| `ui/progress` | `components/display/ProgressBar.jsx` | ✅ similar | confirmar tokens |
| `ui/separator` | `components/display/Separator.jsx` | ✅ similar | OK |
| `ui/badge` | `components/display/Badge.jsx` + `pill` class CRM | ⚠️ diff | CRM tem `pill` com `dot` — tracker Badge não tem. Adaptar |
| `ui/label` | nada explícito DS | 🟡 só library? | **PERGUNTA 1:** library tem Label canonical ou usa native? |
| `ui/skeleton` | `components/display/Skeleton.jsx` | ✅ idêntico | confirmar shimmer animation |

### 2.3 Shared (15)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `shared/PageHeader` | `components/layout/PageHeader.jsx` | ⚠️ diff | DS = Lora display + crumb mono. Tracker NÃO tem crumb embutido — adaptar |
| `shared/DetailHeader` | nada (DS usa NavBreadcrumb separado) | 🆕 tracker-only | parking lot ou refactor pra `PageHeader + Breadcrumb` separados (CRM pattern) |
| `shared/Section` | `components/layout/Section.jsx` | ✅ idêntico (lift Wave 6.x) | confirmar API |
| `shared/EmptyState` | `components/display/EmptyState.jsx` | ✅ idêntico | confirmar |
| `shared/ErrorState` | nada (DS tem só EmptyState) | 🆕 tracker-only | parking lot — variant de EmptyState ou novo |
| `shared/StatCard` | `components/dashboard/StatCard.jsx` (chip+divider) E CRM usa `kpi` simples | ⚠️ diff | DS canonical = chip+divider; CRM template = kpi simples (label+value+delta). **PERGUNTA 2:** qual padrão tracker adota — chip+divider ou kpi simples? |
| `shared/DateRangeFilter` | `components/forms/DateField.jsx` (single date) | 🟡 só library tem DateField | **PERGUNTA 3:** library DateField cobre range? Ou criar molecule DateRangeFilter no DS? |
| `shared/Pagination` | `components/navigation/Pagination.jsx` | ✅ idêntico | confirmar API |
| `shared/NavBreadcrumb` | `components/navigation/Breadcrumb.jsx` | ✅ idêntico | confirmar |
| `shared/NativeSelect` | `components/base/Select.jsx` | ⚠️ diff | DS Select pode ter shape diferente — compare |
| `shared/FilterChip` + `FilterChipGroup` | DS NÃO tem (CRM tem ButtonChips inline) | 🆕 tracker-only | parking lot — proposta: virar primitive `Chip` + `ChipGroup` no DS |
| `shared/ViewModeToggle` | `components/base/ToggleGroup.jsx` | ⚠️ diff | DS ToggleGroup genérico — adaptar tracker pra usar |
| `shared/ConfettiBurst` | nada | 🆕 tracker-only | parking lot — motion-design candidate |
| `shared/SkeletonGrid` + `SkeletonRows` | `components/display/Skeleton.jsx` (atom) | ⚠️ diff | DS = atom, tracker = grid composer. Pode virar pattern DS |
| `shared/InlineEditableText` | nada | 🆕 tracker-only | parking lot — pattern útil DS |
| `shared/MarkdownDocPanel` | nada | 🆕 tracker-only (Wiki-flavored) | parking lot |
| `shared/ClickableRow` | nada (CRM usa `tabIndex+onKeyDown` inline) | 🆕 tracker-only molecule | parking lot ou inline-ize |

### 2.4 Data / Tables (3)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `data/AppTable` | `components/data/AppTable.jsx` (lifted Wave 6.2) | ✅ idêntico | já é canonical lift |
| `entries/EntriesTable` | usa AppTable | ✅ refactored Wave 8.2.2 | OK |
| `sessions/SessionsTable` | usa AppTable | ✅ | OK |
| `data/Table.jsx` | DS library tem `data/Table.jsx` (HTML table) | 🟡 só library | **PERGUNTA 4:** library Table.jsx é HTML semantic ou variant? Tracker NÃO usa, AppTable canonical já cobre |
| `data/ListItem.jsx` | DS library | 🟡 só library | **PERGUNTA 5:** library ListItem cobre o tracker SkillFileTree/MarkdownDocPanel? Ou são casos diferentes? |

### 2.5 Dashboard (10)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `dashboard/DashboardFilters` | nada (CRM inline) | 🆕 tracker-only | parking lot — molecule wrapper |
| `dashboard/SummaryCards` | CRM `kpis` grid + `kpi` | ⚠️ diff | refactor pra usar `kpis` grid layout CRM |
| `dashboard/WebhookPing` | nada | 🆕 tracker-only | parking lot |
| `dashboard/PlanIndicator` | nada (CRM usa ProgressBar inline) | 🆕 tracker-only | parking lot — pode virar variant DS |
| `dashboard/DailyBudgetProgress` | `components/dashboard/MetricCard.jsx`? | 🟡 só library | **PERGUNTA 6:** library MetricCard tem variant "progress inline"? |
| `dashboard/BudgetAlert` | `components/display/Alert.jsx` | ✅ similar | adaptar pra usar Alert canonical |
| `dashboard/MonthNarrative` | nada | 🆕 tracker-only | parking lot |
| `dashboard/DailyCostChart` | `components/dashboard/Chart.jsx` (placeholder?) | 🟡 só library | **PERGUNTA 7:** library Chart.jsx é genérico ou placeholder? Tracker usa Recharts — DS prefere SVG inline (CRM faz assim) |
| `dashboard/CostByModelChart` | nada | 🆕 tracker-only (pie) | parking lot — DS NÃO tem pie chart canonical |
| `dashboard/CostBySourceChart` | nada (mesma history) | 🆕 tracker-only | parking lot |

### 2.6 Charts (2)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `charts/ModelPieChart` | nada | 🆕 tracker-only | parking lot |
| `charts/DailyCostAreaChart` | CRM tem `PipelineTrendChart` SVG inline | ⚠️ diff | tracker usa Recharts, CRM usa SVG inline. **PERGUNTA 8:** migrar pra SVG inline (anti-AI tell, menos bundle) ou manter Recharts? |

### 2.7 Analytics (8)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `analytics/ContributionGraph` | nada | 🆕 tracker-only | parking lot |
| `analytics/HeatmapWeekHour` | nada | 🆕 tracker-only | parking lot |
| `analytics/KpiBox` | CRM `kpi` simples | ⚠️ diff | alinhar com `kpi` CRM |
| `analytics/DeltaBadge` | CRM `kpi-delta` (up/dn classes) | ⚠️ diff | adaptar tracker |
| `analytics/PeriodComparisonGrid` | nada | 🆕 tracker-only | parking lot |
| `analytics/StreaksKpiGrid` | nada | 🆕 tracker-only | parking lot |
| `analytics/ProjectComparison` | usa AppTable (Wave 8.2.2) | ✅ | OK |
| `analytics/AchievementNotifier` | nada | 🆕 tracker-only | parking lot |

### 2.8 Sessions (5)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `sessions/SessionsTable` | AppTable | ✅ | OK |
| `sessions/SessionNameEditor` | nada (CRM não tem inline rename) | 🆕 tracker-only | usa InlineEditableText (parking lot) |
| `sessions/SessionTimeFilters` | nada (CRM usa FilterBar) | 🆕 tracker-only | parking lot — refactor pra DateRangeFilter+GapSlider canonical |
| `sessions/SessionTimeScatterChart` | nada | 🆕 tracker-only | parking lot |
| `sessions/GapSlider` | `components/forms/Slider.jsx`? | 🟡 só library | confirmar Slider library vs custom |

### 2.9 Settings / Admin (4)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `settings/SettingsForm` | `components/screens/SettingsScreen.jsx` (DS lifts TokenEditorPreview) | ⚠️ diff | tracker SettingsForm NÃO tem TokenEditor — refactor pra usar SettingsScreen pattern |
| `settings/WebhookInfo` | nada | 🆕 tracker-only | parking lot |
| `settings/CsvImport` | nada (CRM tem upload em prompt template?) | 🆕 tracker-only | parking lot |
| `settings/PricingDrawer` | `components/display/Drawer.jsx` (canonical) | ⚠️ diff | tracker PricingDrawer custom — refactor pra usar Drawer canonical + content slot |
| `admin/UserManagement` | usa AppTable Wave 8.2.2 | ✅ | OK |

### 2.10 Auth (2)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `auth/LoginForm` | `components/auth/LoginScreen.jsx` (50/50 split CRM-flavored) | ⚠️ diff | tracker tem login dark/light toggle. CRM LoginScreen é monolítico. Refactor pra usar LoginScreen canonical + dark/light slot |
| `auth/RegisterForm` | `components/auth/RegisterScreen.jsx` | ⚠️ diff | mesma history |

### 2.11 Onboarding / Achievements (4)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `onboarding/OnboardingWizard` | `components/forms/Stepper.jsx` (atom) | 🟡 só library | **PERGUNTA já listada via Stepper:** library Stepper = atom (1 step indicator) ou molecule (full wizard)? |
| `achievements/BadgeCard` | nada | 🆕 tracker-only | parking lot — Wiki/gamification primitive |
| `achievements/BadgeCategorySection` | nada | 🆕 tracker-only | parking lot |
| `achievements/TierProgressBar` | nada (extends ProgressBar) | 🆕 tracker-only variant | parking lot |

### 2.12 Search / Markdown / Forms / Skills (5)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `search/GlobalSearch` | `components/forms/Combobox.jsx`? | 🟡 só library | confirmar Combobox cobre Cmd+K |
| `markdown/MarkdownView` | nada | 🆕 tracker-only | parking lot |
| `skills/SkillFileTree` | nada | 🆕 tracker-only | parking lot |
| `skills/SkillSearch` | wraps GlobalSearch ish | 🆕 tracker-only | parking lot |
| `forms/FormField` | `components/forms/FormField.jsx` (lift Wave 6.5) | ✅ idêntico | confirmar |

### 2.13 Projects (2)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `projects/ProjectHeaderEditable` | nada (DS tem PageHeader simples) | 🆕 tracker-only | parking lot — InlineEditableText composição |
| `projects/AddSessionDialog` | `components/display/Dialog.jsx` canonical | ⚠️ diff | refactor pra usar Dialog canonical |

### 2.14 Root (3)

| Tracker | DS | Bucket | Ação |
|---|---|---|---|
| `ErrorBoundary` | nada (DS não cobre) | 🆕 tracker-only | parking lot — token drift fix Wave 8.2 Lote D |
| `RouteErrorBoundary` | nada | 🆕 tracker-only | parking lot |
| `ShortcutsOverlay` | nada | 🆕 tracker-only | parking lot |

### 2.15 Hooks (17) — sem visual

⚪ Não-visuais. Sem ação. (`useDashboard`, `useAnalytics`, etc — manter como estão.)

## 3. Decisões pós-GATE Patrick (2026-05-06)

| # | Pergunta original | Decisão | Razão |
|---|---|---|---|
| 1 | Label | usar `<label>` native ou library Label se tem | regra 1 (DS ganha) |
| 2 | StatCard chip+divider vs kpi simples CRM | **kpi simples CRM** | regra 2 (CRM > library) |
| 3 | DateRangeFilter vs library DateField | adapta tracker pro DS — wrap 2 DateField OR cria DateRangeFilter no DS (Wave 8.2.5 candidate) | regra 1 |
| 4 | library Table.jsx deprecate? | tracker já usa AppTable canonical (Wave 8.2.2) — library Table.jsx não toca tracker | OK Wave 8.2.2 |
| 5 | library ListItem cobre SkillFileTree/MarkdownDocPanel? | parking lot 🆕 (são tracker-specific recursive/markdown — ListItem provável não cobre, mas usar onde fizer sentido) | tracker-specific |
| 6 | library MetricCard variant progress? | DailyBudgetProgress = tracker-specific 🆕 (variant "progress inline" não no DS) | parking lot |
| 7 | Charts SVG inline vs Recharts | **migrar pra SVG inline CRM-style** | regra 1+2 (anti-AI tell + bundle menor + alinha DS) |
| 8 | Recharts overall (5 charts) | **migrar todos pra SVG inline** | regra 1+2 |
| AUTH | LoginForm/RegisterForm | **library auth ganha** — tracker absorve LoginScreen + RegisterScreen + ForgotPasswordScreen + ResetPasswordScreen + ConfirmEmailScreen | exceção AUTH explícita Patrick |

### 8.1 Considerações execução

- **Charts SVG inline (decisão 7+8)**: trabalho pesado. 5 charts atual Recharts → reescrever inline SVG matching CRM style (path/area/circle/line). Estimativa **3-5h** isolado.
- **Auth screens (exceção AUTH)**: tracker absorve 5 screens da library. Estimativa **1-2h**.
- **Re-skin standard (cards, kpi, pill, header crumb, drawer canonical)**: **2-3h**.

**Total Wave 8.2.4: 6-10h** (mantém estimativa anterior).

## 4. Spec re-skin Wave 8.2.4 (proposta)

Após Patrick responder 8 perguntas, executar em lotes:

### Lote R1 — Tipografia + tokens base (~30min)
- Confirmar tokens `--primary --accent --background --foreground --card --border` batem CRM Light/Dark
- Aplicar fontes: Lora (display) + Poppins (body) + Geist Mono (numerals)
- Garantir `font-mono` + `tabular-nums` em IDs/numbers

### Lote R2 — PageHeader alignment (~30min)
- Adicionar `page-crumb` (mono uppercase) nos headers tracker
- Garantir hierarchy: crumb → h2 display → sub
- Migrar DetailHeader → PageHeader + NavBreadcrumb

### Lote R3 — KPI alignment (~1h)
- Decisão pergunta 2 (StatCard chip+divider vs kpi simples)
- Refactor SummaryCards pra grid `repeat(auto-fit,minmax(160px,1fr))` CRM-style
- DeltaBadge alinhar com `kpi-delta up/dn` classes

### Lote R4 — Pill / Badge (~30min)
- Adicionar `dot` inline em Badge tracker (status pills com bolinha CRM)
- Status classes: ok (success) / warn / info / err / neutral

### Lote R5 — Surfaces / cards (~30min)
- Padding standard CRM: 16px 20px header + 4px 20px 20px content
- Verify tracker `surface.section` bate

### Lote R6 — Charts decisão (~2-4h se migrar SVG, ou 0 se mantém Recharts)
- Depende pergunta 7-8

### Lote R7 — Auth screens (~1h)
- LoginForm refactor pra usar LoginScreen canonical + dark/light slot

### Lote R8 — Drawer canonical (~30min)
- PricingDrawer refactor pra Drawer canonical da library

**Estimativa total Wave 8.2.4:** 4-9h (depende pergunta 7-8 charts).

## 5. Parking lot — tracker-specific (Wave 8.2.5)

Componentes tracker-only (22 listados acima como 🆕). Documentar pra possível futuro template Wiki ou DS extension:

- StreakCounter
- ContributionGraph + HeatmapWeekHour (heatmaps)
- BadgeCard + BadgeCategorySection + TierProgressBar (achievements)
- ModelPieChart + CostByModel/Source (pies)
- KpiBox + DeltaBadge + PeriodComparisonGrid + StreaksKpiGrid (KPI variants)
- WebhookPing + WebhookInfo + CsvImport (settings)
- MonthNarrative + PlanIndicator + DailyBudgetProgress (dashboard variants)
- MarkdownView + MarkdownDocPanel + SkillFileTree (Wiki-knowledge)
- DashboardFilters + SessionTimeFilters (filter molecules)
- AchievementNotifier + ConfettiBurst (motion)
- ShortcutsOverlay
- DetailHeader (variant PageHeader)
- ProjectHeaderEditable
- ErrorBoundary + RouteErrorBoundary
- InlineEditableText (atom inline edit)
- ClickableRow + handleEnterSpaceKey (molecule clickable list)
- SkeletonGrid + SkeletonRows (composer skeletons)

Patrick decide depois (Wave 8.2.5) quais promover pra DS canonical.

## 6. GATE Patrick — RESPONDIDO 2026-05-06

✅ Regras absolutas estabelecidas (DS ganha, CRM > library, exceção AUTH).
✅ 8 perguntas resolvidas via regras (seção 3).
🚧 **Próximo gate:** Patrick aprova spec re-skin Wave 8.2.4 (seção 4) → pau na máquina.

## 7. Wave 8.2.4 — Spec re-skin refinado

### Lote R1 — Tipografia + tokens base (~30min)
Aplica preset `Ops Default` ou `CRM Light/Dark` (Patrick decide qual fica). Tokens via `:root`. Fontes: Lora display + Poppins body + Geist Mono numerals. Sweep `font-mono` + `tabular-nums` em IDs/numbers.

### Lote R2 — PageHeader + crumb (~30min)
Adiciona `page-crumb` mono uppercase em todo PageHeader. Migra DetailHeader → PageHeader + NavBreadcrumb separados.

### Lote R3 — KPI simples CRM-style (~1h)
Refactor SummaryCards + StatCard pra `kpis` grid `repeat(auto-fit,minmax(160px,1fr))` + `kpi` simples (label uppercase + value 22-28px + delta up/dn inline). Remove chip+divider atual.

### Lote R4 — Pill + dot inline (~30min)
Adiciona `<span className="dot"/>` antes de label em todo Badge status. Classes: ok/warn/info/err/neutral. Affecta Badge tracker, SessionsTable, EntriesTable, etc.

### Lote R5 — Drawer canonical + Dialog (~45min)
PricingDrawer migra pra `components/display/Drawer.jsx` library. AddSessionDialog confirma alinhamento `components/display/Dialog.jsx`.

### Lote R6 — ToggleGroup + ListItem (~30min)
ViewModeToggle vira wrap de `components/base/ToggleGroup.jsx`. SkillFileTree explora se `components/data/ListItem.jsx` cobre nodes (provável não — fica tracker-specific).

### Lote R7 — AUTH screens (1-2h) **exceção library**
Tracker LoginForm + RegisterForm → absorve `components/auth/{LoginScreen,RegisterScreen,ForgotPasswordScreen,ResetPasswordScreen,ConfirmEmailScreen}.jsx`. Mantém toggle dark/light tracker como prop adicional.

### Lote R8 — Charts SVG inline (3-5h) **HEAVY**
Migra Recharts → SVG inline matching CRM (FunnelStagesChart bars, PipelineTrendChart area+line):
- DailyCostChart (stacked area família) → SVG path multi-series
- ModelPieChart → SVG arc inline
- DailyCostAreaChart → SVG area+gradient
- ProjectComparison LineChart → SVG path multi-series
- SessionTimeScatterChart → SVG circles

Bundle savings ~50KB (drop recharts). Pode atrasar se complexidade alta.

### Sequência recomendada
R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8

Cada lote = sub-gate Patrick (visual review). R8 pode subdividir (1 chart por sub-wave).

## 8. GATE final pré-execução

> ⛔ **Patrick aprova:**
> 1. Lista lotes R1→R8 + ordem
> 2. Estimativa total 6-10h em 2-3 sessões
> 3. R8 pode ser deferido se prioridade outra
> 4. Tema preset CRM Light ou CRM Dark? (ou Ops Default?)

Resposta = começa R1 imediato.
