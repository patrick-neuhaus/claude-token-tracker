# Audit FINAL — claude-token-tracker

Consolidado de 9 workers codex read-only (Waves A+B+C) executados 2026-05-26.

## Sumário

| Wave | Worker | Foco | Findings |
|------|--------|------|----------|
| A | A1 | Routes/handlers | 13 (2 P1, 9 P2, 2 P3) |
| A | A2 | Services + DB queries | 12 (1 P1, 7 P2, 4 P3) |
| A | A3 | Middleware (auth/CSRF) | 6 (1 P1, 1 P2, 4 P3) |
| A | A4 | Webhook ingestion | 9 (3 P1, 5 P2, 1 P3) |
| B | B1 | Filters & constants | 13 (3 P1, 7 P2, 3 P3) |
| B | B2 | React Query hooks | 9 (1 P1, 5 P2, 3 P3) |
| B | B3 | Pages + components | 11 (2 P1, 4 P2, 5 P3) |
| C | C1 | Source/Model 3-way diff | 7 (2 P1, 3 P2, 2 P3) |
| C | C2 | Timezones | 8 (4 P1, 4 P2, 0 P3) |
| **Total** | — | — | **88 findings** |

Zero P0 confirmados. Vários P1 com correlação forte (mesma causa raiz aparece em 2-3 workers).

## P1 — fix obrigatório antes de produção

### F1. `/analytics/cache-hit-trend` quebra 500
**Source:** B2-01
**File:** `server/src/services/analyticsService.ts:252`
**Bug:** query usa `cache_read_tokens` mas schema é `cache_read` (migration 003). Endpoint sempre retorna 500.
**Fix:** trocar `cache_read_tokens` → `cache_read` no SQL.
**Esforço:** 5min.

### F2. Filter "Modelo" do Dashboard quebrado (busca livre vs exact match)
**Source:** C1 P1, B1 P2 (DashboardFilters input livre)
**File:** `client/src/components/dashboard/DashboardFilters.tsx:55`, `server/src/services/dashboardService.ts:20`
**Bug:** input livre no Dashboard, mas server faz `model = $N` exact match. Digitar `opus` retorna vazio mesmo havendo `claude-opus-4-7` no DB.
**Fix:** trocar Input por NativeSelect com `distinct.models` (já tem hook `useEntriesDistinct`). Patrick fez isso em EntriesPage hoje, replicar.
**Esforço:** 10min.

### F3. Billing wrong pra model "unknown"
**Source:** C1 P1, A4-1
**File:** `server/src/utils/modelNormalizer.ts`, `server/src/services/pricingOverrideService.ts:82`
**Bug:** collector envia `model="unknown"` em fallback. Server aceita literal. `normalizeModel("unknown")` retorna `gpt-5` por default. Cobra GPT por entries sem modelo identificado.
**Fix:** normalizer retornar sentinel "unknown" → DEFAULT_PRICING zero ou flag. Ou webhook rejeitar `model="unknown"`/string lixo via allowlist regex (`^(claude-|gpt-)`).
**Esforço:** 30min.

### F4. Filter de modelos lixo no DB (já patcheado parcial)
**Source:** A4-1 (deletei 16 entries hoje 26/05 — test, healthcheck-bogus, etc.)
**Bug:** webhook aceita `model: z.string().min(1)`. Qualquer string entra. Acumula lixo no DB que polui dropdowns.
**Fix:** allowlist regex no webhook schema + lista de modelos suportados centralizada.
**Esforço:** 20min.

### F5. Dedup webhook ignora NULL session_id
**Source:** A4-2
**File:** `server/migrations/017_*.sql` (idx_unique_token_entry)
**Bug:** UNIQUE index inclui `session_id`. Postgres trata NULL como distinto → entries sem session_id passam dedup mesmo se duplicadas.
**Fix:** `NULLS NOT DISTINCT` ou `COALESCE(session_id,'')` em index expression. Migration nova.
**Esforço:** 30min.

### F6. `insertTokenEntry` sem transaction
**Source:** A2-1, A4-3
**File:** `server/src/services/tokenService.ts:59,103,113,140`
**Bug:** insert token_entry + upsert project + upsert session + update project_id sem transaction. Se falha após insert inicial, session/aggregate fica órfã. Retry vira duplicate (ON CONFLICT DO NOTHING) e nunca repara.
**Fix:** wrappar em `BEGIN..COMMIT` via `pool.connect()`.
**Esforço:** 1h.

