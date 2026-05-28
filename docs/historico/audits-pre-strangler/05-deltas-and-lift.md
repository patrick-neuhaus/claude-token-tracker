# Wave 5 — DS Deltas + Component Lift Map

> **Sessão:** 2 / **Wave:** 5 / **Status:** ✅ done
> **Skills:** `design-system-audit --audit` + `component-architect --plan` (combinado)
> **Inputs:** audits/04-tokens.{json,css} (Wave 4) + tracker components atuais (74 .tsx) + 61 canonical CRM template (anti-ai-design-system/ui_kits/default/components/)

---

## Sumário executivo

| Categoria | Count | % |
|---|---|---|
| **Tracker components atuais** | 74 .tsx | 100% |
| ✅ ENCAIXAR (lift direto, signature compatível) | 7 | 9% |
| ⚠️ MODIFICAR (lift + adapter shim) | 32 | 43% |
| ❌ MANTÉM tracker-specific (não tem canonical) | 28 | 38% |
| 🗑 DELETE Wave 7 (admin/multi-user) | 1 | 1% |
| 🆕 CRIAR (não existe nem tracker nem DS) | 6 (+1 backlog) | 8% |

**Trabalho Wave 6:** ~32 components requerem migration adapter (rename props, port .jsx → .tsx, validar functional). Estimativa 12-16h dev. Page-by-page por job frequency (master plan §"Sub-waves Wave 6").

**Components a CRIAR:** spec detalhado em `audits/05-component-architect.md` (anatomy/slots/variants/contratos a11y).

---

## A) Lift map definitivo per categoria

### A.1 — `client/src/components/ui/` (shadcn primitives, 11 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `button.tsx` | ⚠️ MODIFICAR | `base/Button.jsx` (aa-btn canonical) | DS usa CSS classe (`.aa-btn`, `.aa-btn--accent`, `--outline`, `--ghost`, `--sm`, `--lg`). Tracker usa shadcn variants. Adapter: portar aa-btn.css + criar `<Button>` wrapper TS preservando API shadcn (variant/size props), classes mappable. |
| `badge.tsx` | ⚠️ MODIFICAR | `display/Badge.jsx` + `display/StatusBadge.jsx` | DS separa Badge (neutral) vs StatusBadge (intent: success/warning/error/info). Tracker tem `<Badge variant>`. Split em 2 componentes ou variant union expandida. |
| `dialog.tsx` | ⚠️ MODIFICAR | `display/Dialog.jsx` | DS canonical tem focus trap + Icon.X close + motion tokens. Tracker usa Radix shadcn. Lift: substituir wrapper, manter Radix interno (focus trap nativo). |
| `input.tsx` | ⚠️ MODIFICAR | `base/Input.jsx` (aa-input canonical) | DS usa `.aa-input` CSS. Tracker shadcn classes. Adapter: portar aa-input.css + wrapper TS. |
| `label.tsx` | ⚠️ MODIFICAR | DS `forms/FormField.jsx` (label-float pattern) | DS encapsula label+input em FormField. Tracker tem label separado. Wave 6 form refactor unifica. |
| `progress.tsx` | ⚠️ MODIFICAR | `display/ProgressBar.jsx` | DS: `{value, max, label, showPercent, intent, height}`. Tracker shadcn: `{value, className}`. Mismatch: `intent:enum` vs `color`. |
| `separator.tsx` | ✅ ENCAIXAR | `display/Separator.jsx` | Signature compatível (1:1 lift). |
| `skeleton.tsx` | ⚠️ MODIFICAR | `display/Skeleton.jsx` | DS: `{width, height, radius, label, style}`. Tracker shadcn: `{className}`. Adapter: width/height aceitam string|number. |
| `table.tsx` | ⚠️ MODIFICAR | `data/Table.jsx` (HTML table semantic) ou `data/AppTable.jsx` (grid CSS) | Decisão Wave 6: Table.jsx pra dados puros, AppTable.jsx pra interactive (sort/click/dense). Tracker SessionsTable usa pattern → AppTable. |
| `tabs.tsx` | ✅ ENCAIXAR | `navigation/Tabs.jsx` | Radix wrapper, signature 1:1. |
| `tooltip.tsx` | ✅ ENCAIXAR | `display/Tooltip.jsx` | Floating UI / Radix base. Já alinhado. |

