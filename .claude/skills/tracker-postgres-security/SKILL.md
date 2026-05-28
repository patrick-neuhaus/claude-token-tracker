---
name: tracker-postgres-security
description: Disciplina de segurança Postgres no claude-token-tracker. Cobre query isolation por user_id (R10 multi-user compat), webhook token plaintext rotation, JWT signing, SQL injection prevention (sempre params $1), connection pool tuning, prepared statement cache, RLS roadmap (não day-1). Postgres puro (não Supabase), sem auth.uid() built-in. App impõe isolation via query layer + tipos. Ative ao criar query nova, adicionar tabela, debugar leak entre users, configurar pool, planejar RLS futuro. Triggers PT: segurança postgres, isolamento user, RLS, SQL injection, pool tuning, prepared statement. EN: postgres security, row level security, query isolation, SQL injection prevention, connection pooling, prepared statement.
---

# Postgres security — disciplina

Codex xhigh confrontou: Postgres puro + `pg` driver não ganha RLS "de graça" como Supabase. RLS exige `SET LOCAL app.user_id` por transação + policies + disciplina. Sem isso vira false sense of security.

Decisão (ADR-0011 planejado): **isolation via app layer day-1**, RLS roadmap quando 2º user real chegar.

## ⚠️ Doc oficial

- Postgres RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- node-postgres: https://node-postgres.com/
- SQL injection prevention: https://owasp.org/www-community/attacks/SQL_Injection
- Última verificação: 2026-05-26

## Day-1 — App-layer isolation

### Regra dura: toda query filtra `user_id`

```typescript
// Errado — vaza entre users
const rows = await pool.query("SELECT * FROM token_entries WHERE id = $1", [id]);

// Certo — filtra user
const rows = await pool.query(
  "SELECT * FROM token_entries WHERE id = $1 AND user_id = $2",
  [id, req.user.id]
);
```

Codereview gate: query SELECT/UPDATE/DELETE em tabela com `user_id` SEM `WHERE user_id = ...` = bug bloqueante (tracker-qa bloqueia PR).

### Helper canônico (apps/api/src/db/query.ts)

```typescript
export async function userQuery<T>(
  userId: UUID,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  // SQL deve ter $1 reservado pra user_id
  // Convenção: $1 = user_id, $2+ = params normais
  if (!sql.includes("$1")) throw new Error("userQuery requires $1 for user_id");
  const result = await pool.query<T>(sql, [userId, ...params]);
  return result.rows;
}

// Uso
const entries = await userQuery<TokenEntry>(
  req.user.id,
  `SELECT * FROM token_entries WHERE user_id = $1 AND source = $2 ORDER BY timestamp DESC LIMIT 50`,
  [filters.source]
);
```

Helper força convenção. Static analysis (eslint rule custom) verifica chamadas a `pool.query` em rotas autenticadas.

### Service role (worker / admin)

Worker processa events de qualquer user. Não pode passar req.user.id (não tem request). Mas usa `event.user_id` da fila pra todas queries:

```typescript
// apps/worker/src/processors/token-entry.ts
async function processTokenEntry(event: IngestionEvent) {
  const userId = event.user_id;
  // Worker faz queries com userId vindo do event, não global
  await pool.query(
    `INSERT INTO token_entries (user_id, ...) VALUES ($1, ...)`,
    [userId, ...]
  );
}
```

Worker NUNCA executa query sem `user_id` definido pelo contexto do event.

## SQL injection prevention

### Regra dura: nunca interpolação string

```typescript
// Errado — vetor injection
const rows = await pool.query(`SELECT * FROM foo WHERE bar = '${userInput}'`);

// Certo — placeholder $1
const rows = await pool.query(`SELECT * FROM foo WHERE bar = $1`, [userInput]);
```

### `ORDER BY` / `LIMIT` dinâmico

Postgres não aceita placeholder em `ORDER BY <col>` ou `LIMIT $N` em alguns contextos. Soluções:

```typescript
// ORDER BY: whitelist
const SORT_COLS = ["timestamp", "cost_usd", "model"] as const;
const SORT_DIRS = ["ASC", "DESC"] as const;

function normalizeSortCol(input: string): typeof SORT_COLS[number] {
  return SORT_COLS.includes(input as any) ? input as any : "timestamp";
}

const sql = `SELECT * FROM token_entries WHERE user_id = $1 ORDER BY ${normalizeSortCol(req.query.sort)} ${normalizeSortDir(req.query.dir)} LIMIT $2`;
```

Whitelist + normalizer dentro do service (não trust caller). Corrige A2-2 audit FINAL.

`LIMIT $N` funciona via placeholder em todos contextos modernos. Use sempre.

## Connection pool

```typescript
// apps/api/src/config/database.ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX ?? 10, // single-user 10, multi-user tune
  min: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "tracker-api",
  statement_timeout: 30_000, // 30s max query
  query_timeout: 30_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "pg pool error");
});
```

Métricas em `pool.totalCount`, `pool.idleCount`, `pool.waitingCount`. Expose em admin metrics (`tracker-observability`).

### Prepared statement cache

`pg` driver cacheia statements automaticamente. Para garantir, use `name`:

```typescript
await pool.query({
  name: "list-entries-by-user",
  text: "SELECT * FROM token_entries WHERE user_id = $1 LIMIT $2",
  values: [userId, limit],
});
```

