# Wave 1 — Free-Tool Strategy

> **Sessão:** 1 / **Wave:** 1 / **Status:** ✅ done (gate pending)
> **Skill:** `free-tool-strategy` (anthropic-skills)
> **Goal:** travar ICP, funnel, branding, distribution, gamification e onboarding antes do audit visual.

---

## Sumário executivo

Tracker = **Plausible-flavored Claude/LLM cost tracker, self-host, open source, by Studio Artemis**. Free tool isca pra geração de leads B2B Artemis através de dev power users que usam LLMs intensamente. Gamification streaks + custom pricing + multi-source são pilares de retenção e share-worthiness.

**Scorecard skill:** 35/40 → 🟢 **STRONG CANDIDATE**.

---

## 1. ICP (Ideal Customer Profile)

### 🎯 Primary — "O dev viciado em Claude Code"

| Atributo | Valor |
|---|---|
| **Cargo** | Solo dev, indie hacker, founder técnico, freelancer LLM-heavy |
| **Stack** | Claude Code 4+ horas/dia, talvez Cursor/Codex paralelo, terminal-first |
| **Spend** | $50+/mês em Claude API OU $200+/mês em Claude Pro/Max plan |
| **Dor** | "Não sei se vou estourar o limite antes do reset" / "Quanto eu gastei nessa sessão de debug de 4h?" / "Vale a pena migrar pro plano $200?" |
| **Onde está** | GitHub trending dev tools, Hacker News, /r/ClaudeAI, /r/LocalLLaMA, Twitter/X dev, dev.to, Product Hunt Tech Tuesdays |
| **Persona** | "Quero visibilidade de custo sem dar meu email pra SaaS gringa que vende observability enterprise" |
| **Match Artemis** | Alto — perfil técnico, brasileiro/global, valoriza self-host, open source |

### 🎯 Secondary — "Tech lead de startup pequena"

| Atributo | Valor |
|---|---|
| **Cargo** | Tech lead / Eng manager / CTO de startup 5-30 devs |
| **Stack** | Equipe usando Claude/GPT/Gemini distribuídos, sem visibilidade de cost agregado |
| **Spend** | $500-5k/mês de LLM cost combinado |
| **Dor** | "Quanto a equipe gasta?", "Qual dev usa mais?", "Qual modelo é mais eficiente?" |
| **Match Artemis** | Médio-alto — perfil decisor, pode contratar Artemis pra projeto IA |

### 🎯 Tertiary — "Consultor/freelancer LLM-heavy"

| Atributo | Valor |
|---|---|
| **Cargo** | Consultor de IA, agência boutique, freelance dev integrando LLMs em apps de cliente |
| **Stack** | Múltiplos projetos de cliente, cada um com LLM diferente |
| **Spend** | Variável — precisa precificar por projeto |
| **Dor** | "Quanto custa esse cliente em IA?" / "Cobrei o suficiente?" |
| **Match Artemis** | Médio — pode virar parceiro/network, não cliente direto |

### Anti-ICP (quem NÃO mira)

- Enterprise (>500 employees) — vão pra Helicone/LangSmith/Datadog. Tracker simples demais.
- End-user não-técnico — não vai conseguir docker compose.
- Stack 100% closed-source corporate — não vai usar self-host open.

---

## 2. Posicionamento final

### Tagline (60 chars)
> **"Plausible pra Claude. Track LLM cost local, sem login."**

### Subhead (140 chars)
> Track tokens e custos de Claude Code, Codex, claude.ai, ou qualquer LLM via hook customizável. Self-host docker. Dark mode. Open source.

### Hero pitch (página principal, 3 parágrafos)
**P1 — problema:** Tu usa Claude pesado e não sabe quanto gasta? API mostra total. Plano fixo esconde custo real. Dashboards SaaS pedem login + cartão pra ver teu próprio dado.

**P2 — solução:** Roda local em docker. Webhook coleta tokens dos teus hooks. Dashboard mostra cost por sessão, projeto, modelo, dia. Streaks pra te manter consciente. Custom pricing pra qualquer modelo.

**P3 — credenciais sutis:** Open source MIT. Self-host. Sem telemetria. By Studio Artemis (link discreto).

### Anti-positioning
- ❌ "Enterprise observability" (já tem Helicone)
- ❌ "AI cost optimization platform" (genérico)
- ❌ "ML operations dashboard" (jargão)

### Tom de voz
Direto, técnico, brasileiro-global, sem floreios marketing. Tipo readme do Plausible: confidence sem hype.