### A.2 — `client/src/components/shared/` (general-purpose, 18 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `StatCard.tsx` | ⚠️ MODIFICAR | `dashboard/StatCard.jsx` | DS: `{icon, value, label, sublabel, trend, loading, animate}`. Tracker: `{icon, label, value, iconColor, hint}`. **High mismatch** — DS tem count-up animation built-in (Wave 4 P3 spec #10). Adapter: rename `hint`→`sublabel`, drop `iconColor` (DS força accent-tinted), add `trend`+`loading`+`animate`. Migration ~5 call sites. |
| `EmptyState.tsx` | ⚠️ MODIFICAR | `display/EmptyState.jsx` | DS: `{icon, title, description, action}`. Tracker: `{icon, message, description, action, className}`. Rename `message`→`title`. Drop `className` (DS canonical não tem). |
| `ErrorState.tsx` | ⚠️ MODIFICAR | `display/Alert.jsx` (intent="destructive") | DS Alert tem `{intent, title, description, action}`. Tracker ErrorState tracker-specific shape. Refactor pra Alert variante. |
| `PageHeader.tsx` | ⚠️ MODIFICAR | `layout/PageHeader.jsx` | DS PageHeader tem display Lora (canonical) + sub-copy + action slot. Tracker usa Geist. Wave 4 troca pra IBM Plex Sans display via tokens — alinha automaticamente. |
| `Section.tsx` | ✅ ENCAIXAR | `layout/Section.jsx` | Compat 1:1. |
| `DateRangeFilter.tsx` | ❌ MANTÉM | tracker-specific | Filtro de datas custom (presets 7d/30d/90d/MTD/YTD/custom). DS `forms/DateField.jsx` cobre só single-date. Não tem RangePicker canonical. |
| `SkeletonGrid.tsx` | ⚠️ MODIFICAR | wrapper de N × `display/Skeleton.jsx` | Refactor pra usar DS Skeleton em loop. |
| `SortableTableHeader.tsx` | ❌ MANTÉM | tracker-specific | DS `data/AppTable.jsx` integra sort interno. Mas tracker tem column types complexas. Mantém + integra no AppTable Wave 6. |
| `ClickableRow.tsx` | ⚠️ MODIFICAR | DS `data/AppTable.jsx` `rowProps` integration | AppTable canonical aceita `onRowClick` + keyboard support nativo. Drop ClickableRow wrapper, usa rowProps. |
| `DetailHeader.tsx` | ⚠️ MODIFICAR | `layout/PageHeader.jsx` (variante detail) | Rename pra PageHeader + variante "detail" prop. Reduces 1 component. |
| `FilterChip.tsx` | ⚠️ MODIFICAR | `display/Tag.jsx` (variante filter) | DS Tag tem `{label, intent, dismissible, onDismiss}`. Tracker FilterChip similar. Lift direto. |
| `InlineEditableText.tsx` | ❌ MANTÉM | tracker-specific | Pattern editable inline (click-to-edit + ENTER/ESC). DS não tem. Mantém custom — útil no projeto. |
| `MarkdownDocPanel.tsx` | ❌ MANTÉM | tracker-specific | Markdown rendering wrapper. |
| `NativeSelect.tsx` | ⚠️ MODIFICAR | `base/Select.jsx` | DS Select wrapped Radix + canonical styling. Lift direto. |
| `NavBreadcrumb.tsx` | ⚠️ MODIFICAR | `navigation/Breadcrumb.jsx` | DS Breadcrumb canonical signature. Migration trivial. |
| `Pagination.tsx` | ⚠️ MODIFICAR | `navigation/Pagination.jsx` | DS Pagination canonical. Lift direto. |
| `ViewModeToggle.tsx` | ⚠️ MODIFICAR | `base/ToggleGroup.jsx` | DS ToggleGroup é canonical Radix wrapper. Lift direto preservando icons. |

