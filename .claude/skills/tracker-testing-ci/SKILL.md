---
name: tracker-testing-ci
description: Estratégia de testes + CI/CD do claude-token-tracker. Vitest pra unit/integration, fixtures canônicas pros invariantes (pricing, TZ, dedup, idempotency), smoke E2E webhook→worker→DB, GitHub Actions matriz, regression suite. Pre-merge gate. Ative ao escrever teste, criar fixture, configurar CI, adicionar teste pra novo bug, debugar flaky test. Triggers PT: teste, vitest, fixture, smoke, regressão, CI, GitHub Actions, cobertura. EN: testing strategy, Vitest setup, integration test, fixture, CI matrix, E2E webhook, regression.
---

# Testing + CI

Skill que evita o cenário "arruma uma parte, quebra outra" que Patrick reportou. Hoje (2026-05-26) repo tem zero testes. R18 obriga fixtures pra invariantes. CI obrigatório pre-merge.

## ⚠️ Doc oficial (verificar antes de mudar setup)

- Vitest: https://vitest.dev/
- GitHub Actions: https://docs.github.com/en/actions
- Última verificação: 2026-05-26

## Pirâmide de testes

```
       /\
      /E2E\        <- 5%  - smoke webhook→worker→DB
     /------\
    /Integr. \     <- 25% - rota Express + Postgres real (testcontainers)
   /----------\
  /   Unit    \    <- 70% - funções puras packages/domain
 /--------------\
```

Foco: unit em `packages/domain` (pricing, normalize, dedup, time). Integration em rotas críticas (webhook ingestion, entries listing, dashboard agg). Smoke E2E só pra fluxo principal.

## Setup planejado V2

- **Vitest 1.x** em todos packages (`apps/api`, `apps/worker`, `apps/web`, `packages/domain`).
- **Testcontainers**: `@testcontainers/postgresql` pra integration test contra Postgres real. Sem mock SQL.
- **MSW** (Mock Service Worker): `apps/web` testa hooks React Query sem hit real.
- **Supertest**: integration test rotas Express.
- **fast-check**: property-based testing pra pricing/normalize edge cases.

Config base em `vitest.config.ts` cada package, extends `vitest.config.base.ts` no root.

## Fixtures canônicas (R18)

`apps/api/test/fixtures/`:

### `pricing.fixtures.ts`

```typescript
export const PRICING_CASES = [
  {
    name: "claude-opus-4-7 standard",
    rawModel: "claude-opus-4-7-20251001",
    normalized: { key: "opus-4-7", family: "claude" },
    tokens: { input: 1_000_000, output: 500_000, cache_read: 100_000, cache_write: 0 },
    expectedCostUsd: 15.00 + 37.50 + 1.50, // 15 input + 75 output × 0.5 + 1.50 cache_read
  },
  {
    name: "gpt-5.5 standard",
    rawModel: "gpt-5.5",
    normalized: { key: "gpt-5.5", family: "openai" },
    tokens: { input: 1_000_000, output: 500_000, cache_read: 200_000, cache_write: 0 },
    expectedCostUsd: 1.25 + 5.00 + 0.0625, // verificar com pricing oficial
  },
  {
    name: "unknown model fail-closed",
    rawModel: "test-bogus",
    normalized: null,
    tokens: { input: 1000, output: 500, cache_read: 0, cache_write: 0 },
    expectedCostUsd: 0,
    expectedStatus: "unknown",
  },
];
```

Teste:

```typescript
describe("pricing fixtures", () => {
  it.each(PRICING_CASES)("$name", ({ rawModel, normalized, tokens, expectedCostUsd, expectedStatus }) => {
    const result = normalizeModel(rawModel);
    expect(result).toEqual(normalized);
    if (result) {
      const pricing = PRICING[result.key];
      const cost = calcCost(pricing, tokens);
      expect(cost).toBeCloseTo(expectedCostUsd, 4);
    } else {
      expect(expectedStatus).toBe("unknown");
    }
  });
});
```

### `timezone.fixtures.ts`

```typescript
export const TZ_CASES = [
  {
    name: "21h BRT do dia 25 não conta como dia 26",
    inputUtc: "2026-05-26T00:30:00Z", // 21:30 BRT do 25/05
    todayStartBRT: "2026-05-26T03:00:00Z", // 00:00 BRT do 26 = 03:00 UTC
    expectedInToday: false,
  },
  {
    name: "01h BRT do dia 26 conta como dia 26",
    inputUtc: "2026-05-26T04:00:00Z", // 01:00 BRT do 26
    todayStartBRT: "2026-05-26T03:00:00Z",
    expectedInToday: true,
  },
  // DST boundaries
  {
    name: "boundary entrada DST (transição)",
    inputUtc: "2026-10-19T02:30:00Z", // ~última madrugada DST Brasil (se houvesse — DST extinto 2019, manter case histórico)
    expectedInToday: true, // hoje sempre é hoje BRT, sem ambiguidade pós-2019
  },
];
```

### `dedup.fixtures.ts`