---

## 3. Funnel detalhado

```
DISCOVERY → LAND → TRIAL → USE → ENGAGE → CONVERT
```

| Etapa | Touchpoint | Goal | Métrica chave |
|---|---|---|---|
| **1. Discovery** | GitHub Trending / HN / Reddit / dev.to / Product Hunt / Twitter | "Achei tracker LLM open source" | impressions, GitHub views |
| **2. Land** | GitHub README OU landing page (decidir) | Entender o que é em 30s | bounce rate, scroll depth |
| **3. Trial** | `git clone` + `docker compose up` + webhook setup | Primeira métrica chega em <5 min | install→first-data-rate |
| **4. Use** | Dashboard 20-30x/dia (gamification streak ajuda) | Vira hábito diário | DAU/MAU, streak length |
| **5. Engage** | Footer "by Artemis", login screen branding sutil, share insights | Prospect lembra Artemis | site referrals, brand recall |
| **6. Convert** | Site Artemis → form contato → lead Artemis ICP-fit | Lead entra no pipeline | form fills, qualified leads |

### Conversion path detalhado

```
Dev abre tracker (10ª vez) → vê footer "Built by Studio Artemis · studioartemis.co"
   → clica curioso (talvez 1 em cada 100 sessions)
   → site Artemis: vê "Transformamos tecnologia em resultados de marketing"
   → vê portfolio Lovable + Supabase + n8n + Claude Code
   → identifica: "esses caras sabem o que fazem"
   → 2 cenários:
      (a) tem projeto LLM próprio → form contato → lead direto
      (b) é dev contratado → recomenda Artemis no networking → lead indireto

Conversão estimada (top of funnel):
   1000 GitHub stars
   → 300 actual installs
   → 100 active users (30%)
   → 5 site visits/mês via tracker (50%)
   → 1 lead qualificado/mês (20% conversion)
```

Não é volume monstro. **É qualidade de lead.** Dev power user é decisor técnico ou influenciador de decisão.

---

## 4. Branding rules — invasividade calibrada

### O que ENTRA
- Footer fixo em todas pages: `Built by Studio Artemis · [→ studioartemis.co]`
- LoginPage: logo Artemis pequeno + tagline empresa em hover/tooltip
- Accent color = Artemis blue `#005EFF` (já confirmado Wave 0)
- README header: badge "By Artemis" + link
- Empty states (Settings sem coletor configurado): mensagem técnica curta + 1 link Artemis discreto na seção "Made by"
- LICENSE inclui menção Artemis (MIT + "originally built by Studio Artemis")
- About page no tracker (página `/about` ou modal): 1 parágrafo sobre Artemis

### O que NÃO entra
- ❌ CTAs invasivos ("Need LLM consulting? Contact us!")
- ❌ Modal/banner "Try Artemis services"
- ❌ Email gating ("Enter email to use tracker")
- ❌ Telemetria sem opt-in
- ❌ Newsletter signup forçado
- ❌ Logo Artemis no header de cada page (só footer)
- ❌ Cor primary = brand color forte (mantém UX-first)
- ❌ Tagline marketing nos dashboards principais

### Princípio
**Pague o aluguel pelo lugar.** Footer = ok porque é discreto. CTA invasivo = não. Plausible faz exatamente isso. Tracker inspira.

---

## 5. Distribution plan

### 5.1 Pré-launch (semana -2 a 0)
- [ ] README polido com hero screenshot animated (gif/webm 5s mostrando dashboard)
- [ ] Landing page simples (`/` do tracker = README + screenshot OU site separado em vercel)
- [ ] Demo data seed (`npm run db:seed:demo`) pra primeira run mostrar UI populada (decisão: mostrar demo OU empty state que vira pitch?)
- [ ] Setup script unificado (`./setup.sh` ou `npx claude-token-tracker init`)
- [ ] Tutorial dev.to escrito + screenshots

### 5.2 Launch day
- [ ] **Product Hunt** — submissão Tech Tuesday/Wednesday, agendar
- [ ] **Hacker News** — "Show HN: Plausible pra Claude — open source LLM cost tracker (by Studio Artemis)"
- [ ] **Reddit** — /r/ClaudeAI, /r/LocalLLaMA, /r/programming (cuidado com auto-promo rules)
- [ ] **Twitter/X** — thread Patrick + Artemis account
- [ ] **LinkedIn** — Artemis post + Patrick post pessoal
- [ ] **dev.to** — artigo tutorial publica simultâneo

