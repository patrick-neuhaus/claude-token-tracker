---
name: stack-vite-react
description: Padrões frontend do claude-token-tracker. Vite + React 19 + TypeScript + React Query + react-router-dom + Recharts + shadcn/ui. Cobre query invalidation correta, filters dinâmicos via /distinct endpoints, TZ display BRT na borda, empty/error states, type drift via api-client gerado. Foco em bugs reais do audit FINAL (B1-B3, F2, F9, F15, F16). Ative ao criar/editar página, hook, query, mutation, chart, filter, empty state, error boundary. Triggers PT: página, hook, query, mutation, filter, chart, empty state, react query invalidate, type drift. EN: Vite frontend, React Query, query invalidation, filter UI, chart component, empty state, type drift.
---

# Vite + React 19 + TS

## ⚠️ Doc oficial (verificar antes de mudar contrato)

- Vite 5: https://vite.dev/
- React 19: https://react.dev/
- React Query v5: https://tanstack.com/query/latest/docs/react/overview
- React Router 7: https://reactrouter.com/en/main
- Recharts: https://recharts.org/
- shadcn/ui: https://ui.shadcn.com/
- Última verificação: 2026-05-26

## Setup planejado V2

- Vite 5+ com `@vitejs/plugin-react`.
- React 19, TypeScript estrito (`strict: true`).
- React Router v7 (mantém migration v6→v7 simples).
- React Query v5 (queryKey factory, mutation invalidation explícita).
- Recharts pra charts (token-tracker tem 10+ chart components).
- Tailwind 3.4 + shadcn/ui (mantém da legacy).
- `@tracker/api-client` (workspace package) tipa todas chamadas API → server.

Dockerfile multi-stage planejado: build (`node:20-alpine` + pnpm) → runtime (`nginx:alpine`).

## Type drift solution: api-client gerado

`packages/api-client/`:

```typescript
// Gerado de openapi.json via openapi-typescript
import type { paths } from "./openapi.gen";

export type EntryListResponse = paths["/api/entries"]["get"]["responses"]["200"]["content"]["application/json"];

export const api = {
  entries: {
    list: (filters: EntryFilters) => fetchClient.get<EntryListResponse>(`/entries`, { params: filters }),
    distinct: () => fetchClient.get<EntriesDistinctResponse>(`/entries/distinct`),
  },
  dashboard: { /* ... */ },
};
```

Build step: `pnpm --filter @tracker/api openapi:gen` → atualiza `packages/api-client/openapi.gen.ts`. CI bloqueia drift (R3).

Web consome `import { api } from "@tracker/api-client"`. Type drift entre server response e client expectation = compile error.

## Padrão de hook (React Query v5)

```typescript
// apps/web/src/hooks/useEntries.ts
import { useQuery } from "@tanstack/react-query";
import { api, type EntryFilters } from "@tracker/api-client";
import { qk } from "../lib/queryKeys";

export function useEntries(filters: EntryFilters) {
  return useQuery({
    queryKey: qk.entries.list(filters),
    queryFn: () => api.entries.list(filters),
    staleTime: 30_000,
  });
}
```

queryKey factory canônica em `apps/web/src/lib/queryKeys.ts` (já existe no legacy). Nunca raw key string em hooks. Compile error se typo (factory tipado `as const`).

## Padrão de mutation + invalidation

```typescript
export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.imports.uploadCsv(file),
    onSuccess: () => {
      // Invalida TUDO que pode ter mudado (B2-02 audit FINAL — invalidar pouco quebra UI)
      qc.invalidateQueries({ queryKey: qk.dashboard.all() });
      qc.invalidateQueries({ queryKey: qk.sessions.all() });
      qc.invalidateQueries({ queryKey: qk.entries.all() });
      qc.invalidateQueries({ queryKey: qk.analytics.all() });
      qc.invalidateQueries({ queryKey: qk.achievements() });
      qc.invalidateQueries({ queryKey: qk.entries.distinct() });
      qc.invalidateQueries({ queryKey: qk.projects.all() });
    },
  });
}
```

Regra: mutation invalida TODAS namespaces que dependem do estado mudado. Lista explícita > "invalidateQueries()" sem args (que invalida tudo e custa).

Tabela canônica de invalidations (`apps/web/src/lib/invalidations.ts`):

```typescript
export const INVALIDATIONS = {
  TOKEN_INGEST: [qk.dashboard.all, qk.sessions.all, qk.entries.all, qk.analytics.all, qk.entries.distinct],
  SESSION_RENAME: [qk.sessions.all, qk.analytics.all, qk.projects.detailNamespace],
  PROJECT_CREATE: [qk.projects.all, qk.dashboard.all, qk.entries.all],
  PROJECT_DELETE: [qk.projects.all, qk.sessions.all, qk.entries.all, qk.dashboard.all, qk.analytics.all],
  SESSION_ASSIGN: [qk.projects.all, qk.sessions.all, qk.dashboard.all, qk.analytics.all],
  SETTINGS_UPDATE: [qk.settings, qk.planStatus, qk.dashboard.all],
} as const;
```

Mutation chama lista, não compõe ad-hoc. Corrige B2-02 a B2-06 audit FINAL.

## Filtros dinâmicos via /distinct

Padrão já implementado 2026-05-26 (EntriesPage + DashboardFilters):

```typescript
const { data: distinct } = useEntriesDistinct();

<NativeSelect value={source} onChange={(e) => setSource(e.target.value)}>
  <option value="">Todas</option>
  {(distinct?.sources ?? []).map((s) => (
    <option key={s} value={s}>{displayLabel(s)}</option>
  ))}
</NativeSelect>
```