### A.3 — `client/src/components/layout/` (2 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `AppLayout.tsx` | ⚠️ MODIFICAR | `layout/AppLayout.jsx` + `layout/PageShell.jsx` (composição) | DS separa AppLayout (sidebar + main) + PageShell (container conteúdo). Tracker tudo num só. Refactor decomposes. |
| `Sidebar.tsx` | ⚠️ MODIFICAR | `navigation/Sidebar.jsx` | DS canonical 272/72px collapsible + brand color drama (Wave 4 fix: gray-900 bg + accent indicator, NÃO navy fill que falha). Tracker tem PlanCountdown gem custom — mantém via slot `<SidebarFooter>` em DS Sidebar. |

### A.4 — `client/src/components/dashboard/` (9 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `SummaryCards.tsx` | ⚠️ MODIFICAR | `dashboard/KpiGrid.jsx` + `dashboard/MetricCard.jsx` | DS tem KpiGrid (layout) + MetricCard (cell). Tracker SummaryCards tudo junto. Decompose. |
| `PlanIndicator.tsx` | ❌ MANTÉM | tracker-specific | Plan countdown gem ($X acima do plano / Falta $Y pro breakeven). Custom. |
| `DashboardFilters.tsx` | ❌ MANTÉM | tracker-specific | Filters sub-set específico Dashboard. |
| `BudgetAlert.tsx` | ⚠️ MODIFICAR | `display/Alert.jsx` (intent variants) | Refactor pra Alert generic (intent="warning" / "destructive"). |
| `DailyBudgetProgress.tsx` | ⚠️ MODIFICAR | `display/ProgressBar.jsx` (variante budget) | Refactor pra ProgressBar com label custom. |
| `CostByModelChart.tsx` | ⚠️ MODIFICAR | `dashboard/Chart.jsx` (variante pie/donut) | DS Chart canonical wrapper Recharts. Migration. |
| `CostBySourceChart.tsx` | ⚠️ MODIFICAR | idem | idem |
| `DailyCostChart.tsx` | ⚠️ MODIFICAR | `dashboard/Chart.jsx` (variante area/line) | idem |
| `MonthNarrative.tsx` | ❌ MANTÉM | tracker-specific | Texto narrativo gerado server-side. |

### A.5 — `client/src/components/charts/` (2 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `DailyCostAreaChart.tsx` | ⚠️ MODIFICAR | `dashboard/Chart.jsx` (area variant) | Migration |
| `ModelPieChart.tsx` | ⚠️ MODIFICAR | `dashboard/Chart.jsx` (pie variant) | Migration |

### A.6 — `client/src/components/sessions/` (5 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `SessionsTable.tsx` | ⚠️ MODIFICAR | `data/AppTable.jsx` | DS AppTable canonical grid CSS + sort/click/dense. **MAJOR migration** — tracker SessionsTable tem columns custom + actions cell. Lift principal Wave 6.2. |
| `SessionTimeScatterChart.tsx` | ⚠️ MODIFICAR | `dashboard/Chart.jsx` (scatter variant) | Recharts wrapper |
| `SessionNameEditor.tsx` | ⚠️ MODIFICAR | `forms/FormField.jsx` (inline edit) | Combina InlineEditableText + FormField pattern |
| `SessionTimeFilters.tsx` | ❌ MANTÉM | tracker-specific | Filtros sessão time-specific |
| `GapSlider.tsx` | ⚠️ MODIFICAR | `forms/Slider.jsx` | DS Slider canonical signature |