### F7. "Hoje" cost incorreto (UTC vs BRT boundary)
**Source:** TZ-01
**File:** `server/src/services/dashboardService.ts:50`, `analyticsService.ts:111-113`
**Bug:** `today_cost_usd`, `active_hours_today`, `cost_today` calculam `date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC')` — vira meia-noite UTC, não meia-noite BRT. Entries 21h-23h59 BRT do dia anterior contam como hoje.
**Fix:** usar `date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')` sem voltar pra UTC, ou comparar com `timestamp AT TIME ZONE 'America/Sao_Paulo'`.
**Esforço:** 30min.

### F8. Mês atual/passado usa TZ errado
**Source:** TZ-02
**File:** `server/src/services/analyticsService.ts:65-73`
**Bug:** `date_trunc('month', NOW())` em TZ da sessão Postgres (UTC), não BRT. Comparação mês corrente vs anterior errada nos boundaries.
**Fix:** mesmo padrão F7.
**Esforço:** 20min.

### F9. Entries date filter "Até" perde dia inteiro
**Source:** TZ-03, B3 P1
**File:** `client/src/pages/EntriesPage.tsx:93,97,111-112`, `server/src/utils/filterBuilders.ts:52-57`
**Bug:** filter `to` envia `YYYY-MM-DD` cru. Server compara `e.timestamp <= 'YYYY-MM-DD'` que vira meia-noite — perde o dia inteiro selecionado.
**Fix:** anexar `T23:59:59.999Z` no client antes de enviar, ou server interpretar como fim do dia + TZ BRT.
**Esforço:** 15min.

### F10. Webhook timestamp aceita lixo
**Source:** TZ-04
**File:** `server/src/routes/webhook.ts:11`
**Bug:** `timestamp: z.string()` sem validar ISO 8601 nem Z offset. Timestamp inválido vira 500 no DB. Sem offset vira TZ da sessão.
**Fix:** `z.string().datetime({ offset: true })`.
**Esforço:** 5min.

### F11. Admin role stale via JWT
**Source:** A1
**File:** `server/src/middleware/requireRole.ts:6`
**Bug:** requireRole confia em role do JWT. Admin rebaixado mantém acesso até expirar token.
**Fix:** revalidar role atual no DB em `requireRole` (uma query a mais por request admin).
**Esforço:** 20min.

### F12. CSV import aceita tokens negativos
**Source:** A1
**File:** `server/src/routes/import.ts:139`
**Bug:** `parseInt("-5")`, `parseInt("10abc")` passa. Grava entry com valor inválido, cobra errado.
**Fix:** Zod schema int >= 0, rejeita parsing parcial.
**Esforço:** 10min.

### F13. CSRF bloqueia 3 endpoints webhook fora de `/api/webhook/*`
**Source:** A3 P1
**File:** `server/src/routes/compactions.ts:33`, `skillInvocations.ts:29`, `toolInvocations.ts:29` (mount em index.ts)
**Bug:** CSRF_SKIP_PREFIXES só pula `/api/webhook/` e `/health`. Mas há POST webhooks em `/api/compactions/track`, `/api/skill-invocations/track`, `/api/tool-invocations/track` que precisam de `X-Webhook-Token` mas pegam 403 CSRF antes.
**Fix:** mover endpoints pra `/api/webhook/compactions`, `/api/webhook/skill-invocations`, `/api/webhook/tool-invocations`, ou adicionar paths ao SKIP_PREFIXES.
**Esforço:** 30min (escolher abordagem + ajustar collectors).

### F14. PricingDrawer + WebhookInfo hardcoded e stale
**Source:** B1 P1 (2 findings)
**File:** `client/src/components/settings/PricingDrawer.tsx:22,177`, `client/src/components/settings/WebhookInfo.tsx:62,306`
**Bug:** SUPPORTED_MODELS frontend diverge backend PRICING. Tabela de referência diz "atualizado 2026-04-29", backend diz 2026-05-19. Drift conhecido.
**Fix:** endpoint `/api/settings/pricing-meta` retornando lista canônica + last_updated. Frontend consome.
**Esforço:** 1h.

### F15. MonthNarrative renderiza source errado
**Source:** B1 P1
**File:** `client/src/components/dashboard/MonthNarrative.tsx:33`
**Bug:** narrativa diz "claude.ai" pra qualquer fonte que não seja claude-code (incluindo codex).
**Fix:** usar `displayLabel(topSource.source)` em vez de hardcoded.
**Esforço:** 5min.

