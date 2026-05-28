# Audit C2 - Timestamps e Timezones

**Assessment:** REQUEST_CHANGES
**Arquivos revisados:** migrations SQL, dashboard/entries/analytics services, filtros, formatters, dashboard/entries pages.
**Schema:** `token_entries.timestamp` é `TIMESTAMPTZ` (`server/migrations/003_create_token_entries.sql:4`).

## Findings

| ID | Sev | Conf. | Local | Achado |
|---|---|---:|---|---|
| TZ-01 | P1 | Alta | `server/src/services/dashboardService.ts:50`, `server/src/services/analyticsService.ts:111-113` | `today_cost_usd`, `active_hours_today` e `cost_today` calculam início do dia com `date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC')`. Em DB UTC isso vira meia-noite UTC, não meia-noite BRT, incluindo 21:00-23:59 BRT do dia anterior. |
| TZ-02 | P1 | Alta | `server/src/services/analyticsService.ts:65-73` | Comparação mês atual/passado usa `date_trunc('month', NOW())` em timezone da sessão do Postgres. Para Patrick em BRT, começo do mês deveria ser `YYYY-MM-01 00:00 America/Sao_Paulo` convertido para UTC. |
| TZ-03 | P1 | Alta | `client/src/pages/EntriesPage.tsx:93,97,111-112`, `server/src/utils/filterBuilders.ts:52-57` | Entries/CSV export mandam `YYYY-MM-DD` cru para `from/to`. O `to` vira meia-noite inclusiva e perde quase todo o dia selecionado; além disso a interpretação de `TIMESTAMPTZ` fica no timezone do DB, não BRT. |
| TZ-04 | P1 | Alta | `server/src/routes/webhook.ts:11`, `server/src/services/tokenService.ts:67,129` | Webhook aceita `timestamp: z.string()` sem validar ISO 8601 nem offset/Z. Com `Z`, Postgres armazena corretamente em UTC; sem offset, Postgres interpreta no timezone da sessão. Timestamp inválido também passa no schema e tende a virar erro 500. |
| TZ-05 | P2 | Alta | `client/src/components/shared/DateRangeFilter.tsx:37-38`, `server/src/utils/dateBR.ts:42-45` | Presets `7d/30d` no cliente são janela móvel `now - N*24h`; fallback do servidor usa meia-noite BRT de N dias atrás. Mesmo preset tem semântica diferente dependendo se a URL manda `from/to` ou só `period`. |
| TZ-06 | P2 | Média | `client/src/components/shared/DateRangeFilter.tsx:34,40-41` | Presets `today/month` usam timezone local do browser (`setHours`, `new Date(y,m,1)`), enquanto agregações SQL estão hardcoded em `America/Sao_Paulo`. Se o browser não estiver em BRT, dashboard e charts divergem. |
| TZ-07 | P2 | Alta | `server/src/services/entriesService.ts:68`, `server/src/utils/csvExporter.ts:11,19,37` | CSV exporta `timestamp` via `String(value)` do objeto retornado pelo `pg`, não UTC ISO explícito nem local BRT. Resultado depende do parser/runtime Node e fica ruim para reimport/planilha. |
| TZ-08 | P2 | Média | `server/src/services/analyticsService.ts:38`, `client/src/pages/AnalyticsPage.tsx:105` | `date_trunc('week', timestamp AT TIME ZONE 'America/Sao_Paulo')` retorna `timestamp without time zone`; o cliente faz `slice(0,10)`/`formatShortDate`. Melhor retornar `::date` ou texto `YYYY-MM-DD` já canônico para evitar serialização dependente do driver. |

## Confirmado OK

- Daily dashboard chart agrega por dia BRT: `server/src/services/dashboardService.ts:87`.
- Heatmap usa DOW/hora BRT: `server/src/services/analyticsService.ts:81-82`; labels do componente só exibem os buckets recebidos.
- Display principal de timestamp usa BRT: `client/src/lib/formatters.ts:6-8`.
- `parsePeriod` do servidor tem helpers BRT corretos para `today/month/7d` quando só `period` chega: `server/src/utils/routeHelpers.ts:41-54`.

## Respostas diretas

1. Schema: `TIMESTAMPTZ`.
2. Webhook: aceita qualquer string; ISO com `Z` funciona como UTC, mas não é exigido.
3. `date_trunc` cru ainda aparece em mês e em cálculo de "today"; risco real de boundary UTC.
4. Dashboard `today`: normalmente cliente resolve local via `presetToRange`; se browser BRT, bate. Se não, diverge.
5. Displays: `formatDate` força BRT; `formatShortDate/fullDate` não.
6. Charts daily: BRT. Weekly model trend: timestamp sem TZ, deveria ser date/text.
7. Heatmap: BRT.
8. CSV: não é UTC ISO explícito.