### A.7 — `client/src/components/entries/` (1 component)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `EntriesTable.tsx` | ⚠️ MODIFICAR | `data/AppTable.jsx` | Migration similar a SessionsTable |

### A.8 — `client/src/components/projects/` (2 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `AddSessionDialog.tsx` | ⚠️ MODIFICAR | `display/Dialog.jsx` + `forms/FormField.jsx` | Refactor pra usar DS Dialog + FormFields canonical |
| `ProjectHeaderEditable.tsx` | ⚠️ MODIFICAR | `layout/PageHeader.jsx` + InlineEditableText | Combina patterns |

### A.9 — `client/src/components/auth/` (2 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `LoginForm.tsx` | ⚠️ MODIFICAR | `auth/LoginScreen.jsx` (50/50 split) | **MAJOR refactor** — DS canonical tem hero left + form right (50/50). Tracker centered card simples. F7 finding (Wave 2 P1) recomenda: aplica DS LoginScreen pra brand presence Artemis + hero motion #18 (Wave 3 spec). Lift principal Wave 6.4. |
| `RegisterForm.tsx` | ⚠️ MODIFICAR | `auth/RegisterScreen.jsx` | Similar refactor |

### A.10 — `client/src/components/analytics/` (8 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `AchievementNotifier.tsx` | ⚠️ MODIFICAR | tracker-specific (Wave 6.7 upgrade) | Wave 3 spec #17 — upgrade com confetti + ease-spring overshoot |
| `ContributionGraph.tsx` | ❌ MANTÉM | tracker-specific | Heatmap GitHub-style, custom |
| `DeltaBadge.tsx` | ⚠️ MODIFICAR | `display/Badge.jsx` (variante delta) | DS Badge tem variant. Adapter pra delta intent (positive/negative + color). UX_AUDIT_SPEC F10 fix: cor invertida (positive=vermelho atual = bug) |
| `HeatmapWeekHour.tsx` | ❌ MANTÉM | tracker-specific | Heatmap custom |
| `KpiBox.tsx` | ⚠️ MODIFICAR | `dashboard/MetricCard.jsx` | Migration. Possível dedup com SummaryCards após refactor |
| `PeriodComparisonGrid.tsx` | ❌ MANTÉM | tracker-specific | Grid comparativo custom |
| `ProjectComparison.tsx` | ❌ MANTÉM | tracker-specific | Comparação projetos custom |
| `StreaksKpiGrid.tsx` | ⚠️ MODIFICAR | `dashboard/KpiGrid.jsx` (variante streaks) | Lift KpiGrid + StreakCounter component (a CRIAR) |

### A.11 — `client/src/components/achievements/` (3 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `BadgeCard.tsx` | ⚠️ MODIFICAR | `display/Badge.jsx` (extender para achievement) | DS Badge é cell pequena. Achievement tem visual hierárquico maior. Variante extendida + ease-spring overshoot animation (Wave 3 spec #17) |
| `BadgeCategorySection.tsx` | ❌ MANTÉM | tracker-specific | Section + badge grid layout |
| `TierProgressBar.tsx` | ⚠️ MODIFICAR | `display/ProgressBar.jsx` (variante tier) | ProgressBar com label "Bronze → Silver → Gold" |

### A.12 — `client/src/components/admin/` (1 component)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `UserManagement.tsx` | 🗑 DELETE Wave 7 | — | Multi-user → single-tenant migration. Wave 7 remove. |

### A.13 — `client/src/components/settings/` (3 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `SettingsForm.tsx` | ⚠️ MODIFICAR | `forms/FormField.jsx` pattern | Refactor pra FormFields canonical + Wave 6.4 onboarding wizard reusa |
| `WebhookInfo.tsx` | ❌ MANTÉM | tracker-specific | Já modificado (em working tree pre-existing edit) — mantém custom + adapta tokens Wave 4 |
| `CsvImport.tsx` | ⚠️ MODIFICAR | `forms/FileUpload.jsx` | DS FileUpload canonical |

