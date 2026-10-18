# Runbook — claude-token-tracker

Doc operacional pra debugar/operar o tracker. Atualizar quando descobrir novo failure mode.

## Server não sobe

1. Checar porta: `netstat -ano | findstr ":3002.*LISTENING"`. Se vazio, server não tá rodando.
2. Tail log: `tail -30 tracker-server.log`. Procurar exception/erro.
3. Tail autostart: `tail -30 tracker-autostart.log`. Vê em que fase travou (docker, pg, healthcheck).
4. Manual start: `wscript.exe start-server-detached.vbs`. Bypass do bat.
5. Manual node: `node server/dist/index.js`. Vê erro direto no terminal.

## Porta 5433 fechada com o container saudável

Sintoma (09/10/2026): `/health` 503, servidor com `ECONNREFUSED 127.0.0.1:5433`, container
`healthy` no `docker ps`, mas `Test-NetConnection 127.0.0.1 -Port 5433` falha. Dia inteiro sem
linha gravada; o hook guarda as entradas em `scripts/token_log.jsonl` com `_error`.

Causa medida: no boot, o Docker Desktop religa a porta do container que ele mesmo sobe pela
restart policy. O antigo `docker start` do `start-tracker.bat`, disparado no instante em que o
Docker respondia, pediu aprovação de porta 150 ms depois; o aprovador ocupou a 5433 e o
encaminhamento falhou sem nova tentativa. Linha que prova: `[W] opening a port forward ...
127.0.0.1:5433 ... bind: Only one usage of each socket address` em
`%LOCALAPPDATA%\Docker\log\host\com.docker.backend.exe.log*` (depois do boot, em `monitor.log`).

Conserto (10/10/2026):
- `start-tracker.bat` chama `tracker-watchdog.py --ensure-db`: espera o Docker religar as portas,
  só dá `docker start` em container parado, confere a porta no host e, fechada, `docker restart`.
- O watchdog de 3 min refaz a porta sozinho quando ela fica fechada em dois ticks seguidos com o
  Docker no ar: `docker restart` (rodando) ou `docker start` (parado), no máximo 3 por hora.
  Nunca recria nem remove container ou volume. Registro: linhas `watchdog:` em
  `tracker-autostart.log`.
- Casos: `python scripts/test_tracker_watchdog.py` (16).

Manual: `docker restart claude-token-tracker-db` refaz o encaminhamento. Entradas perdidas no
período: `python scripts/replay_token_log.py --since <AAAA-MM-DD> --errors-only`.

## Codex collector parou de coletar

1. `Get-ScheduledTaskInfo -TaskName "CodexTokenCollector"`. Olhar `LastTaskResult`:
   - `0` = sucesso último run
   - `267009` = ainda rodando (OK)
   - `2147946720` = already running (OK)
   - `2147942405 (0x80070005)` = access denied — re-registrar como S4U
   - `2147946720 + NextRunTime vazio` = trigger morto — re-registrar
2. Manual: `python codex-token-collector.py --dry-run --limit 3 --profile`. Vê se ainda lê JSONLs.
3. Force run task: `Start-ScheduledTask -TaskName "CodexTokenCollector"`.

## Recovery codex collector

Se collector parar de coletar:
1. Verificar `Get-ScheduledTaskInfo -TaskName "CodexTokenCollector"` LastTaskResult
2. Run manual: `python codex-token-collector.py --profile`
3. Se rows faltando, backup state + reset entries afetadas (ver scripts/recovery-codex.ps1 se houver)
4. webhookLimiter REMOVIDO (Onda 21/05) — qualquer 429 indica config mudou

## Claude hook não envia entries

1. Confirmar env: `echo $env:TOKEN_TRACKER_TOKEN` deve ter UUID atual.
2. Testar manual: trigger Stop hook num turno. Hook envia webhook direto sem persistir local — confira via `curl localhost:3002/api/recent-entries`.
3. Smoke webhook: `curl -X POST http://localhost:3002/api/webhook/track-tokens -H "X-Webhook-Token: $TOKEN" -d '{...}'`. Deve retornar 201.

## Log enche de "duplicate key"

Esperado em alguns cenários (collectors re-enviam entries). Worker 4 Onda 1 adicionou try/catch 23505 silencioso. Se ainda aparece, tokenService.ts pode ter regredido.

## Rotação de webhook token

Via UI Settings → Rotate Webhook Token. Ou direto SQL:

```sql
UPDATE users
SET webhook_token = gen_random_uuid(),
    webhook_token_hash = encode(digest(webhook_token::text, 'sha256'), 'hex'),
    webhook_token_rotated_at = NOW()
WHERE email = 'patrick.studioartemis@gmail.com'
RETURNING webhook_token;
```

Atualizar `.env` `WEBHOOK_TOKEN_DEFAULT`, `~/.claude/settings.json` `TOKEN_TRACKER_TOKEN`, user env `TOKEN_TRACKER_TOKEN`.

## Logs grandes

Rotacionados auto via task `ClaudeTokenTrackerLogRotation` daily 03h quando > 10MB.
Manual: `powershell scripts/rotate-logs.ps1`.

## Backup do banco

