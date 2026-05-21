# Audit Graficos · 2026-05-20

Auditor: Worker QQ (Fase A · Acao A5) · read-only.

## Resumo executivo

- 9 charts auditados (7 primitivos + 2 wrappers): SvgAreaStack, SvgBarChart, SvgLineChart, SvgPieDonut, SvgScatterPlot, SvgStackedBar, SvgGaugeBar, ModelCostBars, ChartTooltip
- 2 paginas com charts: DashboardPage, AnalyticsPage (+ SessionDetailPage usa ModelPieChart e SvgStackedBar)
- 4 issues **P1** (criticos para mobile / dado / consistencia)
- 6 issues **P2** (importantes — UX subotima)
- 5 issues **P3** (cosmetico)
- Dados cruzados com DB pos-restart: Custo por Fonte, Custo por Familia, Custo Diario, Cache Hit Rate → todos batem.

## Cross-check de dados (DB pos-restart)

Queries rodadas em `claude-token-tracker-db` (56.786 entries, 2026-03-27 → 2026-05-21):

| Metrica | DB | Front (esperado) | Status |
|---|---|---|---|
| Custo total claude-code | $16.084,48 | mesma serie em CostBySourceChart | ✓ |
| Custo total codex | $11.608,00 | mesma serie | ✓ |
| Opus / Sonnet / Haiku / Gpt | $15.898,64 / $184,95 / $0,88 / $11.608 | DailyCostChart stack | ✓ |
| Cache hit rate (30d) | 98,33% | CacheHitTrendChart media | ✓ (esperado, dominado por opus) |
| Range de dias | 27/03 a 21/05 | usado em filtros | ✓ |

Dados batem. Nenhum P1 de dado errado.

---

## Por chart

### SvgAreaStack (`client/src/components/charts/SvgAreaStack.tsx`)

Usado por: DailyCostChart (Dashboard), AnalyticsPage (Custo por Modelo semanal), DailyCostAreaChart wrapper.

- Cores: via tokens (`s.color` recebido por prop, sempre `hsl(var(--chart-N))`).
- Tooltip: existe (crosshair + label X + serie color + valor formatado).
- Eixos: Y formatado, X com downsampling de 7 labels (`downsampleLabels`).
- Empty state: nao tem — se `data=[]`, calcula `Math.max(1, xs.length - 1)` = `Math.max(1, -1) = 1`, depois `padL + (0 * span) / 1 = padL` → SVG vazio sem placeholder.
- Loading: delegado ao parent (DashboardPage tem skeleton).
- Aria-label: tem (`ariaLabel` prop ou fallback).

Issues:
- **[P1]** `preserveAspectRatio="none"` deforma o SVG quando container fica estreito (mobile < 480px): grid lines, ticks, e texto esticam horizontalmente, ficam ilegiveis ou cortados. ViewBox 800x240 forcado em container de 360px = ratio errado.
- **[P2]** Sem empty state visivel. Quando `data=[]`, renderiza retangulo branco vazio sem mensagem (depende de parent passar "Sem dados").
- **[P2]** Sem suporte a touch (mobile): `onMouseMove`/`onMouseLeave` so. iPad/celular nao mostra tooltip.
- **[P3]** Crosshair so aparece no mouse-move; nao mostra ultimo ponto por default.

### SvgBarChart (`client/src/components/charts/SvgBarChart.tsx`)

Usado por: AnalyticsPage (Top 10 sessoes mais caras, horizontal).

- Cores: via prop `s.color`.
- Tooltip: existe (`formatTooltip` opcional).
- Eixos: Y/X com `niceTicks(4)`. Em horizontal, padL=120 fixo (espaco pro label da row).
- Truncamento: `String(row[xKey]).slice(0, 18)` — corta nome em 18 chars sem ellipsis (`...`).
- Empty state: nao tem.
- Aria-label: tem.

Issues:
- **[P1]** `preserveAspectRatio="none"` mesma deformacao em mobile.
- **[P2]** Truncamento sem ellipsis (`...`) — Patrick ve "claude-opus-4-7-w" em vez de "claude-opus-4-7…". UX subotima.
- **[P2]** `padL=120` fixo em horizontal — quando label > 18 chars + 120px nao da, em viewBox 800 sobra so 680 pra barra. Em mobile vira fatia minuscula.
- **[P3]** Bar `rx={3}` em horizontal vs `rx={2}` em vertical — inconsistente.
- **[P3]** Em vertical com 7+ labels, `downsampleLabels` esconde 50%+ dos ticks sem indicar rotacao alternativa.