### A.14 — `client/src/components/search/` (1 component)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `GlobalSearch.tsx` | ❌ MANTÉM | tracker-specific (Cmd+K palette) | Refine: integra DS `forms/Combobox.jsx` interno |

### A.15 — `client/src/components/skills/` (2 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `SkillFileTree.tsx` | ❌ MANTÉM | tracker-specific (file tree viewer) | Custom pattern |
| `SkillSearch.tsx` | ⚠️ MODIFICAR | `forms/Combobox.jsx` | Lift Combobox |

### A.16 — `client/src/components/markdown/` (1 component)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `MarkdownView.tsx` | ❌ MANTÉM | tracker-specific | Markdown renderer wrapper |

### A.17 — Top-level (3 components)

| Tracker file | Decisão | DS canonical alvo | Mismatch / Adapter |
|---|---|---|---|
| `ErrorBoundary.tsx` | ❌ MANTÉM | tracker-specific | React error boundary |
| `RouteErrorBoundary.tsx` | ❌ MANTÉM | tracker-specific | Route-specific error |
| `ShortcutsOverlay.tsx` | ❌ MANTÉM | tracker-specific | Cmd+K shortcuts overlay |

---

## B) Components a CRIAR (não existem em nenhum lado)

Anatomy completa em `audits/05-component-architect.md`. Sumário aqui:

| # | Component | Wave | Função |
|---|---|---|---|
| 1 | `OnboardingWizard` | 6.4 | 4-step wizard (source pick / install hooks / pricing review / personal goals) |
| 2 | `PricingDrawer` | 6.5 | Modal/drawer aparece quando modelo desconhecido detectado, user inputa pricing |
| 3 | `StreakCounter` | 6.7 | Sidebar bottom — current streak + bump motion no incremento |
| 4 | `StreakLostScreen` | 6.7 | Modal/screen empático sem motion punitiva |
| 5 | `WebhookPing` | 6.1 | Empty state Dashboard waiting first hit, pulse loop motion |
| 6 | `Confetti` (wrapper) | 6.7 | canvas-confetti integration, single-shot celebrations |
| 7 (backlog) | `TokenEditor` | 8 | In-app theme customizer (lift TokenEditorPreview canonical) |

---

## C) Delta report — tokens Wave 4 vs uso atual tracker

### C.1 — Cores que mudam comportamento

