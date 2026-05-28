---
name: tracker-product-decisions
description: Catálogo de ADRs (Architecture Decision Records) do claude-token-tracker. Pattern para registrar decisões arquiteturais (postgres queue caseira vs pgmq, strangler vs rebuild, single-user multi-user compat, pricing freeze, framework choice). Cada decisão pegou trade-offs + alternativas + contexto + status. Patrick é stakeholder único — ADRs servem pra futuro Patrick relembrar motivo. Ative ao tomar decisão arquitetural fixada, registrar pivô, atualizar ADR existente. Triggers PT: ADR, decisão arquitetural, registrar decisão, trade-off, pivô, escolha de stack. EN: ADR, architecture decision record, design decision, trade-off documentation, technology choice.
---

# Product / Architecture Decisions (ADRs)

Patrick é o stakeholder único. ADRs são pra Patrick futuro relembrar por que escolheu X. Sem stakeholder externo = formato enxuto.

## ⚠️ Doc oficial / pattern

- Michael Nygard ADR template: https://github.com/joelparkerhenderson/architecture-decision-record
- MADR (Markdown ADR): https://adr.github.io/madr/
- Última verificação: 2026-05-26

Tracker usa MADR simplificado.

## Local

`docs/architecture/decisions/NNNN-titulo-kebab.md`

Numeração sequencial. Zero-padded 4 dígitos. Título kebab-case curto.

Exemplos:
- `0001-postgres-queue-caseira.md`
- `0002-strangler-fig-pattern.md`
- `0003-multi-user-compat-day-1.md`
- `0004-pricing-freeze-via-snapshot.md`

## Template ADR

```markdown
# ADR-NNNN — <título>

- **Data**: YYYY-MM-DD
- **Status**: proposto | aceito | substituído por ADR-XXXX | deprecado
- **Decisor**: Patrick (+ consulta codex-xhigh quando aplicável)

## Contexto

<1-3 parágrafos. Que problema apareceu? Qual restrição/realidade?>

## Decisão

<1 frase clara: "Vamos usar X". Sem hedge.>

## Alternativas consideradas

- **Alt A** (descartada): <motivo curto>.
- **Alt B** (descartada): <motivo curto>.

## Trade-offs

**Ganhamos:**
- <ponto 1>
- <ponto 2>

**Perdemos:**
- <ponto 1>
- <ponto 2>

## Quando reabrir

<condições que invalidam a decisão. Ex: "Quando volume > 100k events/dia revisitar pgmq.">

## Referências

- Audit/skill/issue que motivou.
- Doc oficial relacionada.
```

## ADRs já fixadas (a documentar formalmente em Wave 0)

Decisões tomadas hoje (2026-05-26) que viram ADRs no Wave 0 do strangler:

1. **0001-postgres-queue-caseira.md**: queue via `ingestion_events` + `FOR UPDATE SKIP LOCKED`. Não pgmq (Postgres puro), não Redis (overhead), não Kafka (overkill). Reabre se > 100k/dia.

2. **0002-strangler-fig-pattern.md**: estrutura nova `apps/`+`packages/` ao lado de `server/`+`client/` legacy. Migração incremental por wave. Não big-bang rebuild (60k entries vivos, single-user usa todo dia). Reabre se cutover travar wave 4+.

3. **0003-multi-user-compat-day-1.md**: schema/auth/queries multi-user desde início (user_id em tudo, RLS roadmap). Mas RLS/orgs/roles/quotas SÓ quando 2º user real. Single-user roadmap multi.

4. **0004-pricing-freeze-via-snapshot.md**: pricing em `pricing_snapshots` imutáveis. Toda mudança = INSERT row nova com `effective_from`. Server consulta snapshot ativo na data do entry. Nunca UPDATE pricing row.

5. **0005-express-not-hono.md**: continua Express 5 (legacy migra direto). Não migra Hono (custo de re-escrever rotas sem ganho proporcional). Reabre se performance virar problema.

6. **0006-monorepo-pnpm-turbo.md**: pnpm workspaces + turbo (igual supply-mep-v2). Não Nx (overhead config), não bun (não maduro Windows).

7. **0007-vitest-not-jest.md**: Vitest pra todos packages. ESM nativo, fast, monorepo-friendly. Não Jest (slow ESM, deprecated).

8. **0008-testcontainers-postgres.md**: integration test usa container real (não mock SQL). Boot ~3s aceitável. Mock SQL drift garantido.

9. **0009-pino-not-winston.md**: pino structured logging. Faster, JSON nativo, redact built-in. Não winston (slower).

10. **0010-observability-faseada.md**: pino + métricas básicas day-1. OTel + Grafana LGTM SÓ day-2 (multi-user OR problema real). Codex xhigh sugeriu evitar copiar supply-mep-v2 LGTM cedo demais.

## Quando criar ADR novo

R7 R11: decisão arquitetural fixada exige ADR. Em geral:

- Trocar tecnologia core (DB, runtime, framework, queue).
- Mudar pattern de auth/security.
- Mudar pricing model (R11 obriga ADR).
- Decidir entre 2+ approaches não-óbvios.
- Reverter decisão anterior.

NÃO precisa ADR pra:

- Bug fix.
- Refactor in-file.
- Mudança de UI/UX cosmética.
- Decisão reversível em 1h.

## Quando atualizar ADR existente

Não edita em retrospecto. Cria ADR novo "Substitui ADR-NNNN" + marca o antigo como `Status: substituído por ADR-XXXX`.

Audit trail preservado.

## Bugs conhecidos / armadilhas

- **ADR demais**: vira gaveta. Limite ~20-30 ADRs no projeto inteiro. Decisões corriqueiras viram skill knowledge.
- **ADR sem trade-off**: incompleto. Toda decisão tem perda.
- **ADR retroativo**: documenta decisão histórica > não documentar. Mas marca data real + nota "documentado retroativamente".
- **ADR sem condição de reabertura**: incompleto. Toda decisão é renegociável.

## Quando ativar outras skills

- Pricing decision → `tracker-business-rules` (cálculo).
- Stack decision → `stack-express-pg-queue` / `stack-vite-react`.
- Schema decision → `tracker-domain` (canônico).

## ⚠️ Sempre

- Antes de "decisão arquitetural", verificar se cabe ADR (não bug fix).
- Antes de mudar ADR existente, criar novo + linkar.
- Antes de skill nova, ver se decisão já tem ADR (evita duplicate).

## Knowledge persistente

- **MADR simplificado > IETF formal**: enxuto, Patrick consome.
- **PT-BR no body, EN no título** (kebab-case): consistency com naming convention domain.
- **ADRs versionados em git**: history matters. PR-able pra revisão (codex xhigh "second opinion" antes de aceitar grandes ADRs).

## References / recipes / templates

- `template.md` (planejado V2) — template MADR pronto pra copy.
- `docs/architecture/decisions/0001-postgres-queue-caseira.md` (planejado Wave 0).
- `docs/architecture/decisions/0002-strangler-fig-pattern.md` (planejado Wave 0).