```typescript
export const DEDUP_CASES = [
  {
    name: "mesma tuple = 1 row",
    events: [
      { source: "codex", session_id: "abc", model: "gpt-5.5", input: 100, output: 50, ts: "2026-05-26T10:00:00Z" },
      { source: "codex", session_id: "abc", model: "gpt-5.5", input: 100, output: 50, ts: "2026-05-26T10:00:00Z" },
    ],
    expectedRows: 1,
  },
  {
    name: "session_id NULL com mesma tuple = 1 row (NULLS NOT DISTINCT)",
    events: [
      { source: "codex", session_id: null, model: "gpt-5.5", input: 100, output: 50, ts: "2026-05-26T10:00:00Z" },
      { source: "codex", session_id: null, model: "gpt-5.5", input: 100, output: 50, ts: "2026-05-26T10:00:00Z" },
    ],
    expectedRows: 1,
  },
  {
    name: "timestamp diferente = 2 rows",
    events: [
      { source: "codex", session_id: "abc", model: "gpt-5.5", input: 100, output: 50, ts: "2026-05-26T10:00:00Z" },
      { source: "codex", session_id: "abc", model: "gpt-5.5", input: 100, output: 50, ts: "2026-05-26T10:01:00Z" },
    ],
    expectedRows: 2,
  },
];
```

### `idempotency.fixtures.ts`

```typescript
export const IDEMPOTENCY_CASES = [
  {
    name: "mesma key = 1 enfileiramento",
    requests: [
      { idempotency_key: "key-1", payload: { ... } },
      { idempotency_key: "key-1", payload: { ... } },
    ],
    expectedIngestionEvents: 1,
    expectedResponseDuplicate: [false, true],
  },
  {
    name: "key diferente = 2 enfileiramentos",
    requests: [
      { idempotency_key: "key-1", payload: { ... } },
      { idempotency_key: "key-2", payload: { ... } },
    ],
    expectedIngestionEvents: 2,
  },
];
```

## Smoke E2E (5 cenários core)

`apps/api/test/e2e/`:

1. **Webhook → Queue → Worker → DB** (happy path token_entry).
2. **Replay idempotency** (mesma key = 1 row).
3. **Modelo unknown** (fail-closed, pricing_status='unknown').
4. **Worker retry exponencial** (force fail, watch attempts crescer).
5. **DLQ** (max attempts → move pra ingestion_dead_letters).

Cada um: spin up Postgres container + boot api/worker + assert.

## GitHub Actions CI

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: tracker_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm migrate # migrations no postgres container
        env: { DATABASE_URL: postgresql://postgres:test@localhost:5432/tracker_test }
      - run: pnpm test:integration
        env: { DATABASE_URL: postgresql://postgres:test@localhost:5432/tracker_test }

  build:
    needs: [lint, typecheck, test-unit, test-integration]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

## Regression matrix (R18 + pre-merge)

`apps/api/test/regression/`: 1 file por invariante. Cada audit FINAL P1 vira teste de regressão:

- `F1-cache-hit-trend-column.test.ts`: query analyticsService não pode usar `cache_read_tokens` (compile fail OR runtime test).
- `F3-billing-unknown.test.ts`: modelo lixo NÃO cobra.
- `F5-dedup-null-session.test.ts`: 2 events NULL session = 1 row.
- `F6-transaction-insert.test.ts`: failure middle of insert = nada persistido.
- `F7-today-cost-brt.test.ts`: 21h BRT do dia anterior NÃO conta hoje.
- ...

Cada P1 do audit FINAL = 1 teste antes do fix landar.

## Scripts package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:e2e": "vitest run --project e2e",
    "test:coverage": "vitest run --coverage"
  }
}
```

Coverage gate (V2.1): `--coverage.thresholds.statements 70`. Day 1 sem gate (não tem cobertura ainda).

## Bugs conhecidos / armadilhas

- **Testcontainers no Windows**: precisa Docker Desktop running. CI Ubuntu service postgres é mais rápido.
- **Vitest worker contamination**: `pool: 'forks'` em integration test pra isolar.
- **fast-check timeouts**: property test pode pegar input gigante. `fc.assert` com `numRuns: 100, timeout: 10_000`.
- **Snapshot tests**: evita. Quebra com refactor cosmético. Use explicit asserts.
- **Time travel**: fixtures TZ usam `vi.setSystemTime(new Date("2026-05-26T03:00:00Z"))` pra determinismo.

## Quando ativar outras skills

- Teste de webhook → `tracker-ingestion-contract` (fixture payload).
- Teste de pricing → `tracker-business-rules` (PRICING_CASES).
- Setup observability test → `tracker-observability` (mock logger).
- Adicionar event_type novo → fixture worker + integration test.

## ⚠️ Sempre

- Antes de fix P1, escrever teste de regressão que falha (TDD).
- Antes de mudar pricing/TZ/dedup/idempotency, atualizar fixture (R18).
- CI verde obrigatório pre-merge. PR não merge sem.
- `tracker-qa` agent valida fixture cobre o caso reportado.

## Knowledge persistente

- **Vitest > Jest**: ESM nativo, faster, monorepo-friendly.
- **Testcontainers > mock SQL**: testes integration valem o overhead (boot ~3s).
- **MSW > nock**: API mocking declarativo, funciona browser + node.
- **Sem coverage gate day 1**: meta 70% após Wave 4 (post-strangler core).
- **CI ~3-5min total** (lint + typecheck + unit + integration + build paralelizado).

## References / recipes / templates

- (planejado V2) `references/vitest-config-base.ts` — base config.
- (planejado V2) `recipes/testcontainer-postgres.ts` — setup pg test container.
- (planejado V2) `recipes/fixture-template.ts` — pattern fixture canônica.
- (planejado V2) `recipes/regression-test-template.ts` — pattern P1 regression.
- (planejado V2) `references/github-actions-ci.yml` — workflow completo.