| Token | Antes (tracker `index.css`) | Depois (Wave 4) | Impacto |
|---|---|---|---|
| `--background` | `222 47% 6%` | `222 41% 8%` (gray-900 Untitled) | -2 pontos L, mais hue Untitled |
| `--foreground` | `217 12% 92%` | `216 24% 96%` (gray-050 Untitled) | +4 pontos L, +12 sat, alinha Untitled hue |
| `--primary` | tracker primary atual | `220 92% 40%` (#0848C5 blueDark) | **NOVA cor** — tracker não tinha primary semântico forte. Components que dependiam de bg-primary ganham brand identity. |
| `--accent` | tracker accent atual | `218 100% 50%` (#005EFF) | Vibrant blue Artemis literal |
| `--border` | tracker border atual | `221 13% 46%` (#667085) | Border mais visível (era escuro demais pra dark) |
| `--ring` | tracker ring | `218 100% 50%` (=accent) | Focus ring usa accent — UX improvement |

### C.2 — Tokens novos disponíveis (não existiam antes)

- `--brand-navy` `#003899` — logo/hero/decorative
- `--brand-blue-deep/dark/mid/light` — Artemis ladder
- `--motion-celebration 800ms` — FirstHit confetti
- `--motion-pulse-loop 2s` — WebhookPing
- `--ease-spring` cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot

### C.3 — Tokens motion: aliases híbridos

Tracker code Wave 3 spec usa `--motion-fast/base/slow/decorative` + `--ease-out/in-out/emphasized`. Wave 4 design.json define:

```
--motion-base:        var(--motion-normal);     /* 200ms */
--motion-decorative:  var(--motion-page);       /* 400ms — era 480, fica 400 canonical */
--ease-in-out:        var(--ease-standard);
--ease-emphasized:    var(--ease-out);
```

**Quebra esperada:** zero. Aliases preservam refs anteriores. Motion-decorative ajusta -80ms (480 → 400) — imperceptível pra user, alinha canonical.

### C.4 — Components que precisam re-validação visual

Após aplicar tokens Wave 4 (Wave 6 implementação), revalidar visual:

- ✅ Primary buttons (mudam pra blueDark) — mais brand-forward
- ✅ Borders (mais visíveis) — UI graphic improvement
- ✅ Focus rings (accent vibrant) — a11y improvement
- ⚠️ Status colors (Untitled 600-tier) — visual diferente do que era antes, validar contraste em PRs / cards específicos
- ⚠️ Sidebar (gray-900 + accent indicator) — drama via accent indicator, não fill primary

---

## D) Sub-waves Wave 6 (ordem por job frequency, master plan §"Sub-waves")

Cada sub-wave aplica subset do lift map + tokens novos:

| Sub-wave | Pages/Components | Mudanças relevantes |
|---|---|---|
| **6.1** Dashboard | `DashboardPage`, `dashboard/*`, `charts/*` | Lift StatCard/SummaryCards/Charts pra DS canonical + WebhookPing CRIAR |
| **6.2** Sessions | `SessionsPage`, `sessions/*`, `SessionDetailPage` | Lift SessionsTable pra AppTable canonical (MAJOR) |
| **6.3** Analytics | `AnalyticsPage`, `analytics/*` | Lift KpiBox/charts/heatmap (mantém custom heatmaps) |
| **6.4** Login + Onboarding | `LoginPage`, OnboardingWizard CRIAR | DS LoginScreen 50/50 + hero motion #18 + wizard motion #11 |
| **6.5** Settings | `SettingsPage`, `settings/*`, PricingDrawer CRIAR | Lift FormField pattern + custom pricing drawer |
| **6.6** Skills/SystemPrompts | (Pendency: modelo a/b/c não decidido) | Aplica tokens, revalida quando Patrick decidir modelo |
| **6.7** Achievements + Streaks | `AchievementsPage`, BadgeCard upgrade, StreakCounter/StreakLostScreen/Confetti CRIAR | Motion P2 brand-permitted, ease-spring overshoot |
| **6.8** Cleanup | `ProjectsPage`, `EntriesPage`, `SessionTimePage` | Lift residual |
| **6.9** Shell global | `AppLayout`, `Sidebar` | Brand Artemis applied across, footer "by Artemis" |

---

## E) Risks Wave 6 (mitigation Wave 7 condicional)

| Risk | Mitigação |
|---|---|
| AppTable signature mismatch crítico vs SessionsTable | Wave 6.2 BLOCKING — sub-wave dedicada à migração |
| Charts canonical Chart.jsx não cobrir 100% Recharts variants tracker usa | Wave 6.3 review: extender DS Chart se necessário ou adapter |
| LoginScreen 50/50 quebrar mobile (tracker é desktop-primary mas mobile esperado) | Wave 6.4 valida 320px reflow. Stack vertical em mobile. |
| OnboardingWizard state machine bugs | Wave 6.4 BLOCKING — testes manuais 4 steps + validation gates |
| Component canonical .jsx → .tsx port introduz tipos errados | Cada lift faz tsc check + Storybook se houver |

---

## Próximo passo

**Component architect spec** — `audits/05-component-architect.md` detalha anatomy/slots/variants/contratos a11y pra 7 components a CRIAR.

Após confirmar Wave 5 docs OK, **handoff S2 → S3** via `audits/HANDOFF-S2.md`.
