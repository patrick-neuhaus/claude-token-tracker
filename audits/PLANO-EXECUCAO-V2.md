# Plano de Execução V2 — pós Wave 7.x

> **Branch:** `redesign/motion-ds-audit`
> **Criado:** 2026-05-06
> **Substitui:** consulta direta ao `00-master-plan.md` daqui pra frente
> **Status master:** Waves 0-6 + 7.x renumerada DONE. Restante deste master + features novas migram pra cá.

## Iron Law deste roadmap

1. **NÃO subir pra VPS pública** até Wave 8 (polish) fechar.
2. Patrick valida cada wave **em local** antes de prosseguir.
3. Trabalho 1h+ = plano sucinto + OK Patrick ANTES (memória `feedback_ask_before_big_work.md`).
4. Composição 2+ skills/agents = maestro V2 (IL-5).

---

## Status enxuto

| Bucket | Itens | Status |
|---|---|---|
| Master 00-master-plan Waves 0-7.x | brand, strategy, ux, motion, tokens, DS, visual page-by-page, timezone, pie, drawer, login toggle, heatmap, input | ✅ DONE |
| Master pendentes original | trident final all-local, PLAN-B cross-check, StreakLostScreen | ❌ pendente (Wave 9-10 abaixo) |
| Decisão Patrick 2026-05-06 | Admin **NÃO sai** — tracker continua multi-user | mudança vs master original |
| Backlog F-NEW-X | F-NEW-8 ✅, F-NEW-9 ❌, F-NEW-1/2/3/4/5/6/7 ❌ | parcial |
| Novo (2026-05-06) | "design horrível" Patrick reportou — Wave 8 nasce daqui | P0 |

---

## P0 — Bloqueio atual (antes de QUALQUER outra coisa)

### Wave 8 — Polish visual

**Por quê P0:** Patrick reportou 2026-05-06 que design tá horrível. Visual Wave 6 não fechou. Sem isso, deploy VPS, naming, features novas — tudo orbita produto que Patrick não aprova. Sobe nada até fechar.

**Sub-waves:**

#### 8.0 — Validação 8 telas (Patrick faz) — ✅ DONE 2026-05-06

Patrick validou. Bugs reportados: B1 (ContributionGraph sem click), B2 (heatmaps com scroll), B3 (filtro 02→03 timezone), B4 (date-range picker unificado).

#### 8.1 — Fix bugs P0/P1 reportados — ✅ PARCIAL 2026-05-06

| Bug | Status | Fix |
|---|---|---|
| B1 ContributionGraph click | ✅ done | `client/src/components/analytics/ContributionGraph.tsx` — tile virou button + onClick toggle + painel detalhe inline (dia + cost) |
| B2 heatmaps com scroll | ✅ done | `client/src/pages/AnalyticsPage.tsx` — `lg:grid-cols-2` virou `space-y-4` (stack vertical full-width) |
| B3 filtro 02→03 timezone | ✅ done | `client/src/components/shared/DateRangeFilter.tsx` — `toDateInputValue` extrai date BR via `date-fns-tz` |
| B4 date-range picker unificado | ⏸ DEFERRED | Patrick decisão 2026-05-06: foco total no DS primeiro. B4 fica fora — anotado pra revisão pós Wave 8.2 |

#### 8.2 — Component Consolidation + DS Migration (CRM template)

**Source DS alvo:** `C:\Users\Patrick Neuhaus\Documents\Github\anti-ai-design-system\ui_kits\default\index.html` (CRM template default OR `?template=crm`). Linha 752 = AppSidebar. Linha ~625 = LoginScreen.

**Premissa:** componente do tracker precisa ficar igual ao do anti-ai-ds CRM. Componentes novos do tracker (sem equivalente no CRM) viram candidatos a virar padrão DS.

##### 8.2.1 — Audit duplicações tracker — ✅ DONE 2026-05-06

Output: `audits/COMPONENT-DEDUP.md` (75 componentes auditados 1 a 1, 55 canonical, 12 duplicações, 2 deprecated).

GATE: Patrick validou plano Lote A→E em 2026-05-06.

##### 8.2.2 — Unificação interna — 🚧 EM EXECUÇÃO

