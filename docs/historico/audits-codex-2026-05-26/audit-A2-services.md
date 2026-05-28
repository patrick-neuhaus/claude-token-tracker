# Audit W-A2 - Services + DB queries

## Status

Audit read-only concluida. Escopo principal lido: `database.ts`, `filterBuilders.ts`, `entriesService.ts`, `dashboardService.ts`, `sessionsService.ts`, `tokenService.ts` e todos os arquivos em `server/src/services/`. Também conferi rotas pontuais para validar coerção de query string.

Sem P0 confirmado. Sem connection leak confirmado: os usos de `pool.connect()` em `authService` e `passwordResetService` têm `finally { client.release(); }`; o helper `query()` usa `pool.query()`.

## Findings (P0-P3)

1. **P1 - `insertTokenEntry` faz write multi-step sem transaction**
   `server/src/services/tokenService.ts:59,103,113,140`
   Insere `token_entries`, depois upserta `projects`, depois `sessions`, depois atualiza `project_id`. Se falhar depois do insert inicial, a entrada fica gravada, mas a session/aggregate pode ficar ausente ou incompleta. Pior: no retry, `ON CONFLICT DO NOTHING` marca duplicate e não repara a session.

2. **P2 - SQL injection vector latente em `ORDER BY` de sessions**
   `server/src/services/sessionsService.ts:45`
   `ORDER BY s.${filters.sortBy} ${filters.sortDir}` depende de normalização externa. A rota atual chama `normalizeSortCol/normalizeSortDir`, mas o service exportado aceita objeto em runtime. Se outro caller passar direto, vira interpolação SQL. Defesa melhor: normalizar dentro do service também.

3. **P2 - `LIMIT ${limit}` interpolado em export**
   `server/src/services/entriesService.ts:75`
   `listEntriesForExport(..., limit = 50000)` injeta `limit` direto na query. Hoje a rota não expõe esse argumento, mas em runtime JS nada garante number. Use placeholder (`LIMIT $N`) ou clamp interno.

4. **P2 - Dedup de webhook/token existe, mas outros handlers de eventos não têm idempotência**
   `server/src/services/skillInvocationsService.ts:82`, `toolInvocationsService.ts:107`, `compactionsService.ts:77`
   `token_entries` usa `ON CONFLICT`; `skill_invocations`, `tool_invocations` e `compactions` não têm chave idempotente nem `ON CONFLICT`. Retry de hook duplica contagem/stats.

5. **P2 - Race em `toolInvocationsService.resolveProjectId`**
   `server/src/services/toolInvocationsService.ts:81,87`
   Faz `SELECT id` e depois `INSERT INTO projects`. Com unique index `(user_id, name)`, duas chamadas paralelas podem ambas perder o SELECT; uma insere, a outra falha unique violation e perde o tool invocation. Use `INSERT ... ON CONFLICT ... RETURNING id`.

6. **P2 - Throttle de password reset tem race**
   `server/src/services/passwordResetService.ts:53,69`
   Conta tokens válidos e depois insere fora de transaction/lock. Requests concorrentes podem todos passar `MAX_RESETS_PER_HOUR` antes do primeiro insert commitar.

7. **P2 - Date filters aceitam strings cruas sem validação/TZ**
   `server/src/utils/filterBuilders.ts:52,56`, `routeHelpers.ts:13`
   `from/to` entram direto como string. Data inválida pode virar erro DB; data sem timezone pode ser interpretada conforme timezone/session do Postgres, criando borda errada em filtros.

8. **P2 - N+1/batched loop remanescente no import**
   `server/src/routes/import.ts:173,259`
   Fora de `services`, mas relevante para DB queries: pricing resolve `K` modelos com await em loop, e sessions upsert faz await por session agregada. É bounded por 5000 linhas, mas ainda pode virar centenas/milhares de queries.

9. **P3 - Filter builders têm semântica divergente**
   `server/src/utils/filterBuilders.ts:43`, `dashboardService.ts:20`
   Entries usa `model ILIKE %term%`; dashboard usa `model = value`. O mesmo filtro `model` pode retornar conjuntos diferentes entre páginas.

10. **P3 - Falta whitelist para `source` em `buildEntryFilters`**
    `server/src/utils/filterBuilders.ts:47`
    Não é SQL injection porque usa parâmetro, mas aceita qualquer string e só retorna vazio. Melhor validar contra sources conhecidos para erro explícito e consistência.

11. **P3 - `parseInt` sem validação robusta em env e query strings**
    `server/src/config/database.ts:6`, `emailService.ts:35`, `sessions.ts:54`
    `DB_POOL_MAX`/`SMTP_PORT` podem virar `NaN`. Nas rotas, `parseInt("1abc")` vira `1`; `limit/offset` são depois clampados no service, mas `page` não tem upper bound.

12. **P3 - Dynamic SQL seguro hoje, mas depende de builders locais**
    Exemplos: `dashboardService.ts:53`, `projectService.ts:60`, `skillInvocationsService.ts:134`
    `${where}`, `${sessionWhere}`, `${entryWhere}`, `${projectFilter}` são montados por código interno com placeholders, então não vi injection direta. O risco é manutenção: qualquer campo dinâmico novo sem whitelist vira vetor.

## Resumo executivo

O padrão geral de SQL está bom: quase tudo usa `$1/$2` e params. Os riscos reais estão nas poucas interpolações estruturais (`ORDER BY`, `LIMIT`) e nos writes multi-step sem transaction/idempotência.

Prioridade de correção: transaction em `insertTokenEntry`; normalização interna de sort + parametrizar `LIMIT`; trocar `resolveProjectId` para upsert; adicionar idempotency keys para eventos de hook; validar datas e números na borda.