Reuso = +30-50% throughput em hot path (webhook ingest).

## Webhook token rotation

`users.webhook_token_hash` armazena sha256. Plaintext **mostrado 1x** na criação, depois apagado.

```typescript
// apps/api/src/services/auth.ts
export async function rotateWebhookToken(userId: UUID) {
  const plaintext = randomBytes(32).toString("hex"); // 64 hex chars
  const hash = sha256(plaintext);
  await pool.query(
    `UPDATE users SET webhook_token_hash = $1, webhook_rotated_at = now() WHERE id = $2`,
    [hash, userId]
  );
  return plaintext; // mostra 1x, nunca persiste
}
```

V2.1: `webhook_tokens` table multi-token com scope:

```sql
CREATE TABLE webhook_tokens (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           text NOT NULL, -- "codex-collector", "claude-hook"
  hash            text NOT NULL UNIQUE,
  scope           text[] NOT NULL, -- ["ingest:tokens", "ingest:skills"]
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  last_used_at    timestamptz
);
```

Múltiplos tokens por user. Scope limita o que o token pode chamar.

## JWT auth

Cookie httpOnly signed via `cookie-parser`. JWT_SECRET é env. Algoritmo HS256 (single-user OK; multi-tenant pode migrar pra RS256).

```typescript
// apps/api/src/middleware/auth.ts
export async function authMiddleware(req, res, next) {
  const token = req.signedCookies.auth_token;
  if (!token) return res.status(401).json({ error: "no_token" });
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}
```

Cookie flags:
- `httpOnly: true` (sempre)
- `secure: true` (prod)
- `sameSite: "lax"` (CSRF mitigation)
- `signed: true` (prevenção tampering)

CSRF guard separado pra state-changing requests (não webhook — `X-Webhook-Token` separa).

## Day-2 — RLS roadmap

Quando ativar:

1. 2º user real no sistema (não Patrick).
2. OR cliente externo pede multi-tenant.
3. OR descoberta de gap (app-layer leak).

Steps:

1. Criar role `app_user` (não superuser).
2. `GRANT SELECT, INSERT, UPDATE, DELETE ON <tables> TO app_user`.
3. `ALTER TABLE token_entries ENABLE ROW LEVEL SECURITY`.
4. Policies:

```sql
CREATE POLICY entries_isolation ON token_entries
  FOR ALL
  TO app_user
  USING (user_id = current_setting('app.user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.user_id')::uuid);
```

5. Middleware seta `SET LOCAL app.user_id` em cada transação:

```typescript
export async function withUserContext(userId: UUID, fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

6. App-layer filter `WHERE user_id = $1` continua (defense in depth).
7. Worker continua service role (bypassa RLS) com isolation manual via `event.user_id`.

ADR-0012 planejado documenta passo a passo.

## Bugs conhecidos / armadilhas

- **F11 audit FINAL — admin role stale via JWT**: requireRole confia em JWT decode. Fix: revalidar role no DB em requireRole (1 query extra per admin request, vale).
- **`current_setting` retorna texto vazio em conexão nova**: pool reusa connections. Sem `SET LOCAL`, RLS quebra. SEMPRE `withUserContext`.
- **Bypass RLS via service role**: worker precisa privilegio. Mas mistura é perigosa: app_user (front) + service_role (worker) em pools separados. Don't mix.
- **Connection pool exhaustion**: max=10 limita concurrency. Webhook spike + dashboard query = wait queue. Tune `max` por carga.
- **Statement timeout**: 30s default mata long queries. CSV export pode precisar `SET statement_timeout = 60000` na sessão.
- **PII em backup**: pg_dump expõe webhook_token_hash + email. Backup encryption obrigatório prod.

## Quando ativar outras skills

- Migration nova com user_id → `tracker-domain` (FK convention) + `stack-express-pg-queue` (R6 aditiva).
- Query que vaza isolation → revisar com `tracker-qa` (test case).
- Auth flow change → ADR (R11 análogo) via `tracker-product-decisions`.

## ⚠️ Sempre

- Antes de query nova, conferir filter `user_id`.
- Antes de mudar pool config, validar impact via metric.
- Antes de adicionar tabela com dado de cliente, definir FK `user_id` ON DELETE CASCADE.
- Antes de RLS day-1, **NÃO**. Roadmap day-2.

## Knowledge persistente

- **App-layer isolation > RLS day-1**: simplicidade + flexibility. RLS adiciona complexidade que single-user não justifica.
- **Webhook token plaintext só 1x**: hash store, no persistent plaintext.
- **`SET LOCAL` é transaction-scoped**: precisa BEGIN/COMMIT wrapper, não pool query direta.
- **Pool size = workers × 2**: single-user concurrency baixa, max 10 OK. Multi-user tune via metric.
- **Prepared statements via `name`**: opt-in mas grande ganho hot path.

## References / recipes / templates

- (planejado V2) `references/pool-config.ts` — base.
- (planejado V2) `recipes/userQuery-helper.ts` — convention enforcer.
- (planejado V2) `recipes/withUserContext-rls.ts` — RLS day-2.
- (planejado V2 day-2) `references/rls-policies.sql` — policies completas.
- (planejado V2.1) `references/webhook-tokens-multi-scope.sql` — schema multi-token.