### F16. Dashboard mostra onboarding com filtro zero
**Source:** B3 P1
**File:** `client/src/pages/DashboardPage.tsx:152`
**Bug:** `entry_count === 0` (com filtros aplicados) → renderiza `<WebhookPing />` em vez de EmptyState com "limpar filtros". Esconde filtros + confunde user.
**Fix:** distinguir "sem dados nunca" (entry_count global zero) vs "filtro zerou".
**Esforço:** 30min.

## P2 — médio (resumido)

Total 36 P2. Grupos principais:

- **Validação de query params fraca** (A1, A2): from/to, project_id UUID, period enum, page numbers sem upper bound. Solução central: schemas Zod em rota.
- **Response shape divergente** (A1): /sessions/:id/entries vs /entries shape diferente. /analytics/compare retorna `[]` vs `{summary,daily}`.
- **Mutations sem invalidate** (B2): import, settings, project delete, session assign não invalidam analytics/dashboard.
- **Idempotência faltando** em skill_invocations, tool_invocations, compactions (A2).
- **Race conditions**: resolveProjectId (A2), passwordReset throttle (A2).
- **Empty/error states**: Analytics, Achievements sem ErrorState (B3).
- **Labels brutos** (B1, C1): EntriesTable, SessionsTable, AnalyticsPage renderizam source/model raw sem displayLabel/displayModelName.
- **Sessions "Limpar" bug** (B3): botão limpa só project_id, ignora search/date.
- **CSV import** aceita só claude-code/claude.ai, sem codex (A4-9, A1, C1).
- **SessionTimeFilters "Hoje" errado** (B1): aplica 24h em vez de começo do dia.
- **Filter model semântica divergente** (A2): entries usa ILIKE, dashboard usa exact match.
- **Webhook spam zero-token** (A4-5): payload com tokens=0 passa, permite flood.
- **Rate limit webhook removido** (A4-6): UNIQUE mitiga replay exato mas não spam variado.
- **CSV export TZ ruim** (TZ-07).
- **Presets de data duplicados** em N lugares com listas diferentes (B1).

## P3 — baixo (resumido)

23 P3. Grupos:

- **qk factory existe mas hooks usam raw keys** (B2-07): 14 hooks.
- **staleTime drift** entre hooks (B2-08).
- **Dead components**: SvgGaugeBar, SvgScatterPlot, primitives/* (B3).
- **A11y**: Labels sem htmlFor, icon buttons sem aria-label, AppTable ARIA inconsistente (B3).
- **CSRF cookie não signed** (A3).
- **errorHandler loga stack completo** sem sanitize (A3).
- **CSP styleSrc unsafe-inline** ainda (A3).
- **GPT label "Gpt 5.5"** em vez de "GPT 5.5" (C1).
- **forgot password engole erro** sem log (A1).
- **import retorna mensagem interna DB** ao client (A1).
- **Skill detail link sem ?source** (B3).

## Recomendação de ordem de fix

**Wave FIX-1 (P1 fáceis, <30min cada, ~3h total):**
F1 (cache_read), F10 (timestamp validation), F12 (CSV negativos), F15 (MonthNarrative), F9 (entries date "Até"), F2 (Dashboard model filter).

**Wave FIX-2 (P1 médios, ~3h total):**
F3 (model unknown billing), F4 (model allowlist), F7 (today TZ), F8 (mes TZ), F11 (admin role), F13 (CSRF webhook paths), F16 (Dashboard empty state).

**Wave FIX-3 (P1 grandes + dependencies, ~3h total):**
F5 (dedup NULL session), F6 (transaction insertTokenEntry), F14 (pricing endpoint).

**Wave FIX-4 (P2 cluster — validation):**
Schemas Zod centralizados em rotas, response shapes consistentes, idempotência hooks. ~4h.

**Wave FIX-5 (P2 cluster — UX):**
Labels brutos, mutations sem invalidate, error states, presets centralizados. ~3h.

**Wave FIX-6 (P3 cleanup):**
qk migration, dead components, a11y. ~2h.

Total estimado fix: 18h dev. Pode delegar via outra rodada codex-delegate em wave builders.

## Próximos passos sugeridos

1. Patrick triar FIX-1 (low effort, high impact). Spawn builder codex.
2. Decidir abordagem F13 (mover paths vs expandir CSRF skip).
3. Decidir F14 escopo (endpoint novo vs popular via /entries/distinct + pricing fetch).
