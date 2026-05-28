# Audit W-B3 - Pages + components

## Status

Read-only concluído. Regras externas em `~/.codex/rules` foram bloqueadas pelo sandbox, então segui o `AGENTS.md` recebido no prompt.

Verificado:
- Pages pedidas.
- `SessionsTable`, `EntriesTable`, `components/charts`.
- Hooks de query para paginação/sort.
- Rotas em `App.tsx`.
- Error boundaries.

## Findings (P0-P3)

**P1 - Dashboard mostra onboarding quando filtro retorna zero**
`client/src/pages/DashboardPage.tsx:152` retorna `<WebhookPing />` quando `entry_count === 0`, antes de renderizar `DashboardFiltersBar` em linha 191. Se o usuário aplica `model/source/project/date` e o resultado dá zero, a tela vira "configure webhook", escondendo os filtros e sem `EmptyState`/limpar filtros.

**P1 - Entries "Até" provavelmente exclui o dia selecionado**
`client/src/pages/EntriesPage.tsx:93` e linha 97 enviam `YYYY-MM-DD` cru. O backend aplica `e.timestamp <= $N` em `server/src/utils/filterBuilders.ts:56`. Isso tende a interpretar o "to" como meia-noite do dia, excluindo entradas posteriores desse mesmo dia. O `DateRangeFilter` compartilhado já resolve isso com fim do dia local, mas Entries não usa essa lógica.

**P2 - Sessions: botão "Limpar" não limpa todos os filtros ativos**
`client/src/pages/SessionsPage.tsx:74` considera `project_id`, `search`, `from`, `to` como filtros ativos, mas o botão inline em linha 143 só limpa `project_id`. Search/date continuam aplicados, então o botão mente para o usuário. O `clearAllFilters` correto existe só no empty state em linhas 76-79 e 185.

**P2 - Analytics não trata erro e pode renderizar tela em branco**
`client/src/pages/AnalyticsPage.tsx:53` ignora `isError`; em linha 64 faz `if (!data) return null`. Em falha da API, o usuário pode receber tela vazia em vez de `ErrorState`.

**P2 - Achievements não diferencia loading de erro**
`client/src/pages/AchievementsPage.tsx:28` só pega `data, isLoading`; linha 30 trata `!data` como skeleton. Se `/achievements` falha, a página fica parecendo loading indefinido, sem retry/erro.

**P2 - Dead components confirmados em charts**
Sem imports encontrados fora do próprio arquivo:
- `client/src/components/charts/SvgGaugeBar.tsx:25`
- `client/src/components/charts/SvgScatterPlot.tsx:30`

**P3 - Primitives parecem mortos / duplicados com `ui/*`**
Não encontrei import externo de `@/components/primitives` nas pages/components. `client/src/components/primitives/index.ts:8` exporta `Button/Card/Input`, mas o app usa majoritariamente `components/ui/*`. Se for legado, remover; se for design system futuro, marcar explicitamente para não virar falso positivo recorrente.

**P3 - Labels não estão conectados aos controles em Entries**
`client/src/pages/EntriesPage.tsx:66`, 79, 92, 96 usam `<Label>` sem `htmlFor`, e os inputs/selects não têm `id`. Visualmente ok, mas a11y e clique no label quebrados.

**P3 - Filtros do Dashboard dependem só de placeholder/posição**
`client/src/components/dashboard/DashboardFilters.tsx:55` usa input de modelo sem label/aria-label; selects de fonte/projeto em linhas 63 e 76 também não têm label acessível. O layout é compreensível visualmente, mas ruim para leitor de tela.

**P3 - AppTable usa semântica ARIA inconsistente**
`client/src/components/data/AppTable.tsx:139` usa `role="row"`/`columnheader`/`cell`, mas não há container `table/grid`. Em linhas 237-238, linha clicável vira `role="button"` contendo células. Funciona no teclado, mas a semântica de tabela fica quebrada.

**P3 - Skill usage link pode ser ambíguo**
`client/src/pages/SkillUsagePage.tsx:61` linka `/skills/${skill_name}` sem `?source=...`. A rota existe e `useSkillDetail` aceita source opcional, mas se houver nomes iguais em `skillforge/omc/builtin`, o detalhe pode abrir a fonte errada.

## Resumo executivo

Não achei P0. Paginação de `EntriesPage` e `SessionsPage` está ok: `setPage` muda o objeto de filtro e o `queryKey` inclui filtros, então React Query refaz a API sem precisar `invalidateQueries`.

Sort de `SessionsTable` também está ok: é controlado pelo pai, `useSessions` envia `sort_by/sort_dir`, e o backend normaliza e aplica `ORDER BY`.

O principal risco real está em empty/filter states: Dashboard confunde "sem dados por filtro" com "sem webhook", Entries filtra data final errado, e Sessions tem botão "Limpar" parcial. Error boundary existe em `client/src/App.tsx:83` e por rota, mas Analytics/Achievements ainda precisam de `ErrorState` local.
