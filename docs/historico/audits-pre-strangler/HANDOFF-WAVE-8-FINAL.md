# Wave 8 — Re-skin CRM Canonical (R1-R10) + Guia de Validação

**Branch:** `redesign/motion-ds-audit`
**Status:** todos R1→R10 implementados, pronto pra validação manual antes do push.

---

## Resumo do que foi feito

### Lotes principais (R1-R8)

| Lote | Escopo | Status |
|------|--------|--------|
| R1 | Tokens CRM Dark + tipografia (Lora display + Poppins body + Geist Mono) | ✅ |
| R2 | Sidebar canonical (brand lockup + groups + indicator + collapse toggle) | ✅ |
| R3 | PageHeader + breadcrumb + ações (`crumb · h1 · subtitle · actions`) | ✅ |
| R4 | Surface system (`section / surfaceHeader / surfaceContent`) | ✅ |
| R5 | KPI cards canonical (eyebrow + value + label) | ✅ |
| R6 | Table CRM (zebra + header sticky + cell padding + variants) | ✅ |
| R7 | Form fields (label + input height 36 + ring focus + helper) | ✅ |
| R8 | SVG charts (drop Recharts ~50KB, inline SVG primitives + tooltip portal) | ✅ |

### R8-FIX 1-10 (charts polish)

1. **R8-FIX-2** Composição Tokens: vertical bar → SVG stacked horizontal bar com legenda + subtitle dinâmico ("96% cache read = aproveitamento ótimo")
2. **R8-FIX-3+4** Custo por Modelo: donut com fatias 0.0% mentirosas → horizontal bar list (`ModelCostBars`), top 4 cores distintas (`chart-1/3/2/4`), resto `muted/0.5`
3. **R8-FIX-5** linePath gaps: dia × projeto sem entrada → backfill 0
4. **R8-FIX-6** Top 10 sessions dedupe: agrupa por `custom_name`, exibe `(N)` se duplicada
5. **R8-FIX-7** niceMax overflow: ticks Y consideram último tick (não corta picos)
6. **R8-FIX-8** Heatmap colors: linear → quartil-based (q25/q50/q75 → buckets), outlier-resistant
7. **R8-FIX-10** Hover tooltips: native `<title>` slow → `useChartTooltip` hook + portal mouse-following em todos os charts

### Parking lot R8b/c/d/9/10

| ID | Feature | Arquivo |
|----|---------|---------|
| **R8b** | Plan Budget — meta cumulativa diária no progress bar + card com delta `↑/↓` | `client/src/components/dashboard/PlanIndicator.tsx` |
| **R8c** | Heatmap multi-metric — toggle "Entradas / Custo" recalcula quartis | `client/src/components/analytics/HeatmapWeekHour.tsx` |
| **R8d** | Meta diária gamification — 3 estados (🚀 ≥150% / 🎯 ≥100% / ⏳ <100%) | `client/src/components/dashboard/DailyGoalBanner.tsx` |
| **R9** | Token Editor settings — Editor/Presets/Export tabs + WCAG check | `client/src/components/settings/TokenEditor.tsx` |
| **R10** | User profile area — sidebar bottom CRM dropdown (Theme/Config/Sair) | `client/src/components/navigation/UserMenu.tsx` |

---

## Guia de validação manual

Subir preview (já tá no localhost:3333):
```bash
cd C:/Users/Patrick Neuhaus/Documents/Github/claude-token-tracker
docker compose up -d
cd client && npm run dev   # vite proxy /api → 3002
cd ../server && npx tsx watch src/index.ts
```

### Checklist por rota

#### `/dashboard`
- [ ] **PageHeader**: breadcrumb "tracker · dashboard" + h1 "Dashboard" + subtitle ("Mês atual · 46 sessões · $4691.18")
- [ ] **SummaryCards**: 5 KPIs grid (Custo Total, Total Tokens, Entradas, Sessões, Cache Hit Rate). Eyebrow uppercase + value display + label
- [ ] **DailyGoalBanner** (R8d): 1 dos 3 estados conforme proporção hoje vs meta diária:
  - 🚀 verde "Aproveitamento máximo" se ≥150% meta
  - 🎯 verde "Bateu a meta" se ≥100%
  - ⏳ amarelo "Falta pouco" se <100%
  - Progress bar com fill verde/amarelo
- [ ] **DashboardFilters**: chips Hoje/7d/30d/Este mês/Tudo + date inputs + filtros modelo/fonte/projeto
- [ ] **MonthNarrative**: parágrafo claro com `Sparkles` emoji
- [ ] **PlanIndicator** (R8b): 
  - Header "Valor do Plano"
  - Uso vs Custo
  - Progress bar com **marker vertical** (meta cumulativa)
  - Card "Meta diária" com 3 linhas (target/dia, acumulado, ↑/↓ delta)
  - Reset semanal + Pagamento mensal