Mergear duplicatas em 5 lotes (A→E):
- **Lote A** (3-5h): Tabelas — ✅ DONE 2026-05-06. EntriesTable + WebhookInfo (2 tabelas) + CsvImport + UserManagement + ProjectComparison + ProjectsPage list + ProjectDetailPage + SessionDetailPage + SessionTimePage + SkillsPage + SystemPromptsPage migrados pra AppTable. Deleted: `ui/table.tsx` + `SortableTableHeader.tsx`. **NÃO deletado:** `ClickableRow.tsx` — uso legítimo em ProjectsPage grid view (link wrapper pra cards).
- **Lote B** (1-2h): Pies — generalize ModelPieChart, refactor CostByModelChart/CostBySourceChart.
- **Lote C** (1-2h): Inline edits + date filters — SessionNameEditor → InlineEditableText, SessionTimeFilters → DateRangeFilter+GapSlider.
- **Lote D** (30min): Error boundaries + tokens drift.
- **Lote E** (30min): Surface system padronization.

GATE: preview visual sem regressão após cada lote.

Tempo: 6-10h em 2-3 sessões.

##### 8.2.3 — Cross-check anti-ai-ds (regra 2-layer — Patrick 2026-05-06)

Anti-AI DS tem 2 fontes:
1. **Layer 1 — CRM template** `ui_kits/default/index.html` (best components, opinionado)
2. **Layer 2 — Library de componentes** `ui_kits/default/components/` (fallback, componentes não no CRM)

**Workflow:**
1. Read TODOS componentes do CRM → mapa best
2. Read library de componentes → mapa fallback
3. Pra cada componente unificado tracker, classificar em buckets:
   - ✅ **idêntico ao CRM** — mantém visual
   - ⚠️ **diferente do CRM** — adaptar visual tracker pro CRM
   - 🟡 **não no CRM, mas existe na library** — PARA + PERGUNTA: "Posso converter/aproveitar `<componente DS>` da library, ou é outro componente mesmo?"
   - 🆕 **não no CRM nem library** — componente novo, documentar pra promoção (Wave 8.2.5)

Output: `audits/CRM-MATCH-MAP.md` com bucket assignment + perguntas open pra Patrick.

GATE: Patrick valida buckets + responde perguntas dos 🟡 ambíguos.

Tempo: 2-3h (era 1-2h antes da regra 2-layer).

##### 8.2.4 — Re-skin pra match CRM

Pra cada ⚠️ do match map: adaptar Tailwind/tokens pra ficar visualmente igual CRM. Side-by-side comparison.

GATE: Patrick valida visual page-by-page.

Tempo: 3-5h.

##### 8.2.5 — Documentar componentes novos pro DS

Pra cada 🆕: criar entry em `~/Documents/Github/anti-ai-design-system/CANDIDATES-FOR-DS.md` (ou path equivalente) com:
- Anatomy (slots/structure)
- Props
- Variants
- Motion spec
- A11y contract
- Visual reference (screenshot)

Patrick decide promover pro DS canonical depois.

GATE: Patrick aprova specs.

Tempo: 1-2h.

#### 8.3 — Re-validação final Patrick

Após 8.2.5: Patrick reabre tracker, valida visual fim-a-fim. GATE bloqueante: aprovação explícita antes de qualquer wave P1+.

**Modelo:** Sonnet medium pra mechanical (audit + re-skin). Sonnet high + think hard pra decisões de consolidação 8.2.1-8.2.3.

**Budget total Wave 8.2:** ~8-14h em 3-4 sessões dedicadas.

**Iron Law Wave 8.2:** Patrick valida CADA sub-wave antes da próxima. Nada de big-bang. Cada sub-wave gera arquivo auditável.

---

## P1 — Pendentes master original

### Wave 9 — ❌ DESCARTADA (admin NÃO sai)

**Decisão Patrick 2026-05-06:** tracker continua multi-user com admin. Master original previa remoção pra single-tenant público mas premissa mudou. Admin fica.

**Implicação:**
- F-NEW-6 multi-tenant SaaS faz mais sentido (já tá multi-user)
- F-NEW-5 deploy VPS precisa pensar segurança auth flow (não é só self-host puro)

---

### Wave 10 — Trident final + PLAN-B cross-check

**Origem:** master `§Wave 7.4` + `§Wave 7.5` original.

**Objetivo:**
- `trident --mode all-local` review de toda branch antes de deploy
- Cross-check `PLAN-B-SPEC.md` (115 findings 2026-04-30): cada finding antigo → mantém / coberto / descarta

