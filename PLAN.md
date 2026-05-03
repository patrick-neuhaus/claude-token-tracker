# PLAN — Audit + Componentização do claude-token-tracker

> **Tipo:** Plan A (Discovery orchestration). Gera reports + Plan B (SDD spec) ao final.
> **Criado:** 2026-05-03
> **Estado:** waiting execução
> **Output dir:** `docs/audits/` (gitignored)

---

## Contexto

Tracker passou por 7 waves (visual revamp + skills viewer + multi-source + system prompts). Estado atual: master `7b1e84f`, ~12 pages, 245 ocorrências de Card→Surface migration parcial, font Geist + tokens 222° aplicados, sidebar consolidada 6 nav, skills + system prompts viewers ativos.

**Próximo salto:** auditoria sistêmica multi-skill antes de mais código. Patrick quer:
1. Cada skill roda **isolada** primeiro (relatório independente)
2. Reports consolidam em **Plan B (SDD spec)**
3. Plan B vira implementação dirigida

Princípio: descoberta densa antes de patch. Evita retrabalho que já comemos na Wave 3 (Card→Surface migration sem proof).

---

## Skills no chain (8 skills + 1 SDD final)

| # | Skill | Modo | Output | Dependência |
|---|---|---|---|---|
| 1 | `design-system-audit` | `--audit` (default DS = anti-ai-design-system) | `01-ds-audit.md` | — |
| 2 | `ux-audit` | Completo | `02-ux-audit.md` | — |
| 3 | `react-patterns` | audit | `03-react-patterns.md` | — |
| 4 | `motion-design` | `--audit` + `--catalog` | `04-motion-design.md` | — |
| 5 | `architecture-guard` | full | `05-arch-guard.md` | — |
| 6 | `code-dedup-scanner` | full | `06-dedup-scan.md` | — |
| 7 | `component-architect` | `--audit` | `07-component-arch.md` | consome 1, 6 |
| 8 | `ui-design-system` | gap-fill | `08-ds-tokens.md` | consome 1, 4 |
| 9 | `trident` | `--mode all-local` | `09-trident-review.md` | consome 1-8 |
| 10 | `sdd` | research → spec | `PLAN-B-SPEC.md` na raiz | consome 1-9 |

---

## Execução em Waves

### Wave 1 — Audits paralelos (read-only, ~30min)

Skills independentes que NÃO escrevem código. Roda em paralelo via OMC `team` ou launch direto via Agent tool em uma única mensagem.

**Skills (rodam todas em paralelo):**
- `design-system-audit --audit` — Patrick canonical anti-ai-design-system
- `ux-audit` modo Completo — 12 pages + fluxos críticos (login, dashboard, settings, sessions detail, skills viewer)
- `react-patterns` audit — useEffect, re-renders, server/client boundaries
- `motion-design --audit` + `--catalog` (operational SaaS) — micro-interactions atuais + pilares aplicáveis
- `architecture-guard` — thin client, layer separation, server/client boundaries
- `code-dedup-scanner` — encontra reusáveis antes de qualquer extração

**Cada skill:**
- Roda Phase 1 contexto: tracker é operational SaaS, single-user (Patrick), dark-only, desktop primário
- Output salva em `docs/audits/0X-<nome>.md`
- NÃO modifica código
- NÃO comemora "tudo bom" — força findings reais

**OMC orchestration sugerido:**
```
omc team --skills "design-system-audit,ux-audit,react-patterns,motion-design,architecture-guard,code-dedup-scanner" \
         --output-dir docs/audits/ \
         --context "tracker operational SaaS, single-user, dark-only, ~12 pages"
```

Se OMC team não cobrir, fallback: launch 6 Agent tools em uma mensagem (cada com 1 skill).

**Gate Wave 1:** todos 6 reports gerados + Patrick lê quick scan dos sumários antes de Wave 2.

---

### Wave 2 — Audits sintéticos (consomem Wave 1, ~20min)

Skills que precisam ler reports anteriores antes de propor.