Aplicar em **todos dropdowns que filtram por enum dinâmico do DB**:
- source/model em EntriesPage ✓
- source em DashboardFilters ✓
- model em DashboardFilters (falta — F2 audit FINAL, virou Input livre incorreto)
- skill categories (P2 audit FINAL — hardcoded)
- skill sources/status (P2 audit FINAL — hardcoded)

`useEntriesDistinct` é template. Criar análogo: `useSkillsDistinct`, etc., conforme necessário.

## TZ display BRT

R12: display sempre BRT. Função canônica em `apps/web/src/lib/formatters.ts`:

```typescript
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit",
  });
}
```

Charts (Recharts): label = data BRT via formatter. Backend agrega em BRT (R12). Frontend exibe BRT. Zero conversão necessária.

## Empty / error states

Audit B3 reportou:
- DashboardPage mostra onboarding quando filtro retorna zero (F16). Fix: distinguir `entry_count_global === 0` (sem webhook) vs `entry_count_filtered === 0` (filtro vazio).
- AnalyticsPage / AchievementsPage não tratam `isError` (P2). Fix: ErrorState component padrão.

Padrão:

```tsx
function MyPage() {
  const { data, isLoading, isError } = useQuery(...);

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!data || data.items.length === 0) {
    return hasActiveFilters
      ? <EmptyState message="Sem resultados com esses filtros" action={<ClearFiltersButton />} />
      : <EmptyState message="Sem dados ainda" action={<OnboardingLink />} />;
  }
  return <Content data={data} />;
}
```

## Date filter "Até" — fix F9

Audit FINAL F9: filter `to` envia `YYYY-MM-DD`, server compara `<= 'YYYY-MM-DD'` = meia-noite, perde dia inteiro.

Fix: client anexa `T23:59:59.999` antes de enviar OR server interpreta `to` como fim do dia BRT.

Preferência: client envia ISO range explícito.

```typescript
function toDateRangeISO(from: string, to: string) {
  return {
    from: from ? new Date(`${from}T00:00:00-03:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999-03:00`).toISOString() : undefined,
  };
}
```

## Charts (Recharts) — padrão

Token-tracker tem ~10 charts. Padrão:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="date" tickFormatter={formatShortDate} />
    <YAxis tickFormatter={formatUSD} />
    <Tooltip
      labelFormatter={(label) => formatDate(label)}
      formatter={(value, name) => [formatUSD(value), displayModelName(name)]}
    />
    {models.map((m) => (
      <Line
        key={m}
        type="monotone"
        dataKey={m}
        name={m}
        stroke={getModelColor(m)}
      />
    ))}
  </LineChart>
</ResponsiveContainer>
```

- Cores via `getModelColor` (constants.ts). Family-based: opus purple, sonnet blue, haiku green, gpt amber.
- Labels via `displayLabel`/`displayModelName` (sem mostrar raw).
- Tooltips com formatUSD/formatNumber padrão.

## Bugs conhecidos / armadilhas

- **F2 audit — Dashboard model Input livre**: server faz exact match. Trocar por NativeSelect com `distinct.models`.
- **F9 audit — Entries date "Até"**: meia-noite exclusiva. Client envia ISO range.
- **F15 audit — MonthNarrative hardcoded**: usar `displayLabel(source)`.
- **F16 audit — Dashboard onboarding quando filtro zero**: distinguir global vs filtered.
- **B2-07 audit — raw queryKey strings**: usar qk factory. Hooks atuais com `["entries", filters]` migram pra `qk.entries.list(filters)`.
- **B2-08 audit — staleTime drift**: política por domínio (entries: 30s, distinct: 5min, sessions: 30s, skills: 60s).
- **B3-P3 audit — Labels sem htmlFor**: a11y. `<Label htmlFor="id">` + `<Input id="id">`.
- **B3-P2 audit — dead components SvgGaugeBar, SvgScatterPlot**: deletar.
- **HMR no Windows lento**: dev `pnpm dev` no host, API container.
- **Variáveis env**: `VITE_*` prefix obrigatório. Nunca `VITE_*` com secret server-side.

## Quando ativar outras skills

- shadcn component novo → `stack-shadcn-tailwind`.
- Endpoint API novo → `tracker-ingestion-contract` (se ingestion) ou `stack-express-pg-queue` (CRUD).
- Display source/model novo → `tracker-business-rules` (normalize) + `tracker-domain` (label canônico).
- Teste hook React Query → `tracker-testing-ci` (MSW + render hook).

## ⚠️ Sempre

- Antes de raw queryKey string, conferir factory `qk.*`.
- Antes de mutation, declarar invalidation list em `INVALIDATIONS`.
- Antes de filter, conferir se enum dinâmico → use `/distinct` endpoint.
- Antes de render value bruto, conferir display function (`displayLabel`, `displayModelName`).
- Antes de date filter, anexar range BRT explícito.

## Knowledge persistente

- **React Query v5**: structural hash de queryKey. Objeto inline OK no key.
- **React Router v7**: file-based opcional, mas tracker mantém code-based (BrowserRouter + Routes/Route legacy).
- **Recharts**: light, sufficient pra dashboards token. Não migra pra D3 sem motivo forte.
- **`react-window`**: NÃO usar day-1. Tracker tem ~50 rows pagination, virtualização premature.
- **Bundle size atual**: ~1MB gzip (vendor + app). Splitting code via React.lazy pra páginas pesadas (Analytics, Achievements).

## References / recipes / templates

- (planejado V2) `references/vite-config.ts` — base config V2.
- (planejado V2) `references/queryKeys-canonical.ts` — qk factory.
- (planejado V2) `references/invalidations-matrix.ts` — INVALIDATIONS table.
- (planejado V2) `recipes/page-with-states.tsx` — empty/error/loading pattern.
- (planejado V2) `recipes/chart-line-canonical.tsx` — Recharts pattern.