### 5.3 Pós-launch (semanas 1-4)
- [ ] Newsletters dev BR (TheNewCC, BR Tech etc)
- [ ] Podcasts dev (Hipsters, Lambda3, IA com Café)
- [ ] dev.to follow-up artigo: "Como eu economizei $X usando o tracker"
- [ ] YouTube demo (5 min) — instalar + ver primeiro dado + streak
- [ ] GitHub Trending push: incentivar stars early adopters

### 5.4 Sustain (mês 2+)
- [ ] Updates regulares (a cada 2-3 semanas) com changelog visível
- [ ] Showcase de usuários ("How devs are tracking — share your stats")
- [ ] Comparativo dev.to: "Tracker vs ccusage vs Helicone — quando usar cada"

---

## 6. Success metrics

### Vanity (acompanhar mas não obcecar)
- GitHub stars (target: 500 em 3m, 2k em 12m)
- npm downloads / docker pulls
- HN/PH ranking dia 1

### Real (alvo final)
- **Active installs** (telemetria opt-in com count anonymous, contar instâncias rodando)
- **DAU / MAU** (proxy via opt-in ping)
- **Streak length** mediana (proxy de retenção)
- **Site referrals** studioartemis.co com `?ref=tracker`
- **Form leads** atribuídos via UTM `?utm_source=tracker&utm_campaign=footer`
- **Pipeline value** dos leads convertidos (revenue eventual de Artemis)

### Métrica norte-real
**1 lead qualificado/mês conversível em projeto Artemis = sucesso.**
Tracker pagou-se no ROI single-deal. Plus tudo é bônus.

---

## 7. Decisão gamification streaks: 🟢 PILAR PRINCIPAL

### Por que entra agora (não wave futura)

1. **Patrick é evidência** — olha tracker 20-30x/dia. Streak vai amplificar comportamento que já existe.
2. **Diferencial único** — nenhum competidor (ccusage, Helicone, Plausible) tem.
3. **Share-worthiness** — "veja minha streak de 47 dias trackando Claude" → screenshot share Twitter → backlink orgânico.
4. **Retenção** — Duolingo prova que streak vicia. Tracker prospect-facing precisa retenção.
5. **Onboarding fix** — streak goal definido na 1ª run vira commitment device.

### Spec inicial (Wave 3 motion + Wave 6.7 implementação)

- **Streak counter** no header (sidebar bottom ou dashboard top): "🔥 12 day streak"
- **Reset rule:** se passa 1 dia inteiro sem entrada, streak reseta. (Ou regra mais flexível? Wave 2 ux-audit decide.)
- **Daily goal** (opcional): X tokens / Y dollars / Z sessions per day
- **Achievement unlock motion** (P2 brand-heavy permitido) na conquista de marcos (7, 30, 100, 365 dias)
- **Streak lost** screen: empático, não punitivo ("Strike one — back at it tomorrow")
- **Share button** screenshot da streak pra Twitter/X

### Risco mitigation
- Reduced motion respeitado (Iron Law motion-design 3)
- Toggle off em Settings ("Disable streaks") pra users que detestam gamification
- Privacidade: streak é local (não rastreia user)

---

## 8. Onboarding strategy — wizard 4 steps

### Step 1: Welcome + source pick
**UI:** card central com logo Artemis pequeno, tagline tracker, CTA "Vamos começar (5 min)".
**Conteúdo:** lista checkboxes de sources possíveis:
- ☐ Claude Code (Python hook)
- ☐ Codex / OpenAI (CLI collector)
- ☐ claude.ai (Tampermonkey)
- ☐ Outra LLM (custom hook + pricing)

### Step 2: Install hooks (per source picked)
**UI:** tabs por source. Cada tab mostra:
- Comando único copy-paste (ex: `curl -fsSL .../install-claude-hook.sh | bash`)
- ENV vars necessárias (`TOKEN_TRACKER_WEBHOOK` + `TOKEN_TRACKER_TOKEN` — token gerado automaticamente, prefilled)
- Verifica botão: "Test connection" → tracker espera 1 hit do webhook → ✅ verde quando chega
- Link discreto: "Manual setup" → README

### Step 3: Pricing review
**UI:** lista de modelos detectados (vazia inicialmente — preenche após primeiro hit).
- Modelos com pricing pre-cached: ✅ ready
- Modelos custom (não conhecidos): ⚠ "Set pricing" → modal input ($X/1M input + $Y/1M output + $Z/1M cache)
- Botão "Skip — definir depois" disponível mas com aviso "cost calculation pode ficar 0"

