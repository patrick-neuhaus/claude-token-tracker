# UX Audit + Refactor Spec — Claude Token Tracker

Auditoria completa com padrões extraídos de Umami, Dub e OpenStatus. Findings validados lendo cada arquivo citado. Spec organizada em 3 waves priorizadas.

---

## Padrões extraídos dos repos de referência

### Umami (`websites/[websiteId]/`) — detail page com composição
Estrutura:
```
WebsitePage
├── WebsiteControls       (filtros: date range + actions)
├── WebsiteMetricsBar     (5 cards de métricas com delta)
├── Panel                 (gráfico principal de série temporal)
│   └── WebsiteChart
├── WebsitePanels         (grid de 2 colunas com breakdowns)
│   ├── Pages / Sources (tabs)
│   ├── Browsers / OS / Device (tabs)
│   └── Location / Traffic
└── ExpandedViewModal     (drilldown modal ao clicar em item)
```

**Takeaways:**
1. Detail page = `Controls → MetricsBar → Chart → Panels (2-col grid) → ExpandedModal`
2. Cada breakdown panel tem **tabs internas** pra dimensões relacionadas (browser/os/device num só panel).
3. Clique em item abre `ExpandedViewModal` — drilldown sem sair da página.
4. `WebsiteControls` fica sticky no topo e controla filtros de toda a página.

### Dub (`ui/analytics/`) — tabs como cards de stats
Estrutura: `AnalyticsTabs` (3 cards grandes clicáveis — clicks/leads/sales) + `ChartSection` + grid 2x2 de seções (TopLinks, Referrers, Location, Devices).

**Takeaways:**
1. **Tabs = cards de stats**. Cada tab mostra o total da métrica (NumberFlow) e ao clicar troca o gráfico principal. A tab ativa tem indicator na borda inferior.
2. `ChevronRight` entre tabs sugere progressão funnel (clicks → leads → sales).
3. `analytics-card.tsx` é o átomo reutilizado em todas as seções — mesmo componente pra diferentes contextos.

### OpenStatus (`monitors/[id]/`) — breadcrumb + sub-tabs + sub-rotas
Estrutura:
```
monitors/[id]/layout.tsx
  AppHeader
    Breadcrumb           ("Monitors > Nome > Overview")
    NavActions           (botões do contexto)
  NavTabs                (Overview / Logs / Incidents / Edit)
  {children}             (sub-rota ativa)
```

**Takeaways:**
1. Detail page tem **rotas filhas reais** (`/overview`, `/logs`, `/incidents`), não tabs in-page.
2. `NavBreadcrumb` é tipado — cada item é `{type:"link"|"page", label, href?, icon?}`.
3. `NavTabs` sticky abaixo do header, com active state baseado em pathname.
4. Cada tab tem ícone (Activity, FileText, AlertTriangle, Settings).

---

## Findings validados

### Sev4 (Arquiteturais — fundamento quebrado)

**F1. Drilldown inexistente entre entidades**
- Validado: `SessionsTable.tsx:101-107` (Badge de projeto não clicável), `EntriesTable.tsx:66-68` (session_name como texto), `ProjectDetailPage.tsx:357-388` (nome da sessão sem link).
- Impacto: app é 9 silos planos, não um grafo navegável.
- Padrão aplicável: Umami/OpenStatus usam breadcrumb + rotas reais. Aplicar ambos.

**F2. `/sessions/:id` não existe — sessão é cidadã de 2ª classe**
- Validado: `SessionsTable.tsx:77-112` só expande inline. Sem rota própria.
- Impacto: sessão é a entidade central do produto (Claude Code funciona em sessões) mas não tem página dedicada.
- Padrão aplicável: copiar estrutura `monitors/[id]/` do OpenStatus (layout + breadcrumb + tabs + sub-rotas) OU `websites/[websiteId]/` do Umami (page única com panels).