Daily 03:30 via task `ClaudeTokenTrackerBackup`. Saída em `~/Documents/backups/claude-token-tracker/*.sql.gz`. Retenção 30 dias.

Manual: `powershell scripts/backup-db.ps1`
Restore: `gunzip -c arquivo.sql.gz | docker exec -i claude-token-tracker-db psql -U tracker -d claude_token_tracker`

## Health endpoint

`GET http://localhost:3002/health` retorna JSON `{ ok, uptime_seconds, db: { status, latency_ms }, version, timestamp }`. Sem auth, sem rate limit. HTTP 200 quando DB ok, 503 quando DB inacessível. Usar em uptime monitors e probes externos.

## Dashboard com erro e servidor saudável

Se `/health` retorna 200, confira o status dos pedidos `/api/dashboard/*` no navegador. HTTP 401 indica sessão ausente/inválida; exige entrar novamente. Reiniciar Docker não restaura o cookie de login. HTTP 5xx ou falha de conexão exigem consultar os logs do servidor.

Em 18/09/2026, uma aba restaurada mantinha o usuário em memória após perder a credencial: a API respondia `401 No token provided`, mas o painel exibia "Erro ao carregar dados". O frontend passa a invalidar a sessão diante de 401 protegido, limpar o cache e encaminhar ao login. Registro e validação: `docs/historico/2026-09-18-session-recovery.md`.

## Reset completo

```powershell
powershell uninstall.ps1   # remove scheduled tasks, lock file
docker compose down -v     # cuidado: apaga DB
```

## Migrations

```bash
npm run migrate              # aplica pendentes
docker exec claude-token-tracker-db psql -U tracker -d claude_token_tracker -c "SELECT * FROM _migrations"
```

## Smoke endpoints

```bash
TOKEN=$(grep WEBHOOK_TOKEN_DEFAULT .env | cut -d= -f2)
curl http://localhost:3002/                                   # → HTML
curl -I http://localhost:3002/                               # → helmet headers
curl -X POST http://localhost:3002/api/webhook/track-tokens \
  -H "X-Webhook-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"codex","model":"gpt-5.5","input_tokens":10,"output_tokens":5,"total_tokens":15,"session_id":"smoke","timestamp":"2026-01-01T00:00:00Z"}'
```

## Smoke test rápido

Script bash que valida estado completo:

```bash
# Server + helmet
curl -s -o /dev/null -w "Server: %{http_code}\n" http://localhost:3002/
curl -s -I http://localhost:3002/ | grep -c "content-security-policy"

# Webhook
TOKEN=$(grep WEBHOOK_TOKEN_DEFAULT .env | cut -d= -f2)
curl -s -X POST http://localhost:3002/api/webhook/track-tokens \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: $TOKEN" \
  -d '{"timestamp":"2026-01-01T00:00:00Z","source":"codex","model":"gpt-5.5","input_tokens":1,"output_tokens":1,"total_tokens":2,"session_id":"smoke-test"}'
# Esperado: {"status":"ok","cost_usd":...} HTTP 201

# Rate limit
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"x"}'
done
# Esperado: 5x 401 + 1x 429

# Cleanup
docker exec claude-token-tracker-db psql -U tracker -d claude_token_tracker -c \
  "DELETE FROM token_entries WHERE session_id = 'smoke-test'; DELETE FROM sessions WHERE session_id = 'smoke-test';"
```

## Histórico de hardening

8 ondas de fixes aplicadas entre 2026-05-19 e 2026-05-20:
- Onda 1: security crítica (rate limit, webhook hash, bootstrap gate, PS injection)
- Onda 2: data integrity (migration 017 idx_unique+BIGINT+FK cascade, pricing fix, timestamp bug)
- Onda 3: reliability (single trigger, S4U Codex, helmet, log rotation, docker healthcheck)
- Onda 4: P1 cleanup (assignSession IDOR, cost_usd server-only, forgot throttle per-email, total_tokens math, frontend stale closure)
- Onda 5: perf (import CSV batch, pg pool error handler, getSessionEntries LIMIT, migrations idempotente, uninstall, --no-recreate)
- Onda 6: P3 cluster (errorHandler errorId, BCRYPT_COST env, dead code badges.ts 140 lines, mtime cache codex 140x speedup)
- Onda 7: cosmético (FOUC theme, BadgeCard CSS extract, advisory lock register, ExecutionPolicy comment, RUNBOOK)
- Onda 8: closeout (advisory lock migrate, email retry, migration 019 webhook UNIQUE, noUncheckedIndexedAccess 48 erros, bundle split 956→509 KB, docker hardening)
- Onda 9: a11y + CSP cleanup + smoke final

Total: ~100 fixes aplicados de 112 findings trident inicial. ~90% coverage.

## Estado conhecido (Maio 2026)

- DB: 2 users, 50k+ token_entries, 19 migrations aplicadas
- Frontend: bundle inicial ~509 KB gzip 157 KB (era 956 KB)
- Coletores: Claude (Stop hook) + Codex (scheduled task 1min) + tampermonkey (claude.ai web)
- Backlog residual: rewrite git history (decisão Patrick), helmet unsafe-inline cleanup completo, a11y exaustivo