**Pre-requisito:** Wave 8 fechada.

**Output:** `audits/10-final-review.md` + `audits/10-plan-b-coverage.md`.

**Modelo:** Sonnet high.

**Budget:** ~25% sessão.

---

### Wave 11 — StreakLostScreen backend signal (decisão: implementar OR drop)

**Origem:** Wave 6.7b — gap backend.

**Decisão Patrick necessária ANTES:** vale ROI? Streak perdido = entry overlay "tu perdeu streak X dias atrás. Track 1 entry hoje pra recuperar". Se Patrick decidir drop → wave deletada.

**Se implementar:**
- Migration `streak_breaks (user_id, broken_at, prev_streak, recovered_at, recovery_used BOOLEAN)`
- Service streakService check signal `streak.lost_pending` (1-2 dias após break, recovery grace)
- UI overlay component

**Budget:** ~1-2h.

**Modelo:** Sonnet medium.

---

## P2 — Features novas priorizadas

Ordem por dependency + ROI. Cada wave pode virar sessão dedicada.

### Wave 12 — F-NEW-9: LiteLLM auto-sync pricing

**Origem:** Patrick 2026-05-06.

**Descrição:** cron diário 3am BR fetch `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` → tabela `model_pricing_cache`. Cascata `getEffectivePricing`: user override → cache LiteLLM → hardcoded.

**Pre-req:** Wave 8 + 10 fechadas (não vale antes do polish + review final).

**Budget:** ~2-3h.

**Modelo:** Sonnet medium + think hard (schema novo + cron + error handling rede).

**Risk:** LiteLLM community pode mudar schema. Fallback URL alternativa.

---

### Wave 13 — F-NEW-3: Light mode completo

**Origem:** Wave 4 dark-only MVP. Wave 7.5 só LoginPage.

**Descrição:** estender dark/light toggle pra toda app. Dashboard, Sessions, Analytics, Settings, etc. Usar `_te_SURFACE_THEMES.light` canonical.

**Pre-req:** Wave 8 polish fechada (light mode amplifica problemas visuais).

**Budget:** ~2-3h.

**Modelo:** Sonnet medium.

---

### Wave 14 — F-NEW-4: Naming overhaul

**Origem:** master backlog F-NEW-4.

**Descrição:** rename repo `claude-token-tracker` → `<novo>` (ex: `artemis-tokenizer`). Update brand strings, page title, README, LoginPage hero, package.json, workspaces refs.

**Decisão Patrick necessária ANTES:** nome final. Brainstorm separado (1 dia research).

**Pre-req:** Wave 13 fechada (visual final).

**Budget:** ~1h trabalho mecânico + research separado.

**Modelo:** Sonnet medium.

---

### Wave 15 — F-NEW-5: Deploy VPS local-only (não público ainda)

**Origem:** master backlog F-NEW-5.

**Descrição:** Provision VPS Hostinger 72.60.152.11 com Docker compose. Postgres + Express + Vite static. Migration data Patrick (~256 sessions). HTTPS Caddy. **NÃO público** ainda (sem domain ou domain restrito IP whitelist).

**Pre-req:** Wave 8-14 fechadas. **CRITICAL:** Wave 9 admin out obrigatório (subir VPS multi-user é vulnerabilidade).

**Budget:** ~3-4h.

**Modelo:** Sonnet medium.

**Validação:** Patrick acessa VPS, valida fluxo completo, decide se libera público.

---

### Wave 16 — F-NEW-1: Token Editor in-app

**Origem:** master backlog F-NEW-1.

**Descrição:** Component TokenEditor em /settings ou /appearance. User troca accent → deriva paleta + WCAG validation real-time + preview live. Reusa `TokenEditorPreview` canonical.

**Pre-req:** Wave 13 light mode (toggle premissa pro Editor).

**Budget:** ~3-4h.

**Modelo:** Sonnet high + think hard.

---

### Wave 17 — F-NEW-2: XP gating + F-NEW-7: Google OAuth

**Combinadas porque ambas são "second-order delight" pós-launch.**

#### F-NEW-2 XP gating
- XP earned via streaks + sessions + days active
- Lv 5+ unlock Token Editor Basic
- Lv 10+ unlock Advanced
- Lv 15+ unlock theme presets save/load
- UI: badge "Locked — Lv X to unlock"