### Sev3 (Telas visualmente pobres vs resto do app)

**F3. `/projects/:id` pobre — 3 cards + tabela, zero gráfico**
- Validado: `ProjectDetailPage.tsx:260-305` são exatamente 3 Cards (Custo/Sessões/Tokens), nada mais.
- Padrão aplicável: Umami `WebsitePage` — adicionar chart principal + panels em grid 2-col.

**F4. `/sessions` sem gráfico agregado — inconsistente com Dashboard**
- Validado: `SessionsPage.tsx:42-115` é só header + filtros + tabela paginada.
- Padrão aplicável: Umami `WebsiteMetricsBar` acima da tabela.

**F5. Header `/session-time` mal alinhado**
- Validado: `SessionTimePage.tsx:357-358` tem `text-right` em "Início" e "Fim" mas datas não deveriam ser right-aligned.
- Impacto: confere com o print reportado.

**F6. Dois bar charts verticais idênticos em `/session-time`**
- Validado: `SessionTimePage.tsx:270-341` — dois `BarChart layout="vertical"` com altura `chartByTime.length * 38`. Com 20 sessões = 1520px de gráfico.
- Padrão aplicável: combinar em 1 gráfico com eixo duplo OU scatter `custo × tempo útil`.

**F7. Filtros de data com 3 implementações diferentes**
- Validado: Dashboard usa `DashboardFilters`, Sessions/Analytics usam `DateRangeFilter`, SessionTime tem presets próprios inline.
- Padrão aplicável: consolidar em `DateRangeFilter` compartilhado.

**F8. Loading states inconsistentes**
- Validado: `DashboardPage.tsx:18-38` tem `DashboardSkeleton` rico. `SessionsPage.tsx:100`, `ProjectsPage.tsx:59`, `ProjectDetailPage.tsx:157` têm só `<p>Carregando...</p>`. SessionTimePage tem skeleton rico (linhas 200-210).
- Padrão: `SessionTimePage` e `DashboardPage` são o bom exemplo.

**F9. BudgetAlert dismiss não persiste**
- Validado: `BudgetAlert.tsx:11` usa `useState(false)`.
- Fix: `localStorage.setItem('dismissed_budget_alert_${date}', '1')` — some até meia-noite.

**F10. DeltaBadge com cor invertida pra métricas neutras**
- Validado: `AnalyticsPage.tsx:26-37` — `up ? text-red : text-green`. Correto pra custo, errado pra tokens/entradas (subir = bom).
- Fix: prop `metricType: "cost" | "neutral"`.

**F11. `useEffect` sobrescreve input durante edição**
- Validado: `ProjectDetailPage.tsx:80-85` — `useEffect([project])` reseta nameValue toda vez que refetch acontece. **Bug real** — se o user tá editando e o react-query refetch dispara, o input é sobrescrito.
- Fix: só inicializar quando `!editingName`.

### Sev2 (Qualidade de UX)

**F12. Pencil opacity-0 invisível em touch/keyboard** — `ProjectDetailPage.tsx:212`. Fix: `opacity-40` sempre visível.

**F13. Botões Check/X sem aria-label** — `ProjectDetailPage.tsx:192-204, 232-244`. Fix: adicionar `aria-label`.

**F14. viewMode de projetos não persiste** — `ProjectsPage.tsx:35` `useState("list")`. Fix: localStorage.

**F15. Filtro de modelo em Entries é Input livre** — `EntriesPage.tsx:51-56`. Fix: `NativeSelect` populado.

**F16. Download CSV sem feedback** — `EntriesPage.tsx:81-96` fire-and-forget. Fix: state isExporting + toast.

**F17. Paginação sem total count** — `SessionsPage.tsx:109`. Fix: "Mostrando 20 de 347".

**F18. Session-time: slider sem marcas** — `SessionTimePage.tsx:184-192`. Fix: presets rápidos (30m/60m/2h) acima do slider.