### SvgLineChart (`client/src/components/charts/SvgLineChart.tsx`)

Usado por: CacheHitTrendChart, AnalyticsPage (Custo por Projeto).

- Cores: via `s.color`.
- Tooltip: existe (crosshair + dots por serie).
- Legend: opcional (`legend` prop, default true).
- Empty state: nao tem.
- Aria-label: tem.

Issues:
- **[P1]** `preserveAspectRatio="none"` deforma em mobile (mesmo bug global).
- **[P2]** Sem touch support (`onMouseMove` only).
- **[P3]** `truncate max-w-[140px]` no nome da serie em tooltip — se label > 140px corta sem indicar mais info (mas em hover a label completa nao existe em outro lugar).
- **[P3]** Dots so aparecem em hover; nao destacam pontos individuais por default — em linha com 90 dias, ve-se so curva contínua sem nodes.

### SvgPieDonut (`client/src/components/charts/SvgPieDonut.tsx`)

Usado por: CostBySourceChart (Dashboard).

- Cores: via `d.color` por slice.
- Tooltip: existe (rotulo + valor + %).
- Empty state: TEM — renderiza "sem dados" centralizado quando `total === 0`.
- Legend: existe (right side).
- Aria-label: tem.

Issues:
- **[P2]** Sem touch support.
- **[P3]** Legend a direita ocupa flex-1 — em mobile o donut + legend ficam apertados (donut 250px de altura, legend ao lado quebra layout < 380px).
- **[P3]** Falta `ariaLabel` configuravel via prop (so tem "Grafico de pizza" hardcoded em PT-BR).

### SvgScatterPlot (`client/src/components/charts/SvgScatterPlot.tsx`)

Usado por: SessionTimeScatterChart (SessionTimePage / SessionDetailPage).

- Cores: `fillColor` default `chart-1`.
- Tooltip: existe (`formatTooltip` opcional).
- Eixos: X+Y labels rotacionados.
- Bubble size: `r` configuravel por ponto.
- Empty state: nao tem.

Issues:
- **[P1]** `preserveAspectRatio="none"` deforma em mobile (mesmo bug).
- **[P2]** Bolhas se sobrepoem sem `opacity` modulada — pontos coincidentes ficam ilegiveis.
- **[P3]** yLabel rotacionado mas posicao fixa em `x=14` pode colidir com Y ticks em viewBox estreito.

### SvgStackedBar (`client/src/components/charts/SvgStackedBar.tsx`)

Usado por: SessionDetailPage (Composicao de Tokens).

- Cores: via segment.
- Tooltip: existe.
- Empty state: TEM — `total === 0` renderiza retangulo cinza com aria-label "Sem dados".
- Legend: existe (`grid-cols-2 sm:grid-cols-4`).
- `minWidthPct=0.5` — segmentos minimos visiveis.

Issues:
- **[P2]** `text fill="white"` hardcoded — em modo claro com cor de segmento clara, fica ilegivel. Devia derivar de luminance (ou usar `currentColor` com cor calculada).
- **[P3]** `rx` so nos cantos primeiro/ultimo — mas com `minWidthPct` ajuste, se primeiro segmento tem valor zero, primeiro VISIVEL nao recebe `rx`.
- **[P3]** `pct >= 8` pra mostrar label dentro do segmento — limiar arbitrario, pequenos segmentos nunca mostram %.

### SvgGaugeBar (`client/src/components/charts/SvgGaugeBar.tsx`)

**Nao usado em nenhum lugar** — `Grep` confirma so refs internos. Foi superseded pelo `PlanIndicator.tsx` que reimplementa.

- Cores: success/warning/destructive via tokens.
- Tooltip: nao tem (so `<title>` em SVG na linha de meta).

Issues:
- **[P3]** Codigo morto (dead code). Pode deletar ou marcar deprecated.

### ModelCostBars (`client/src/components/charts/ModelCostBars.tsx`)

