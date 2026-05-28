# Wave 0 — References + Brand Confirm

> **Sessão:** 1 / **Wave:** 0 / **Status:** ✅ done
> **Skills usadas:** WebFetch (5 paralelos) + reference-finder --solution-scout
> **Output deste doc:** brand kit Artemis confirmado + 4 reference apps + 3 padrões aplicáveis ao tracker

---

## A) Brand Artemis — confirmado

### Paleta (já dada pelo Patrick)

| Token | Hex | Função |
|---|---|---|
| **Primary** | `#003899` | navy — actions principais |
| **Accent** | `#005EFF` | vibrant blue — CTAs/links |
| **Secondary** | `#000000` | black — destaque máximo |
| **Text** | `#667085` | gray-500 — body |
| **Variantes blue** | `#0D419B`, `#0848C5`, `#1E93FF`, `#48B7FF` | gradient stops |
| **Gray scale (Untitled UI)** | `#F2F4F7`, `#EAECF0`, `#D0D5DD`, `#98A2B3`, `#667085`, `#475467`, `#344054`, `#182230`, `#101828`, `#0C111D` | 10 stops |
| **White** | `#FFFFFF` | surface |

Match: idêntico ao `charming-solutions` (memória project_crm_gaps_plan.md). Brand Artemis = navy primary + vibrant blue accent + Untitled UI gray.

### Typography — ⚠️ não declarada explicitamente

WebFetch `studioartemis.co` não retornou `font-family` (Elementor injeta via CSS externo, não scrape simples).

**Hipótese forte:** **IBM Plex Sans (display) + Inter (body)** — idêntico ao charming-solutions.

**Plano:** seguir com hipótese pra Wave 1 (positioning não depende de fonte exata). Wave 4 (`ui-design-system --generate`) confirma com Patrick antes de gerar tokens. Se Patrick disser outra coisa, ajusto.

### Tom visual studioartemis.co

- **Posicionamento:** "Transformamos tecnologia em resultados de marketing"
- **Tom:** corporativo-estratégico, profissional, moderno, prático
- **Cor:** blue/teal accent + branco/cinza dominantes
- **Logo:** minimal geométrico SVG
- **CTAs:** rounded rectangular azuis
- **Mídia:** fotos profissionais (não ilustração)
- **Métrica destacada:** 100+ projetos / 5 países / NPS 96

→ Tracker deve refletir: profissional, prático, sem floreios, foco em resultado mensurável (cost saved, hours tracked).

---

## B) Reference apps — competidores e inspirações

### Tabela comparativa

| Nome | Tipo | Stars/Pop | Distribuição | Free | Single/Multi | Visual | Match | Preço |
|---|---|---|---|---|---|---|---:|---|
| **ccusage** | CLI npm | 13.8k stars | `npx ccusage@latest` | 100% free, MIT | single-user | terminal tabela | 70 | free |
| **Helicone** | LLM observability SaaS | enterprise | web hosted | 7-day trial | multi-user | sidebar+real-time+multi-panel, blue corporate | 60 | freemium → $25+/mo |
| **Plausible** | Web analytics | gold standard prospect-free | web hosted + self-host docker | 30-day trial, $9/mo | multi-user | single-page focus, lightweight, "clear without complexity" | 85 (visual) | freemium → $9/mo |
| **CCSeva** | Mac menubar | URL 404 (não confirmado) | mac app | ? | single-user | menubar minimal | ? | ? |

### Lacuna de mercado confirmada

GitHub topic `claude-code` (top 10 repos) retornou agent harnesses + skills, **ZERO trackers GUI dashboard**. ccusage é REI mas é CLI.

**Tracker do Patrick** = híbrido único: GUI dashboard self-host single-tenant público open source pra Claude/Codex token tracking. Sem competidor direto na intersecção.

### Por reference

#### 🥇 ccusage (competidor mais direto)
- Lê JSONL local Claude Code (mesmo método dos hooks Patrick)
- Daily / monthly / session reports
- **5-hour billing blocks** (Claude tem reset 5h) — feature crítica que tracker NÃO tem ainda
- Cache token breakdown (tracker tem)
- JSON export (tracker tem CSV)
- Offline mode (pre-cached pricing) — tracker NÃO tem
- Limitação: CLI only, sem GUI, sem multi-source (só Claude Code, não Codex)