**F19. Session-time: "Tempo útil" sem explicação** — `SessionTimePage.tsx:111-113`. Fix: popover (i) com fórmula.

**F20. Achievements sem "próximas de desbloquear"** — ordem fixa em `AchievementsPage.tsx:222-273`. Fix: card topo "Próximas 3".

**F21. Badges bloqueadas perdem tier colors** — `AchievementsPage.tsx:243-251` usa `opacity-40 grayscale`. Fix: manter borda da tier colorida mesmo bloqueada.

**F22. stopPropagation frágil em SessionsTable** — `SessionsTable.tsx:88`. Fix: mover expand pra botão explícito chevron.

**F23. "Primeira/Última" ambíguos** — `SessionsTable.tsx:68-69`. Fix: "Primeira entrada" / "Última atividade".

**F24. max-w-[120px] truncate apertado** — `EntriesTable.tsx:66`. Fix: 200px + tooltip nome completo.

**F25. Grid grid-cols-5/grid-cols-2 hardcoded sem responsive** — `DashboardPage.tsx:125` e `SummaryCards.tsx:46`. Fix: responsive breakpoints.

**F26. Empty state de ProjectDetail pobre** — `ProjectDetailPage.tsx:334-342` só `<p>`. Fix: ícone + CTA como Dashboard.

**F27. Presets de SessionTime não responsive** — `SessionTimePage.tsx:120-146` quebram em mobile.

### Sev1 (Cosmético) — agrupado pra lote final

F28. Ícones hardcoded `text-green-400` etc. — centralizar em tokens.
F29. Títulos inconsistentes ("Custo por Modelo" vs "Custo por Modelo (por semana)").
F30. Sparkline só em Projects, ausente em Sessions.
F31. Heatmap com title HTML nativo.
F32. Heatmap com rgba hex hardcoded.

---

## Waves de execução

### Wave P0 — Fundamento navegacional (Sev4)

**Objetivo:** Resolver drilldown + criar `/sessions/:id`.

**Arquivos:**
1. `client/src/components/shared/NavBreadcrumb.tsx` — NOVO, adapt do OpenStatus
2. `client/src/pages/SessionDetailPage.tsx` — NOVO, adapt do Umami WebsitePage
3. `client/src/hooks/useSessionDetail.ts` — NOVO
4. `server/src/routes/sessions.ts` — adicionar rota `GET /sessions/:id/detail` que retorna session + timeline + entries paginadas + breakdown por modelo
5. `server/src/services/tokenService.ts` (ou sessionService novo) — função `getSessionDetail(userId, sessionId)`
6. `client/src/App.tsx` — registrar `/sessions/:id`
7. `client/src/components/sessions/SessionsTable.tsx` — transformar nome em `<Link to="/sessions/${id}">`, expand vira navegação
8. `client/src/components/entries/EntriesTable.tsx` — session_name vira Link
9. `client/src/pages/ProjectDetailPage.tsx` — linha da tabela de sessões vira Link
10. `client/src/pages/SessionTimePage.tsx` — nome da sessão na tabela vira Link

**Conteúdo da SessionDetailPage (seguindo Umami):**
- Header: breadcrumb ("Sessões > Nome > Detalhe") + nome editável + projeto vinculado (Link) + data de início
- MetricsBar: 4 cards (Custo, Tokens, Duração calculada, Entradas)
- Gráfico principal: custo acumulado ao longo da sessão (AreaChart minuto-a-minuto)
- 2 panels grid:
  - Esquerda: Pie "Custo por Modelo"
  - Direita: Barra "Input vs Output vs Cache"
- Tabela de entries paginada
- Botão "Abrir projeto pai" no header se tiver projeto

**Critério de aceitação P0:**
- Clicar num nome de sessão em qualquer lugar do app abre `/sessions/:id`
- Voltar funciona com breadcrumb clicável (não só `<ArrowLeft>`)
- Projeto vinculado é clicável na página de detalhe

