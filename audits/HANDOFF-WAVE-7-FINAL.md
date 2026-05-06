# Handoff — Wave 7 final (próxima sessão pós-/compact)

> **Branch:** `redesign/motion-ds-audit`
> **Último commit:** `32dd8c8` (Wave 7.3 PricingDrawer F-NEW-8)
> **Estado:** Waves 0-7.x ✅ done. Master plan original 100% atacado.

## Resumo executivo

Wave 7 fechou todas as pendências do master plan original (6.6, 6.7b, 7.1-7.7) + F-NEW-8 (PricingDrawer custom rates). Único gap real que sobrou: StreakLostScreen (precisa backend signal `streak.lost_pending`).

Próxima decisão: F-NEW-9 (auto-sync pricing via LiteLLM, proposta Patrick) OR pular pra deploy (F-NEW-4 naming → F-NEW-5 VPS).

## Commits Wave 7 (sessão pós-/compact 2026-05-06)

```
32dd8c8 feat(pricing): wave 7.3 — PricingDrawer F-NEW-8 (custom rates per model)
f395fad feat(retention): wave 6.7b — StreakCounter sidebar component
713edc1 feat(ux): wave 6.6 + 7.6 — skills/prompts rounded-xl + heatmap click-detail
42c22a6 feat(ux): wave 7.5+7.6+7.7 — login theme toggle + input light + heatmap brand
30b52f2 feat(charts): wave 7.2 patch — version dot merge + source Title Case
3e9b9fa feat(charts): wave 7.2 — pie chart label fix (raw model name kebab→Title Case)
44cdbe3 feat(time): wave 7.1 — timezone fix America/Sao_Paulo across server presets
```

## Estado tabela completa

| Wave | Status | Output |
|---|---|---|
| 0-6.5, 6.7a, 6.8 | ✅ done | (sessão anterior) |
| 6.6 Skills/Prompts | ✅ done | rounded-xl polish |
| 6.7a Achievements | ✅ done | (sessão anterior) |
| 6.7b StreakCounter | ✅ done (parcial) | Component sidebar; **StreakLostScreen pending** (gap backend `streak.lost_pending`) |
| 6.8 Cleanup | ✅ done | (sessão anterior) |
| 7.1 Timezone | ✅ done | server presets em America/Sao_Paulo |
| 7.2 Pie label | ✅ done | "Claude Opus 4.7" / "Claude Code" |
| 7.3 PricingDrawer | ✅ done | F-NEW-8 schema + endpoints + drawer + tokenService patch |
| 7.4 Auth user teste | ✅ done | senha resetada via SQL |
| 7.5 Login toggle | ✅ done | Sun/Moon button |
| 7.6 Heatmap click-detail | ✅ done | tile click → detail panel + brand color |
| 7.7 Input border light | ✅ done | --input gray-300 visible |

## Pendência única real

**StreakLostScreen** — precisa backend novo:
- Tabela `streak_breaks (user_id, broken_at, prev_streak, recovered_at, recovery_used BOOLEAN)`
- Endpoint check signal `streak.lost_pending` (1-2 dias após break, recovery grace period)
- UI overlay tela "Tu perdeu streak X dias atrás. Track 1 entry hoje pra recuperar"
- Decisão futura: implementar OR drop. Não bloqueia deploy.

## Wave 7.8 NOVA proposta (Patrick 2026-05-06)

**Auto-sync pricing via LiteLLM** (F-NEW-9 backlog):
- Cron diário fetch `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json`
- Tabela `model_pricing_cache` populada
- `getEffectivePricing` cascata: user override (Wave 7.3) → cache LiteLLM → config/pricing.ts hardcoded
- Substitui Wave 7.3 input manual pra rates default
- OpenCode AI `/zen/v1/models` testado — só retorna IDs, sem rates. Não serve.

## Credenciais (auth real)

- **Patrick:** `patrick.studioartemis@gmail.com` / `artemis2026` (super_admin)
- **User teste:** `pet19.rv@gmail.com` / `AdminArtemis@2026` (user, aprovado)

## Validação visual pendente Patrick

