# Handoff — Wave 6.2 (próxima sessão pós-/compact)

> **Branch:** `redesign/motion-ds-audit`
> **Último commit:** `add0a62` (Wave 6.1 closeout)
> **Estado:** Waves 0-6.1 ✅ done. Wave 6.2 (Sessions lift) próxima.

## Contexto pleno (resumo executivo)

Tracker (`claude-token-tracker`) virando free-tool isca pra Studio Artemis (studioartemis.co). Visual primeiro (Waves 0-6), refactor admin/multi-user no fim (Wave 7).

Master plan completo: `audits/00-master-plan.md`. Estado de cada wave em §"Estado atual".

## Decisões já tomadas

- Brand Artemis: navy `#003899` + vibrant blue `#005EFF` + Untitled UI gray scale
- Typography: IBM Plex Sans (display) + Inter (body) + Geist Mono
- Modos: dual light + dark (toggle via UserMenu rodapé)
- Sidebar canonical CRM lift: navy fill drama em ambos modos, UserMenu rodapé (avatar + theme + config + logout), collapse 272↔68px
- Token convention: triplet HSL puro `--background: 222 41% 8%` + `@theme inline` aplica `hsl()` wrap pras Tailwind utilities
- Auth bypass: MOCK_USER injetado em `AuthContext.tsx` Wave 6.1 (single-tenant pivot, Wave 7 cleanup formal)
- 401 no hard-redirect (loop fix)
- Vite proxy `/api → 3002`
- Backlog naming overhaul (F-NEW-4 master plan §"Backlog Wave futura"): rename produto + repo Artemis-branded multi-LLM nome (ex: "Artemis Tokenizer"). NÃO faz agora.

## Wave 6.2 — escopo

**Objetivo:** lift `SessionsTable` tracker → `AppTable` canonical do CRM template (`anti-ai-design-system/ui_kits/default/components/data/AppTable.jsx`). Major migration: tracker usa shadcn-style Table, canonical usa CSS grid + sort/click integrados.

**Inputs:**
- Lift map em `audits/05-deltas-and-lift.md` §A.6
- Component spec: `audits/05-component-architect.md` (NÃO está aqui — AppTable é lift, não CRIAR)
- Tracker atual: `client/src/components/sessions/SessionsTable.tsx` + `pages/SessionsPage.tsx` + `pages/SessionDetailPage.tsx`
- Canonical: `~/Documents/Github/anti-ai-design-system/ui_kits/default/components/data/AppTable.jsx`
- Lift map flag (Wave 5): "MAJOR migration — tracker SessionsTable tem columns custom + actions cell. Lift principal Wave 6.2."

**Sub-steps:**
1. Read AppTable.jsx canonical pra entender API (rowProps, sort, dense)
2. Port .jsx → .tsx no tracker em `client/src/components/data/AppTable.tsx`
3. Refactor SessionsTable pra usar AppTable + columns config
4. Drop ClickableRow wrapper (AppTable tem onRowClick + keyboard support nativo)
5. Apply tokens Wave 4 (rounded-xl, hover border accent — herdar surface.ts atualizado Wave 6.1)
6. Validate sort/click/keyboard a11y
7. Visual QA + commit

**Risk (Wave 5 noted):** AppTable signature mismatch crítico vs SessionsTable. Sub-wave 6.2 BLOCKING — pause se quebrar layout.

## Inputs e refs práticos

- **Skillforge maestro:** consultar antes lift via `/maestro V2` se intent ambíguo
- **Iron Laws:** edits SKILL.md/CLAUDE.md → prompt-engineer --validate (IL-1 hook V2 bloqueia). Edits .tsx/CSS livre.
- **Tokens canonical disponíveis:** ver `client/src/index.css` (300+ linhas). Usar via Tailwind utilities (`bg-card`, `text-foreground`) ou direto (`hsl(var(--accent) / 0.5)`).
- **CSS canonical sidebar/usermenu:** appendados em `index.css` linhas 525-900. Não duplica.

## Preview / dev environment

- **Preview server:** `token-tracker-anti-ai-ds` na porta 3333 via `.claude/launch.json` global em `C:/Users/Patrick Neuhaus/Documents/Github/.claude/launch.json`
- **Backend tsx:** `npm run dev -w server` na porta 3002 (`.env` PORT). Docker postgres `claude-token-tracker-db` up 6+ days.
- **Auth:** MOCK_USER bypass habilitado. Pra dados reais: gera JWT signed user `b42baf99-6731-45d3-b1e3-5481f1ec72cc` (Patrick) com secret `ctt-local-secret-change-me-2026-03-28-random`, injeta `localStorage.setItem('token', JWT)`, reload.
- **Bugs conhecidos:** preview_screenshot timeout (Vite HMR busy). Workaround: `preview_snapshot` pra DOM tree.

## Próximos passos imediatos (Wave 6.2)

1. Read AppTable.jsx canonical pra spec
2. Port pra TSX
3. Refactor SessionsTable usar AppTable + columns
4. Visual QA tabela rendering em /sessions
5. Commit `feat(ux): wave 6.2 — sessions lift AppTable canonical`

Após 6.2: 6.3 Analytics, 6.4 Login + Onboarding (CRIAR wizard), 6.5 Settings, 6.6 Skills/SystemPrompts (pendency modelo a/b/c), 6.7 Achievements + Streaks (CRIAR streak counter + confetti), 6.8 cleanup.

## Commits últimas 6 sessões

```
add0a62 feat(ux): wave 6.1 closeout — chart palette tokens + surface rounded-xl
f970bcf feat(ux): wave 6.1 — StatCard canonical + SummaryCards refactor + WebhookPing
8ac1350 feat(ux): wave 6.0 — shell canonical lift (Sidebar + UserMenu + ThemeContext)
03b4b4d feat(ux): wave 6.1 — full CRM template token map + sidebar navy drama
22c3ced fix(ux): wave 6.1 — hsl() wrappers + 401 no-redirect + proxy 3002
998e5d4 feat(ux): wave 6.1 step 1 — apply Wave 4 tokens + light/dark dual-theme
f66dc6f feat(ux): wave 6.1 step 2 — auth bypass temporário (single-tenant pivot)
1b81754 feat: wave 5 + handoff S2
4a0e890 feat: wave 4 tokens
9243602 feat: handoff S1 pendency
```