---

### Wave P1 — Enriquecimento de telas de detalhe + correções visuais (Sev3)

**Arquivos:**
1. `client/src/pages/ProjectDetailPage.tsx` — adicionar chart temporal + pie por modelo + empty state melhorado + fix useEffect
2. `client/src/pages/SessionsPage.tsx` — adicionar MetricsBar acima da tabela
3. `client/src/pages/SessionTimePage.tsx` — fix header alinhamento + substituir 2 bar charts por 1 scatter `custo × tempo` + popover explicando "tempo útil" + presets de gap
4. `client/src/components/dashboard/BudgetAlert.tsx` — persistir dismiss em localStorage
5. `client/src/components/shared/DateRangeFilter.tsx` — garantir que todas as telas usam esse
6. `client/src/pages/EntriesPage.tsx` — migrar filtros pra DateRangeFilter
7. `client/src/components/shared/LoadingSkeleton.tsx` — NOVO, padrão reutilizável
8. `client/src/pages/SessionsPage.tsx`, `ProjectsPage.tsx`, `ProjectDetailPage.tsx` — trocar `<p>Carregando</p>` por skeleton
9. `client/src/pages/AnalyticsPage.tsx` — DeltaBadge com prop `metricType`

**Critério de aceitação P1:**
- ProjectDetail tem ao menos 1 gráfico temporal + 1 pie
- SessionTime: scatter substitui os 2 bar charts; header alinhado; slider tem presets
- BudgetAlert dismiss persiste durante o dia
- Todos loading states consistentes

---

### Wave P2 — Polish + acessibilidade (Sev2 + Sev1)

**Escopo:** F12-F32 numa única wave de cleanup.

**Agrupamentos:**
- **Acessibilidade:** F12 (pencil opacity), F13 (aria-label)
- **Persistência:** F14 (viewMode localStorage)
- **Formulários:** F15 (NativeSelect modelo), F16 (isExporting + toast)
- **Feedback:** F17 (paginação count), F18 (presets gap), F19 (popover)
- **Achievements:** F20 (próximas 3 card), F21 (tier colors mantidas)
- **Sessions table:** F22 (chevron explícito), F23 (labels), F24 (truncate expandido)
- **Responsive:** F25 (grid breakpoints), F27 (presets responsive)
- **ProjectDetail:** F26 (empty state melhor)
- **Cosmético:** F28 (tokens), F29 (títulos), F30 (sparkline), F31 (tooltip Radix), F32 (hsl var)

**Critério de aceitação P2:**
- Zero `<p>Carregando</p>`
- Zero `aria-label` missing em icon-only buttons
- Zero cores hardcoded em componentes de página
- Todos grids responsive até 1024px

---

## O que NÃO vai ser feito agora

- Command palette (Cmd+K) — mencionado nas "oportunidades criativas" mas fora do escopo desta refatoração.
- Forecasting de breakeven — feature nova, não correção.
- Session-to-task linking ClickUp — feature nova.
- Notas por sessão — feature nova.
- Contribution graph no sidebar — feature nova.

Essas 5 ideias ficam backlog pro depois.

---

## Estimativa

- **P0:** ~8-10 arquivos, backend + frontend. 1 sessão longa.
- **P1:** ~10 arquivos, maior parte frontend. 1 sessão.
- **P2:** ~15 arquivos pontuais. 1 sessão.

Total: 3 sessões de trabalho focado.

---

## Pré-requisito antes de executar

Confirmar antes de executar:
1. **P0 primeiro isolado** (build + testar) antes de P1? Ou P0 + P1 na mesma wave?
2. `/sessions/:id` usa padrão OpenStatus (rotas filhas) ou Umami (panels na mesma page)? Recomendo **Umami** porque é menos rotas pra criar e o app já é SPA simples.
3. Alguma coisa pra remover/adicionar na spec antes de começar?