1. **PricingDrawer** `/settings` → header CTA "Customizar pricing" → drawer slide-right + model picker + 4 rates inputs + list overrides ativos
2. **StreakCounter** sidebar footer (acima PlanCountdown) — 🔥 + número + bump motion
3. **Heatmap click** `/analytics` → click tile dia/hora → detail panel inline com entries + cost
4. **LoginPage toggle** `/login` (logout primeiro) → Sun/Moon top-right
5. **LoginPage light input** → toggle light → input border visível em fundo branco
6. **Pie charts** `/dashboard` → "Claude Opus 4.7" + "Claude Code" labels
7. **Timezone** filtros Dashboard/Sessions/Analytics — comparar dia certo BR vs antes
8. **Skills/Prompts** `/skills` + `/system-prompts` rounded-xl

## Pra Patrick agir antes de testar

1. **Restartar backend:** `Ctrl+C` no terminal server + `npm run dev -w server` — tsx watch não pegou `pricingOverrideService` novo (testa endpoint: `curl localhost:3002/api/settings/pricing -H "Authorization: Bearer <token>"` deve retornar `{"overrides":[]}`)
2. Migration `010_create_user_pricing_overrides.sql` ✅ aplicada (`npm run migrate -w server` rodado)

## Próxima sessão — opções

### Opção A: Wave 7.8 (F-NEW-9) — LiteLLM auto-sync pricing

- Migration `011_create_model_pricing_cache.sql`
- node-cron job 3am BR fetch + parse
- Refactor getEffectivePricing cascata 3 níveis
- PricingDrawer mostra rates default do cache em placeholder
- Settings toggle on/off

**Por quê agora:** Patrick mencionou diretamente. Override Wave 7.3 ainda manual — sync resolve UX scaling.

**Risk:** dependency rede + LiteLLM community pode mudar schema. ~2-3h.

### Opção B: F-NEW-4 + F-NEW-5 — Naming + Deploy VPS

- Rename `claude-token-tracker` → `artemis-tokenizer` (gh repo rename)
- Deploy Hostinger 72.60.152.11 Docker compose + HTTPS Caddy/certbot
- pg_dump local → psql VPS migration
- CI/CD GitHub Action

**Por quê:** validation pública. ~3-4h. Depende decisão naming Patrick.

### Opção C: StreakLostScreen — backend gap fix

- Migration `streak_breaks`
- Service streakService + endpoint
- UI overlay component

**Por quê backlog:** depende Patrick decidir feature priority. Recovery grace period UX call needed.

### Opção D: Validação Patrick + bug fixes

Patrick valida 8 telas → bugs → wave fix. Garantido feedback antes deploy.

## Recomendação

**D primeiro** (Patrick valida) → **A** (LiteLLM sync, 2-3h dedicada) → **B** (deploy, 3-4h dedicada). Total ~7h dividido em 2-3 sessões.

OR **B fast track:** assume validação OK + deploy direto (rollback fácil se bug aparecer). 1 sessão dedicada.

## Inputs e refs

- **Master plan:** `audits/00-master-plan.md` §"Estado atual" + §"Backlog Wave futura"
- **Backlog F-NEW-9 NOVO:** `audits/00-master-plan.md` §"F-NEW-9: Auto-sync pricing via LiteLLM"
- **Iron Laws:** edits SKILL.md/CLAUDE.md → prompt-engineer --validate (IL-1 hook V2 bloqueia). Edits .tsx/CSS livre.
- **LiteLLM URL ref:** `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json`

## Dev environment

- **Preview:** `token-tracker-anti-ai-ds` porta **3333**
- **Backend tsx:** `npm run dev -w server` porta **3002**
- **Docker postgres:** `claude-token-tracker-db` (tracker/tracker_dev/claude_token_tracker)
- **JWT_SECRET:** `ctt-local-secret-change-me-2026-03-28-random`
- **Auth real ativo** (Wave 6.4c removeu MOCK_USER)

## Anti-patterns evitar

- Atacar Wave 7.8 LiteLLM sem validar Wave 7.3 PricingDrawer funciona end-to-end primeiro
- Deploy VPS com bugs visuais não validados Patrick
- StreakLostScreen sem decisão Patrick UX recovery period
- Mexer schema novo sem migration via `npm run migrate` (não inline ALTER no boot)