#### F-NEW-7 Google OAuth
- passport-google-oauth20 server-side
- Endpoint `/auth/google/callback`
- Schema: `users.google_id` UNIQUE NULLABLE

**Pre-req:** Wave 16 (Token Editor existe pra gating fazer sentido).

**Budget:** ~2h cada.

**Modelo:** Sonnet medium.

---

## Decisão estratégica (Willy)

### F-NEW-6: Multi-tenant SaaS

**Status:** AGUARDA decisão Willy ANTES de iniciar. Custo $$/mês infra + tempo Patrick + responsabilidade legal LGPD.

**Trigger pra promover:** SE 100+ self-hosters em 3 meses pós-launch público (Wave 15+ liberado pra mundo).

**Não entra no roadmap até decisão estratégica explícita.**

---

## Sequenciamento recomendado

```
Wave 8 (polish) ─────────────────────────────► GATE: visual aprovado
       │
       ▼
Wave 9 (admin out) ──────────────────────────► GATE: single-tenant
       │
       ▼
Wave 10 (trident + PLAN-B cross-check) ──────► GATE: review limpo
       │
       ▼
Wave 11 (StreakLostScreen — implementar OR drop)
       │
       ▼
Wave 12 (LiteLLM auto-sync) ──────────────────► feature kickoff
       │
       ▼
Wave 13 (light mode completo)
       │
       ▼
Wave 14 (naming) ─────────────────────────────► rename ANTES de deploy público
       │
       ▼
Wave 15 (deploy VPS local) ──────────────────► PATRICK valida acessível
       │
       ▼
Wave 16 (Token Editor)
       │
       ▼
Wave 17 (XP gating + Google OAuth)
       │
       ▼
[decisão Willy] ─► F-NEW-6 multi-tenant SaaS (se aplicável)
```

---

## Como usar este doc

1. **Início de sessão:** ler este file primeiro. Master `00-master-plan.md` só pra contexto histórico (Waves 0-7.x detalhe).
2. **Mudança de wave:** atualizar tabela §"Status enxuto" + bump status da wave.
3. **Pivot:** documentar em §"Histórico de pivots" abaixo + confronto vocal Patrick.
4. **Wave nova:** adicionar como P2 ou P3 (ROI) com sub-estrutura padrão (objetivo, descrição, pre-req, budget, modelo, risk).
5. **Wave done:** mover pra §"Status enxuto" linha verde.

---

## Histórico de pivots

### Pivot 0 — Criação 2026-05-06

Master `00-master-plan.md` ficou denso (693 linhas + Waves 0-7.x detalhadas). Patrick pediu doc enxuto que vire source of truth daqui pra frente.

**Razão extra:** Patrick reportou "design horrível" — disparou Wave 8 polish P0 que não existia no master. Master fica como histórico, este V2 é executável.

---

## Cross-references

- `audits/00-master-plan.md` — histórico Waves 0-7.x
- `audits/HANDOFF-WAVE-7-FINAL.md` — handoff sessão anterior (background pra retomada)
- `PLAN-B-SPEC.md` — 115 findings 2026-04-30 (Wave 10 cross-check)
- `~/Documents/Github/anti-ai-design-system/ui_kits/default/` — components canonical (lift Wave 8.2 se necessário)

---

## Próxima ação imediata

**Wave 8.0** — Patrick abre 8 telas, valida, reporta. Eu agrego em 8.1 + 8.2 fix.

Roteiro repetido pra fácil consulta:

| # | Tela | URL | Validar |
|---|---|---|---|
| 1 | PricingDrawer | `/settings` | CTA "Customizar pricing" → drawer + 4 inputs + lista |
| 2 | StreakCounter | sidebar | 🔥 acima PlanCountdown + bump motion |
| 3 | Heatmap | `/analytics` | Click tile → detail panel inline |
| 4 | Login toggle | `/login` (logout antes) | Sun/Moon top-right |
| 5 | Login input light | `/login` light mode | Border cinza visível |
| 6 | Pie charts | `/dashboard` | Labels Title Case |
| 7 | Timezone | filtros Dash/Sessions/Analytics | "Hoje" = dia BR |
| 8 | Skills/Prompts | `/skills` + `/system-prompts` | Cards rounded-xl |

Pré-requisito Patrick: backend restartar (Ctrl+C + `npm run dev -w server`) pra Wave 7.3 endpoints subirem.