### Step 4: Personal goals (opcional)
**UI:** card final com 2 toggles:
- "Set daily budget alert" → input value
- "Enable streaks" (default ON) → input streak goal (sessions/day default)
- CTA: "Start tracking" → vai pra Dashboard

### Pós-wizard
Dashboard com empty state "Aguardando primeira métrica..." + animated illustration "checking webhook... 🔄"
Quando primeiro hit chega: confetti motion (P2 permitido) + "🎉 You're tracking!"

### Custom pricing detection runtime
Após onboarding inicial, se modelo NOVO aparecer:
- Toast Sonner: "Novo modelo detectado: `gpt-5-experimental`. [Set pricing] [Skip]"
- Click [Set pricing] → drawer lateral com inputs + preset dropdown (Claude family / GPT family / Gemini family / Custom)
- Save → cost retroativo recalcula sessões anteriores com modelo desconhecido
- Helper text: "Onde encontrar pricing? [→ provider docs]"

---

## 9. Evaluation Scorecard (skill rubric)

| Fator | Score (1-5) | Justificativa |
|---|---:|---|
| Search demand | 4 | "claude token tracker" tem demand crescente. ccusage 13.8k stars prova. |
| Audience match | 5 | Dev/tech-lead = ICP Artemis exato. |
| Uniqueness | 5 | GUI dashboard self-host single-tenant pra Claude/Codex = lacuna confirmada Wave 0. |
| Path to product | 4 | Dev usa → ouve Artemis → projeto LLM → fecha. Indireto mas real. |
| Build feasibility | 5 | Já existe — só refactor visual + lógica. |
| Maintenance burden (inverse) | 3 | Médio — Claude evolui, models mudam. Hooks customizáveis mitigam. |
| Link-building potential | 5 | Open source GitHub = links naturais. dev.to + HN = backlink orgânico. |
| Share-worthiness | 4 | Streaks + insights compartilháveis. Screenshots dashboard share-friendly. |
| **Total** | **35/40** | 🟢 **STRONG CANDIDATE** |

---

## 10. Anti-patterns evitar (skill checklist)

- [x] **Build first, validate later** — tracker já existe + Patrick é evidência de validação (uso pessoal 20-30x/dia)
- [x] **Tool ≠ product connection** — branding sutil + ICP overlap garantem natural path
- [x] **Marketing without distribution** — distribution plan §5 cobre 4 fases
- [x] **Over-scoping MVP** — Waves 0-6 = visual lift first; refactor lógica fica Wave 7
- [x] **Gated behind signup wall** — explicitamente "sem login required" no posicionamento
- [x] **Ignoring maintenance burden** — score 3 inverse, hooks customizáveis mitigam
- [x] **Copy-paste competitor** — diferenciais únicos (custom pricing + streaks + multi-source)
- [x] **No-code shortcut without validation** — código próprio, não no-code
- [x] **Tool that needs PhD to use** — onboarding wizard 4 steps + setup unificado addressam
- [x] **Ignoring share-worthiness** — streaks share button + dashboard screenshots + insights compartilháveis

---

## 11. Estado Wave 1 + GATE pendente

- [x] ICP definido (primary/secondary/tertiary + anti-ICP)
- [x] Posicionamento final ("Plausible pra Claude. Track LLM cost local, sem login.")
- [x] Funnel mapeado (6 etapas + conversion path)
- [x] Branding rules sutis (entra/não entra + princípio)
- [x] Distribution plan (4 fases)
- [x] Success metrics (vanity + real + métrica norte)
- [x] Decisão gamification: 🟢 PILAR PRINCIPAL
- [x] Onboarding strategy: wizard 4 steps + custom pricing runtime
- [x] Evaluation scorecard: 35/40 STRONG
- [x] Anti-patterns checked
- [ ] **GATE Patrick:** valida ICP + posicionamento + branding + decisão streaks + onboarding wizard

---

## Próximo passo

Após GATE Patrick: arrancar **Wave 2** (`ux-audit` modo Cognitive Walkthrough) com inputs:
- Este doc (`audits/01-strategy.md`) — ICP + onboarding decidido
- 16 pages do tracker — percorrer com lente prospect-first
- Decidir empty states virando pitch sutil

Output: `audits/02-ux.md` com findings Nielsen 0-4 + critério aceite + recomendações onboarding wizard concretas + lista findings encaminhados pra motion/DS/component-architect.