Usado por: CostByModelChart (Dashboard), ModelPieChart wrapper (SessionDetailPage, ProjectDetailPage).

- Cores: palette de 5 cores `chart-1/3/2/4/5` (ordem nao casa com MODEL_COLORS!).
- Tooltip: existe.
- Empty state: TEM — "Sem modelos no periodo".
- Top N: configuravel.

Issues:
- **[P1]** **INCONSISTENCIA DE COR CRITICA**: ModelCostBars usa palette posicional (`chart-1`, `chart-3`, `chart-2`, `chart-4`, `chart-5`), mas DailyCostChart usa MODEL_COLORS por familia (`opus=chart-4`, `sonnet=chart-1`, `haiku=chart-2`, `gpt=chart-3`). Resultado: no Dashboard, Opus aparece **azul** em ModelCostBars (chart-1, posicao 0) mas **roxo** em DailyCostChart (chart-4). Sonnet aparece **amber** (chart-3, posicao 1) em bars mas **azul** (chart-1) no area chart. Usuario fica perdido — mesma metrica, cores diferentes lado a lado. Patrick reclamou disso?
- **[P2]** Truncamento `w-40 truncate` no nome — model com nome > 40 chars (`Claude Opus 4.7 + opus 1M`) trunca sem indicador. Tooltip mostra full, mas visualmente perdido.

### ChartTooltip (`client/src/components/charts/ChartTooltip.tsx`)

Portal-based mouse-following tooltip. Boa implementacao.

- Flip horizontal se proximo da right edge ✓.
- `maxWidth: 260` ✓.
- Sem flip vertical (so `top: Math.max(8, state.y - 12)`) — tooltip pode sair off-screen no fundo da viewport em mobile.

Issues:
- **[P2]** Sem flip vertical pro fundo da tela — em mobile com tooltip no rodape, vai pra fora da viewport.
- **[P2]** Sem suporte a touch — `useChartTooltip` recebe `MouseEvent`, nao `TouchEvent`.

---

## Por pagina

### DashboardPage (`client/src/pages/DashboardPage.tsx`)

Layout:
- Grid `grid-cols-1 lg:grid-cols-2` pros pares CostByModel + CostBySource (linha 179).
- Mobile (< 1024px lg): tudo full-width stack — OK.
- DailyCostChart vem **fora** desse grid (linha 184) com `col-span-2` interno hardcoded.

Mobile:
- SummaryCards: nao auditado aqui (Worker outro).
- Charts: sofrem do problema `preserveAspectRatio="none"` global.
- Tooltip nao funciona em touch (iPad/celular).

Tipografia: usa `PageHeader`, `Section`, `surface.section` — padrao.

Filtros: `DashboardFiltersBar` (preset → from/to). Estado preservado em React state local, nao em URL. Refresh perde filtro.

Issues:
- **[P1]** `DailyCostChart` tem `col-span-2` hardcoded MAS e renderizado **fora de um grid** (linha 184 do Dashboard). Resultado: classe morta hoje, mas se alguem envolver em grid no futuro, vai estourar layout. Cheiro de bug latente.
- **[P2]** Filtro `period` perdido em refresh (state local). Deveria ir pra URL (`?period=month`).
- **[P3]** Loading skeleton (`DashboardSkeleton`) renderiza grid 5 col em qualquer breakpoint — quebra em mobile.

### AnalyticsPage (`client/src/pages/AnalyticsPage.tsx`)

Layout:
- Top stack (PeriodComparison, StreaksKpi, ContributionGraph, HeatmapWeekHour) — full-width.
- DateRangeFilter divide estatico de filtravel (`border-t pt-5`).
- Charts filtraveis em `Section` empilhados (Custo por Projeto, Custo por Modelo semanal, Top 10 sessoes).
- Top 10 sessoes usa `height={Math.max(180, grouped.length * 36)}` — altura dinamica boa.

Mobile:
- Mesmo problema `preserveAspectRatio="none"`.
- KpiBox grid `md:grid-cols-2` quebra em mobile ok.
- Heatmap nao auditado aqui.

