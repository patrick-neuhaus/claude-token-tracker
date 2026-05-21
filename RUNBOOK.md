# Runbook — claude-token-tracker

Doc operacional pra debugar/operar o tracker. Atualizar quando descobrir novo failure mode.

## Server não sobe

1. Checar porta: `netstat -ano | findstr ":3002.*LISTENING"`. Se vazio, server não tá rodando.
2. Tail log: `tail -30 tracker-server.log`. Procurar exception/erro.
3. Tail autostart: `tail -30 tracker-autostart.log`. Vê em que fase travou (docker, pg, healthcheck).
4. Manual start: `wscript.exe start-server-detached.vbs`. Bypass do bat.
5. Manual node: `node server/dist/index.js`. Vê erro direto no terminal.

## Codex collector parou de coletar

1. `Get-ScheduledTaskInfo -TaskName "CodexTokenCollector"`. Olhar `LastTaskResult`:
   - `0` = sucesso último run
   - `267009` = ainda rodando (OK)
   - `2147946720` = already running (OK)
   - `2147942405 (0x80070005)` = access denied — re-registrar como S4U
   - `2147946720 + NextRunTime vazio` = trigger morto — re-registrar
2. Manual: `python codex-token-collector.py --dry-run --limit 3 --profile`. Vê se ainda lê JSONLs.
3. Force run task: `Start-ScheduledTask -TaskName "CodexTokenCollector"`.

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