- [ ] **CostByModelChart** (R8-FIX-3+4): horizontal bars com top 4 cores distintas. **Sem 0.0%** mentiroso. Hover row destaca + tooltip
- [ ] **CostBySourceChart**: SvgPieDonut + legenda
- [ ] **DailyCostChart**: SvgAreaStack com crosshair + tooltip ao mover mouse
- [ ] **CacheHitTrendChart**: linha com tooltip dot

#### `/sessions`
- [ ] Tabela CRM zebra + header sticky
- [ ] Click em row abre detail
- [ ] Filtros funcionam

#### `/sessions/:id` (Session Detail)
- [ ] **Composição de Tokens** (R8-FIX-2): **SvgStackedBar horizontal** (não vertical!) altura 56px com:
  - 4 segmentos lado a lado (Input / Output / Cache Read / Cache Write)
  - Legenda abaixo
  - Subtitle "X% cache read = aproveitamento ótimo" se cache > 80%
  - Hover em segmento: tooltip
- [ ] Timeline + entries table

#### `/projects`
- [ ] Cards por projeto sem sparkline (R5)
- [ ] Tabela top entries

#### `/analytics`
- [ ] **HeatmapWeekHour** (R8c): 7×24 grid com:
  - Toggle "Entradas / Custo" no canto direito
  - Quartis recalculados ao trocar métrica
  - Cell click expande detail abaixo
  - Cores quartil-based (não linear)
- [ ] **Top Sessions** (R8-FIX-6): 10 rows agrupados por nome, com `(N)` se duplicado
- [ ] **ProjectComparison**: linha com gaps preenchidos (não pula dias)

#### `/entries`
- [ ] Tabela canonical com filtros

#### `/skills` + `/system-prompts`
- [ ] Renderização markdown OK

#### `/achievements`
- [ ] Conquistas grid

#### `/settings`
- [ ] PageHeader "Configurações" + ação "Customizar pricing"
- [ ] Grid 2 col: SettingsForm + CsvImport / WebhookInfo
- [ ] **TokenEditor** (R9) full-width abaixo:
  - Header "Design System — N customizados" + Reset + Salvar buttons
  - 3 tabs: **Editor** / **Presets** / **Export / Import**
  - **Editor tab**: 4 sections (Marca / Sidebar / Superfícies / Status semânticos), cada token tem color picker + WCAG badge se aplicável + reset
  - **Presets tab**: 3 cards (CRM Dark / Ops Default / Wiki Sage), click aplica preset
  - **Export tab**: textareas CSS + JSON, botões copiar + import + URL share
  - WCAG banner amarelo se ratio bg/fg < 4.5
  - Save bloqueia se ratio < 3 (red banner)

### Sidebar (todas rotas)

- [ ] **R10** UserMenu CRM canonical:
  - Trigger compacto: avatar (32px) + nome + chevron up
  - Click abre dropdown ACIMA com 3 items: Modo claro/escuro, Configurações, Sair
  - Active state quando em `/settings` (border indicator esquerdo)
  - Collapsed: avatar puro circular (40px), dropdown lateral à direita
- [ ] **PlanCountdown** acima do UserMenu: "$X acima do plano" verde / "Falta $X pro breakeven" amarelo
- [ ] **StreakCounter** acima: "🔥 N dias STREAK"
- [ ] Brand "Claude Token Tracker / TRACKER" tag
- [ ] Search trigger "Buscar... Ctrl+K"
- [ ] Nav groups: Workspace / Insights / Showcase / Admin (se super_admin)
- [ ] Toggle collapse: bolinha à direita central
- [ ] Mobile: hamburger + drawer + backdrop

### Responsiveness

- [ ] Desktop ≥768px: sidebar fixa
- [ ] Mobile <768px: sidebar drawer com backdrop

### Tema

- [ ] Toggle dropdown UserMenu alterna dark/light
- [ ] Tokens se atualizam via CSS vars
- [ ] TokenEditor settings preserva via localStorage `ds-tokens-override`

---

## Bugs conhecidos / parking lot futuro

| ID | Descrição | Prioridade |
|----|-----------|------------|
| **R11** | Ranking público LGPD multi-tenant (compartilhar streaks anonimizados) | futuro |

---

## Próximos passos antes do push

1. **Patrick valida manualmente** rotas acima
2. Se OK → `git status` review changes
3. Commit com mensagem agrupando R-lotes
4. Push pra `origin/redesign/motion-ds-audit`
5. PR contra `main`

---

## Stack final

- React 19 + Vite + Tailwind v4
- @base-ui/react primitives
- Charts: SVG inline (sem Recharts), `useChartTooltip` portal
- Sidebar: tokens `--sidebar-*`, CRM canonical pattern
- Tema: localStorage `ds-tokens-override` (R9)
- Self-host: docker-compose (Postgres + server + client dev)