#### 🥈 Plausible (gold standard visual prospect-free)
- "Lightweight, privacy, no cookies"
- Open source + bootstrapped → credibilidade
- Single-page dashboard, real-time, sem complexidade
- Target: startups/agencies/creators (≈ ICP Artemis)
- **Padrão visual a copiar:** dashboard "clear without complexity"

#### 🥉 Helicone (observability LLM saas)
- Multi-model (OpenAI, Anthropic, Azure)
- Cost + token + observability integrado
- Sidebar nav + real-time metrics + multi-panel
- Free trial 7d (não permanente — pior posicionamento que Plausible)
- Visual: technical yet professional, blue primary

---

## C) 3 padrões aplicáveis ao tracker

### Padrão 1: "ccusage features faltando" (fechar gap)
- **5-hour billing block view** — Claude reseta a cada 5h, tracker mostra mensal/semanal/diário mas não 5h
- **Offline mode** — tracker depende de Postgres + webhook; ccusage roda offline lendo JSONL
- **Per-instance grouping** — útil pra prospect que usa Claude Code em N projetos
- **Onde aplicar:** Wave 7 (lógica) ou nova sub-wave em S3

### Padrão 2: "Plausible polish" (visual aspiration)
- **Single-page focus** — Dashboard atual tem 9 blocos verticais, Plausible cabe tudo num scroll mais curto
- **"Clear without complexity"** — densidade alta mas sem overwhelm
- **Lightweight credibility** — README destaca tamanho/perf vs alternatives
- **Onboarding como pitch** — "configure em 30s" sem CTA invasivo
- **Onde aplicar:** Wave 6 (visual implementation), especialmente Dashboard 6.1 e Settings 6.5

### Padrão 3: "Helicone sidebar + real-time" (estrutural)
- **Sidebar consolidada** com seções claras (Overview / Sessions / Analytics / Settings)
- **Real-time metric headers** — KPI top de página com refresh visível
- **Multi-panel grid 2-col** pra breakdowns relacionados
- **Onde aplicar:** Wave 5 (lift map sidebar) + Wave 6 (Dashboard + Analytics layouts)

### Padrão 4 (BÔNUS) — diferenciais que NINGUÉM tem
1. **Custom pricing input** — Patrick mencionou. Nenhum dos 3 tem. Diferencial pra usuários que pagam plano fixo Claude Pro/Max em vez de API pay-as-you-go.
2. **Gamification streaks Duolingo-style** — Patrick mencionou. Nenhum tem. Diferencial fortíssimo pra retenção (prospect olha tracker → vira hábito → marca Artemis presente diário).
3. **Multi-source unificado** (Claude Code + Codex + Tampermonkey claude.ai) — Patrick já tem. ccusage só Claude Code. Helicone multi-model mas não esses sources locais.

---

## D) Recomendação Wave 0 → Wave 1

🟡 **EXTEND** — referência mais próxima (Plausible) cobre 60-70% do visual aspirado. Construir tracker como "Plausible-flavored Claude tracker" com Helicone-style real-time + ccusage features faltando + diferenciais únicos.

**Posicionamento sugerido pra Wave 1 (free-tool-strategy):**
> "Plausible pra Claude. Track quanto tu gasta em Claude Code, Codex e claude.ai num só dashboard, self-host docker, dark mode, sem login required. Open source. By Artemis."

---

## E) Pendências pra resolver

1. **Typography exata** — confirmar IBM Plex Sans + Inter ou outra fonte. Resolver na Wave 4 antes de gerar tokens.
2. **CCSeva info real** — URL correta? Tem features que ccusage não tem? Não bloqueia, mas curiosidade.

---

## F) Estado Wave 0

- [x] WebFetch studioartemis.co
- [x] WebFetch ccusage / Helicone / Plausible / GitHub topics claude-code
- [x] Sintetizar references
- [ ] **GATE Patrick:** valida brand confirmed + 4 reference apps + 3 padrões + posicionamento sugerido

Após GATE: arrancar Wave 1 (`free-tool-strategy`).