**Skills (sequencial pq depende de Wave 1):**
- `component-architect --audit` — lê `06-dedup-scan.md` + `01-ds-audit.md`, mapeia componentes existentes vs propostos, identifica componentes pra extrair (sem criar)
- `ui-design-system` — gap-fill: lê `01-ds-audit.md` + `04-motion-design.md`, identifica tokens faltando (motion easing, durations, novas escalas)

**Cada skill:**
- Lê reports da Wave 1 explicitamente
- Output em `docs/audits/0X-<nome>.md`

**Gate Wave 2:** ambos reports gerados.

---

### Wave 3 — Final code review (~15min)

`trident --mode all-local` — pipeline 3-agent (Scanner → Verifier → Arbiter). Pega TUDO que skills anteriores podem ter perdido.

Output: `docs/audits/09-trident-review.md` com findings P0-P3.

**Gate Wave 3:** report gerado.

---

### Wave 4 — Síntese SDD (~30min)

`sdd` Phase 1 (Research) + Phase 2 (Spec).

**Input:** todos 9 reports em `docs/audits/`.

**Processo:**
1. SDD Research: lê todos reports + maps overlaps/conflitos entre findings
2. SDD Spec: gera `PLAN-B-SPEC.md` na raiz do repo com:
   - Findings consolidados por severidade (P0/P1/P2/P3)
   - Componentes a extrair (com nome + interface + onde usar)
   - Tokens a adicionar
   - Refactors arquiteturais (se houver)
   - Order de execução (waves de implementação)
   - Critérios de aceite por item
3. NÃO implementa — só spec

**Gate Wave 4:** PLAN-B-SPEC.md gerado, Patrick lê e aprova → vira Plan B de implementação.

---

## Output structure

```
claude-token-tracker/
├── PLAN.md                          # este arquivo
├── PLAN-B-SPEC.md                   # gerado Wave 4 (SDD spec)
└── docs/                            # NOT gitignored (root)
    └── audits/                      # GITIGNORED — outputs effêmeros
        ├── 01-ds-audit.md
        ├── 02-ux-audit.md
        ├── 03-react-patterns.md
        ├── 04-motion-design.md
        ├── 05-arch-guard.md
        ├── 06-dedup-scan.md
        ├── 07-component-arch.md
        ├── 08-ds-tokens.md
        └── 09-trident-review.md
```

---

## Risks

1. **Skills se atrapalharem em paralelo (Wave 1)** — todas read-only, baixo risco. Se algum lock contention em filesystem, fallback sequencial.
2. **Reports redundantes** — design-system-audit e ui-design-system podem sobrepor. Mitigação: ui-design-system roda Wave 2 explicitamente como gap-fill (não duplica).
3. **Findings conflitantes** — ex: ux-audit propõe X, react-patterns propõe contra-X. SDD Research Phase 4 resolve via prioridade Patrick.
4. **Context window** — 9 reports pode ser denso. Mitigação: SDD Wave 4 lê com `head_limit` em cada report e pede sumário antes de full read.
5. **Patrick over-tunar Wave 1 reports** — IL-10 lock-in protege skills validadas. Reports são output, não modificam skills.

---

## Out of scope (parking lot, decidir depois do Plan B)

- **Implementação direta** — Plan A NÃO implementa. Plan B (SDD spec) define implementação.
- **Mexer em skills do skillforge** — IL-10 manda confronto vocal pra editar skill validated.
- **Adicionar novas pages** — escopo é audit + componentizar existente.
- **Backend audit** — focus frontend (cliente). Backend já passou por trident em wave anterior.
- **Performance profiling com browser dev tools** — react-patterns cobre patterns, mas profiling real fica pra Plan C (pós Plan B implement).

---

## Como rodar (quando pronto)

Patrick fala "vai" → eu:
1. Executo Wave 1 (paralelo via Agent tool)
2. Mostro sumário de cada report gerado
3. Aguardo Patrick aprovar antes de Wave 2
4. Repete pra Wave 2 → 3 → 4
5. Final: PLAN-B-SPEC.md aprovado vira próxima sessão de implementação

Estimativa total: **~1.5h** + leitura de Patrick entre waves.
