# Audit B2 - React Query Hooks

## Assessment
REQUEST_CHANGES. Revisei `client/src/hooks/*.ts`, `client/src/lib/queryKeys.ts`, `api.ts`, `types.ts` e endpoints/server relacionados para validar shape.

## Findings

### B2-01 P1 - `/analytics/cache-hit-trend` usa coluna inexistente
- Local: `server/src/services/analyticsService.ts:252`
- Hook: `client/src/hooks/useAnalytics.ts:10`
- Evidência: service consulta `cache_read_tokens`, mas schema usa `cache_read` (`server/migrations/003_create_token_entries.sql`). Endpoint deve 500ar; hook tipa resposta como se endpoint existisse.

### B2-02 P2 - `useImportCsv` invalida pouco depois de importar
- Local: `client/src/hooks/useImport.ts:18`
- Invalida só `dashboard`, `sessions`, `entries`.
- Import muda entradas/sessões e pode afetar `analytics`, `achievements`, `plan-status`, `entries.distinct`, `projects/project` quando sessão existente tem projeto. UI fica stale até refetch manual/intervalo.

### B2-03 P2 - `useUpdateSettings` não invalida `plan-status`
- Local: `client/src/hooks/useSettings.ts:21`
- `usePlanStatus` usa endpoint de dashboard com key separada `["plan-status"]` em `client/src/hooks/usePlanStatus.ts:7`.
- Alterar budget/plano atualiza `settings` e `dashboard`, mas deixa plan status stale.

### B2-04 P2 - delete project deixa caches de sessão/projeto derivado stale
- Local: `client/src/hooks/useProjects.ts:98`
- Server FK faz `sessions.project_id ON DELETE SET NULL` (`server/migrations/006_add_project_to_sessions.sql:1`).
- Mutation invalida só `["projects"]`; faltam `sessions`, `unassigned-sessions`, `project`, `dashboard`, `analytics`.

### B2-05 P2 - assign/unassign session não invalida dashboard/analytics
- Local: `client/src/hooks/useProjects.ts:108` e `:122`
- Mudar projeto da sessão altera filtros por `project_id`, analytics por projeto e comparações. Hoje invalida `projects`, `project`, `sessions`, `unassigned-sessions`, mas não `dashboard`/`analytics`.

### B2-06 P2 - rename session não invalida analytics overview nem project detail
- Local: `client/src/hooks/useSessions.ts:60`
- `["sessions"]` cobre list/detail, mas top sessions em `useAnalytics(["analytics", filters])` e sessões dentro de `["project", id]` continuam com `custom_name` antigo.

### B2-07 P3 - qk factory existe, mas hooks ainda usam raw keys
- Factory: `client/src/lib/queryKeys.ts:32`
- Raw keys em hooks:
  - `useAchievements.ts:43`
  - `useAnalytics.ts:32`
  - `useCustomPricing.ts:22,34,45`
  - `useDashboard.ts:27,34`
  - `useEntries.ts:22`
  - `useImport.ts:18-20`
  - `usePlanStatus.ts:7`
  - `useProjects.ts:47,54,68,78,88-89,98,108-111,122-125`
  - `useSessionDetail.ts:7`
  - `useSessions.ts:17,48,60-61`
  - `useSessionTime.ts:7`
  - `useSettings.ts:7,21-22,29,39`
  - `useSkills.ts:35,43,53`
  - `useSystemPrompts.ts:20,28`
- Isso reabre typo drift que `qk` deveria eliminar.

### B2-08 P3 - staleTime drift entre listas semelhantes
- Entries list: default `0` (`useEntries.ts:22`)
- Sessions list: default `0` (`useSessions.ts:17`)
- Skills list/detail/file: `60_000` (`useSkills.ts:37,45,66`)
- Entries distinct: `5 * 60_000` (`useEntriesDistinct.ts:14`)
- Session detail/time: `30_000` (`useSessionDetail.ts:10`, `useSessionTime.ts:14`)
- Não é bug isolado, mas política de cache não está codificada por domínio.

### B2-09 P3 - `ProjectComparison` bypassa hook/qk
- Local: `client/src/components/analytics/ProjectComparison.tsx:91`
- Usa `useQuery` direto com `["analytics", "compare", selected, dateRange]`, apesar de `qk.analytics.compare` existir em `queryKeys.ts:45`.

## Checks sem bug confirmado
- Pagination: `useEntries` e `useSessions` incluem `page` no queryKey via `filters`; sem cache poisoning entre páginas.
- Refetch loop: objetos inline aparecem em `useEntries`, `useAnalytics`, `useSessions`, mas React Query v5 usa hash estrutural de queryKey. Não vi loop confirmado.
- Mutations sem qualquer invalidate: nenhuma. O problema é invalidação incompleta e uso de raw keys em vez de `qk.<namespace>.all()`.
- Componentes com data sem loading guard: há páginas sem `isError` explícito (`AnalyticsPage`, `EntriesPage`, `SessionsPage`, `AdminPage`, `ProjectDetailPage`), mas não vi crash direto por `data` indefinido; risco principal é UX silenciosa em erro.