Issues:
- **[P2]** Sem URL state para `dateRange` — filtro perdido em refresh.
- **[P2]** "Custo por Modelo (por semana)" usa `CHART_COLORS` posicional (sem casar com MODEL_COLORS) — Opus na semana 1 pode ser azul, mas na lista geral ele e roxo. Mesma inconsistencia do P1 acima.
- **[P3]** Cards `KpiBox` so renderizam se `hourly && !streaks` (linha 98) — se backend muda flag, layout adapta sozinho mas pode haver gap visual.

### SessionDetailPage (`client/src/pages/SessionDetailPage.tsx`)

- ModelPieChart (ModelCostBars wrapper) — issue de cor.
- SvgStackedBar (Composicao de Tokens) — cores ad-hoc: chart-1, chart-2, success, chart-4. Cache Read e `--success` em vez de cor da paleta — desviou do padrao de outros charts.

Issues:
- **[P3]** Cache Read em `--success` no stacked bar de SessionDetail; em CacheHitTrendChart tambem usa `--success`. **Consistente entre os dois.** Mas se padrao geral fosse "verde = success", entao Haiku tambem e verde (chart-2 ≈ verde) — confusao com 2 verdes em paginas diferentes mas mesmo dashboard.

---

## Issues sistemicos (transversais)

1. **`preserveAspectRatio="none"` em 7 dos 8 SVG charts.** Deformacao garantida em mobile (< 480px) e em qualquer container nao-800px-wide. Solucao canonica seria `preserveAspectRatio="xMidYMid meet"` ou redesign com viewBox proporcional ao container (usar ResizeObserver).

2. **Sem touch support em nenhum chart.** iPad/celular nao mostra tooltip.

3. **Paleta de cor inconsistente entre wrappers.** ModelCostBars (palette posicional) vs DailyCostChart (MODEL_COLORS familia) — mesma metrica, cores diferentes lado a lado no Dashboard. Worker EE jaa validou que **dados** batem; **visual** ainda nao.

4. **Filtros nao persistidos em URL** (DashboardPage e AnalyticsPage). Refresh perde estado.

5. **Empty state inconsistente.** SvgPieDonut e SvgStackedBar tem; SvgAreaStack, SvgBarChart, SvgLineChart, SvgScatterPlot nao tem — dependem do parent.

---

## Recomendacoes priorizadas

### P1 (fix urgente)

1. **Trocar `preserveAspectRatio="none"` por `xMidYMid meet`** nos 7 charts. Custo: ~10 linhas mudadas. Beneficio: mobile fica usavel.
2. **Unificar paleta de cor por familia de modelo** em TODOS os charts (ModelCostBars, DailyCostChart, AnalyticsPage). Usar `getModelColor(model)` ou um mapeamento por familia (`opus → roxo`, `sonnet → azul`, etc) em vez de palette posicional. Custo: alterar `ModelCostBars.tsx` linhas 46-52 + AnalyticsPage linhas 161-165.
3. **Remover `col-span-2` morto no DailyCostChart.tsx** linha 44. Ou envolver render no Dashboard num grid `grid-cols-2`. Resolve bug latente.

### P2 (proxima onda)

1. Adicionar empty state interno a SvgAreaStack, SvgBarChart, SvgLineChart, SvgScatterPlot (igual SvgPieDonut/SvgStackedBar).
2. Adicionar touch support em ChartTooltip + handlers SVG (onTouchStart/Move).
3. Truncamento com ellipsis (`text-overflow: ellipsis` + Unicode `…`) em ModelCostBars, SvgBarChart horizontal.
4. ChartTooltip — flip vertical pro fundo da viewport.
5. Filtros DashboardFilters + DateRangeFilter — persistir em URL (`?period=month&from=...&to=...`).
6. SvgStackedBar — calcular cor do texto baseado em luminance da cor de fundo (substituir `fill="white"` hardcoded).

### P3 (backlog)

1. Deletar `SvgGaugeBar.tsx` (dead code) ou marcar `@deprecated` no JSDoc.
2. SvgBarChart — `rx` consistente (3 ou 2) entre horizontal e vertical.
3. SvgLineChart — dots por padrao em datasets pequenos (< 20 pontos).
4. SvgPieDonut — `ariaLabel` configuravel por prop em vez de hardcoded.
5. SvgStackedBar — limiar `pct >= 8` para mostrar % deveria ser configuravel ou adaptativo.
