# Catálogo de erros / pendências · Claude Token Tracker

Doc fonte da verdade pra qualquer sessão futura. Lista AÇÕES ainda pendentes pra app sair do estado pessoal (Fase A), virar multi-tenant local (Fase B), e ir pra prod público em VPS (Fase C).

**Histórico fechado:** 101 fixes aplicados em 9 ondas (2026-05-19 → 2026-05-20). Coverage 90% das 112 findings trident inicial. Detalhes em `resolucoes-erros.md`.

**Estado atual (2026-05-20):**
- Server PID 16408 porta 3002
- 20 migrations aplicadas
- 56k+ token entries, 880 sessions, 2 users
- Webhook token rotacionado pra `51ba3cc4-***`
- Build clean (TS strict++, bundle inicial 509 KB)
- Repo limpo (worktree única, siblings órfãos apagados)

**Decisões Patrick incorporadas:**
- Multi-tenant approval: opção B (email verification + auto-approve)
- Brevo SMTP validado, email teste chegou
- VPS alvo Fase C: EasyPanel (144.126.219.182) — Vercel não cabe (serverless, sem postgres persistente)
- Domínio Fase C: subdomínio de `ciatotech.com` (domínio Patrick, sem site ativo hoje)
- Monitoring: WhatsApp via Evolution API (credenciais em `Github/.env`), batch 15min, grupo dedicado

---

## ⚠️ ESCOPO ATUAL (20/05/2026)

**Patrick decidiu:** focar **APENAS na Fase A** (uso pessoal solo) agora. **Fase B + C ficam DOCUMENTADAS abaixo como ROADMAP DEFERIDO**, não executar.

- ✅ **Fase A** = ATIVA — disparar Onda 10
- 🕓 **Fase B** = ROADMAP (multi-tenant local) — só quando Patrick decidir abrir pra outros
- 🕓 **Fase C** = ROADMAP (deploy VPS público) — só após Fase B

---

## FASE A · Ações pra Patrick usar solo confortável

### A1 · Cookie de autenticação seguro

**Problema:** quando tu loga, app guarda "carteirinha de identificação" (JWT) num lugar do navegador chamado localStorage. Qualquer script estranho rodando no navegador lê essa carteirinha e finge ser tu. Hoje sem risco real (zero XSS no app), mas é prática má conhecida.

**Solução:** mudar pra cookie httpOnly — cofrinho do navegador que só servidor lê, JavaScript não enxerga. Atacante consegue zero coisa via XSS.

**Por quê:** zera categoria inteira de ataque com pouco esforço. Padrão SaaS sério.

**Gravidade pra ti solo:** BAIXA. Tu é único user.
**Gravidade pra prod público:** ALTA. User externo logando, extensão maliciosa exfiltra token.

**Status:** PENDENTE

---

### A2 · Endpoint `/health` pra monitoramento

**Problema:** se app cair, ninguém sabe até tu abrir aba e ver erro. Sem rota dedicada que retorna "tô vivo" + "banco respondendo".

**Solução:** criar `/health` que checa banco + retorna `{"ok": true, "uptime": Xs, "db": "ok"}`. Monitoring tools (uptime-kuma, etc) chamam a cada 30s.

**Por quê:** alerta proativo > tu descobrir depois.

**Gravidade pra ti solo:** BAIXA.
**Gravidade pra prod público:** MÉDIA. Outros usando, se cair de madrugada perde-se confiança.

**Status:** PENDENTE

---

### A3 · Backup automático do banco

**Problema:** banco postgres tá rodando no Docker da máquina. Se HD pifar, container corromper, ou apagar volume sem querer = todo histórico (56k entries + sessions + projects) perdido.

**Solução:** scheduled task daily 3h da manhã roda `pg_dump` pra arquivo `.sql.gz` em outra pasta. Retenção 30 dias.

**Por quê:** dado insubstituível. Backup gratuito, automático, custa zero.

**Gravidade pra ti solo:** MÉDIA. Risco baixo perder, mas irreversível.
**Gravidade pra prod público:** ALTA. Dados de outras pessoas. LGPD issue.

**Status:** PENDENTE

---

### A4+A6 · Design System do Token Tracker (UNIFICADO)

**Combinados pela observação Patrick:** não é só fix de CSP unsafe-inline + audit de componentes duplicados. É **criar Design System próprio do tracker** — tokens, variáveis CSS, componentes unificados num único lugar consumível. Estilo brandbook, alinhado com identidade `anti-ai-design-system` que tracker já herda.

**Problema:**
- ~40 lugares no código com estilo inline (cor, tamanho direto no React em vez de CSS)
- Helmet (segurança HTTP) obrigado a relaxar regra `unsafe-inline` pra permitir
- Componentes duplicados (vários botões custom, várias modals, vários cards de stat)
- Sem source of truth pra design (cores, fontes, spacing, motion)

**Solução:**
1. Definir tokens centralizados (cores, fontes, spacing, radius, motion, shadow) em arquivo único (`design-tokens.css` ou TypeScript object)
2. Componentes primitivos unificados (`Button`, `Card`, `Modal`, `Input`, `Badge`) consumindo tokens
3. Migrar ~40 inline styles → variáveis CSS / componentes
4. Apertar regra helmet (remove `unsafe-inline` styleSrc)
5. Documentar como mini-brandbook (`docs/design-system.md`)

**Por quê:** identidade visual consistente. Manutenção fácil. Segurança HTTP mais apertada. User externo enxerga app polido.

**Gravidade pra ti solo:** BAIXA (visual atual já funciona).
**Gravidade pra prod público:** MÉDIA-ALTA. Primeira impressão importa pra conversão.

**Status:** PENDENTE — escopo grande, provável onda dedicada

---

### A5 · Audit gráficos completo (visual + responsivo)

**Problema:** dados batem 100%, mas pode ter problemas visuais: tipografia, espaçamento, contraste, mobile responsiveness, tooltips ruins, legendas cortadas, eixos sem unidade. Patrick já leu eixo errado (pico 11/05 vs achou 07/05) — possível UX issue.

**Solução:** worker percorre cada página de gráfico, screenshota desktop + mobile, lista problemas + prioriza fix.

**Por quê:** se vai compartilhar com outras pessoas, primeira impressão importa.

**Gravidade pra ti solo:** BAIXA (acostumado).
**Gravidade pra prod público:** MÉDIA. User novo abre, gráfico confuso = abandona.

**Status:** PENDENTE

---

### A7 · Polish do onboarding (primeiro login)

**Problema:** user novo se cadastra, tela inicial vazia (sem entries, sem sessions). Confuso. OnboardingWizard existe mas não validado pós-fixes recentes.

**Solução:** worker testa fluxo cadastro → primeiro login → tela inicial. Verifica se mostra tutorial, link pra setup collectors (Claude hook, Codex collector, tampermonkey), exemplo de payload.

**Por quê:** user que abandona no primeiro login não volta.

**Gravidade pra ti solo:** ZERO (já configurou).
**Gravidade pra prod público:** ALTA. Momento de conversão.

**Status:** PENDENTE

---

## FASE B · Ações pra OUTRAS pessoas usarem (mesmo PC, ainda local) — 🕓 ROADMAP DEFERIDO

### B8 · Confirmação de email obrigatória no cadastro

**Problema:** hoje qualquer um pode botar `presidente@whitehouse.gov` e app aceita. Sem verificação que email é válido nem pertence à pessoa.

**Solução:** após cadastro, app manda email com link "clica pra confirmar". Só ativa após clicar. Brevo já testado ✓.

**Por quê:** previne cadastro fake + bots + emails errados.

**Gravidade pra ti solo:** ZERO.
**Gravidade pra prod público:** ALTA. Sem isso, app vira lixo de email não-confirmado em semanas.

**Status:** PENDENTE

---

### B9 · Captcha no cadastro e "esqueci senha"

**Problema:** bots automatizados criam cadastros falsos em massa, disparam reset de senha pra emails alheios.

**Solução:** hCaptcha (grátis até 1M solicitações/mês, GDPR-friendly). Cadastro/forgot precisa resolver puzzle visual 5s.

**Por quê:** filtra 99% dos bots.

**Gravidade pra ti solo:** ZERO.
**Gravidade pra prod público:** MÉDIA-ALTA. Sem isso, primeira semana é varrida bot spam.

**Status:** PENDENTE

---

### B10 · Cota por usuário (+ ponte gamificação)

**Problema:** se 10 users cadastrarem e cada um mandar 50M tokens/dia, banco infla, app fica lento, custos sobem. Sem teto.

**Solução:** cada user começa com cota 100k tokens/dia (ajustável). Quando passa, webhook retorna 429 "cota excedida". Tu (super_admin) sobe cota individual no painel admin.

**Observação Patrick:** relaciona com **conceito de gamificação** que ele começou mas ainda não desenhou. Cota = teto operacional, gamificação = engajamento (badges, conquistas, ranking). Mesma região do app (UI + DB), pode ser desenhada conjunta no futuro.

**Por quê:** previne abuso (intencional ou bug) + protege recursos.

**Gravidade pra ti solo:** ZERO.
**Gravidade pra prod público:** ALTA. Vai ter alguém testando rate limit.

**Status:** PENDENTE

---

### B11 · Log de auditoria de ações admin

**Problema:** se tu (ou outro admin futuro) deletar user, mudar role, alterar pricing, não fica registro. Em problema, ninguém sabe quem fez o quê quando.

**Solução:** tabela `audit_log` com `actor_id`, `action`, `target_id`, `timestamp`, `details`. Toda ação admin grava 1 row.

**Por quê:** accountability + debug futuro + LGPD compliance.

**Gravidade pra ti solo:** BAIXA.
**Gravidade pra prod público:** MÉDIA. Sem isso, "quem deletou o user X?" vira mistério.

**Status:** PENDENTE

---

### B12 · LGPD strict + botão "deletar minha conta"

**Problema:** lei LGPD (Brasil) e GDPR (Europa) exigem que user consiga deletar tudo dele + ver quais dados são guardados. Hoje só via SQL.

**Solução:**
1. Botão Settings "deletar minha conta" — apaga user + cascade (token_entries, sessions, projects, etc). Migrations já tem `ON DELETE CASCADE` desde Onda 2.
2. Documentar **quais dados Tracker guarda** sobre cada user: email, password hash, webhook token hash, role, created_at, last_login, token entries (timestamp, model, tokens in/out/cache, cost, session_id, conversation_url), sessions (id, name, custom_name), projects.
3. Endpoint `/api/me/export` retorna JSON com TODOS dados do user (LGPD direito de portabilidade).
4. Página `/privacy` lista política em PT-BR.

**Observação Patrick:** pode ver **só uso do próprio user**, nada mais. Quer **ranking entre users** futuramente (mais gasto mensal/semanal/diário) — mas só após app estabilizar. Por hora, dado é per-user isolado.

**Por quê:** lei brasileira. Multa LGPD R$ 50k até 2% faturamento. Compliance básica obrigatória.

**Gravidade pra ti solo:** ZERO.
**Gravidade pra prod público:** OBRIGATÓRIO (LGPD se brasileiros usarem).

**Status:** PENDENTE — RANKING entre users DEFERRED até app estabilizar

---

### B13 · UI Settings polish

**Problema:** rotação de webhook token existe via endpoint backend, mas no painel Settings deve ter botão "rotacionar token" + display de cota usada hoje + cor verde/amarelo/vermelho.

**Solução:** UI consome endpoint existente, mostra hash truncado (`abc12345-****`) em vez do token completo, botão "regenerar" copia novo pra clipboard 1x. Indicador de cota com cor semafórica.

**Por quê:** ergonomia user externo. Sem isso, tu vira call center.

**Gravidade pra ti solo:** BAIXA.
**Gravidade pra prod público:** MÉDIA.

**Status:** PENDENTE

---

## FASE C · Ações pra subir num servidor público (VPS EasyPanel) — 🕓 ROADMAP DEFERIDO

### C14 · Servidor com domínio + HTTPS

**Problema:** hoje app roda em `localhost:3002` na tua máquina. Pra outro acessar, precisa servidor público + endereço (`tokens.ciatotech.com`) + HTTPS.

**Solução:** subir em **EasyPanel VPS** (144.126.219.182 — Patrick já tem painel pronto pra deploy Docker). Apontar DNS `tokens.ciatotech.com` pro IP, Caddy reverse proxy gera HTTPS automático grátis via Let's Encrypt.

**Observação Patrick:** Vercel não cabe (serverless, sem postgres persistente, scheduled tasks limitado). EasyPanel = simulação realista de prod sem custo adicional.

**Por quê:** sem HTTPS, browsers gritam "site não seguro". Sem domínio, ninguém memoriza IP.

**Status:** PENDENTE — OBRIGATÓRIO pra prod público

---

### C15 · Cloudflare proxy (DDoS + bot protection)

**Problema:** servidor público recebe ataques automatizados desde hora 1. Bots tentando senhas, varrendo rotas, DDoS small-scale.

**Solução:** colocar Cloudflare na frente do servidor (grátis). Filtra 90% dos requests maliciosos antes de chegarem no app. Patrick já tem domínio + acesso DNS.

**Por quê:** sem isso, server cai ou trava periodicamente.

**Status:** PENDENTE — ALTA pra prod público

---

### C16 · Docker compose de produção (com previsão de expansão)

**Problema:** docker-compose atual sobe só postgres. Em produção precisa: server + postgres + reverse proxy + (futuro: Redis, monitoring) no mesmo arquivo, com restart automático.

**Solução:** `docker-compose.prod.yml` com services + healthchecks + restart policy + secrets via env file. Estrutura aberta pra adicionar services futuros sem refactor.

**Observação Patrick:** "bom unificar já e resolver, se precisar de mais coisa futuramente". Compose extensível desde a primeira versão.

**Por quê:** server morre = restart automático. Estrutura escalável.

**Status:** PENDENTE — ALTA pra prod público

---

### C17 · Backup remoto (S3/Backblaze) — DEFERRED

**Observação Patrick:** "por enquanto não vou fazer, mas fica anotado". Backup local Fase A é suficiente por hora.

**Status:** DEFERRED (anotado pra futuro)

---

### C18 · Monitoring + alertas via WhatsApp (Evolution API)

**Problema:** sem visibilidade do estado real do app em produção. App pode estar lento, retornando 500 sporadically, sem ninguém saber.

**Solução:**
- uptime-kuma (self-host grátis) checa `/health` a cada minuto
- Sentry (free tier 5k errors/mês) captura exceptions JS + backend
- **Alertas via WhatsApp** usando **Evolution API** (credenciais em `Github/.env` uma pasta acima do tracker)
- Grupo dedicado nome **"erros claude token tracker"**
- Batch a cada **15 minutos** (agrupa erros, não spamma)

**Observação Patrick:** "porque ainda tá só eu então meio fodase, depois organizo melhor". Solo por hora, mensagens só pra Patrick.

**Por quê:** ver problema antes do user reclamar.

**Status:** PENDENTE — ALTA pra prod público

---

### C19 · Termos de Uso + Política de Privacidade

**Problema:** sem termos legais, qualquer disputa vira problema. LGPD exige privacy policy explícita.

**Solução:** boilerplate adaptado (~2h escrevendo + revisar com Patrick). Páginas `/terms` e `/privacy` no app. Checkbox no cadastro "aceito termos".

**Observação Patrick:** "pode adicionar que aproveito pra colocar no meu domínio também futuramente, hoje não tem site ativo em `ciatotech.com`". Termos reutilizáveis pra ciatotech.com.

**Por quê:** lei brasileira. Sem isso, app inválido pra users brasileiros tecnicamente.

**Status:** PENDENTE — OBRIGATÓRIO pra prod público

---

### C20 · Documentação pública (README + setup collectors)

**Problema:** user novo registra, e agora? Como conecta Claude Code dele? Como configura tampermonkey?

**Solução:** README rewrite + page `/docs` no app com:
- Como pegar webhook token (Settings)
- Como instalar Claude Code hook (settings.json + script Python)
- Como configurar tampermonkey (extension Chrome/Firefox)
- Como rodar Codex collector (Windows/Mac/Linux)
- FAQ + troubleshooting

**Por quê:** sem docs, conversão de cadastro pra usuário ativo cai pra ~5%.

**Status:** PENDENTE — ALTA pra prod público

---

### C21 · Alerta de custo total (proteção operacional) — SIMULAÇÃO

**Observação Patrick:** "não sei se precisa disso hoje, mas se quiser simular só comigo top". Implementar como prova de conceito, ativar limite alto pra testar trigger.

**Solução:** cron daily soma `cost_usd` total do dia. Se passar X (configurável, default $50), manda alerta WhatsApp via Evolution.

**Por quê:** evita susto na fatura. Útil futuro multi-tenant.

**Status:** SIMULAÇÃO (Patrick teste solo)

---

### C22 · Process manager (Docker restart policy)

**Problema:** node crasha = fica down até reboot manual. Scheduled task Windows reinicia local, mas em VPS Linux não tem.

**Solução:** docker `restart: unless-stopped` no compose prod. Container morre = re-spawna auto. Healthcheck garante restart só se realmente quebrado (não loop).

**Por quê:** uptime crítico em prod.

**Status:** PENDENTE — ALTA pra prod público (já parcialmente coberto via C16)

---

## EXTRAS · Bugs descobertos fora das 3 fases

### X23 · `start-tracker.bat` desiste se Docker Desktop demora mais que 15 min pra subir

**Problema:** quando tu liga o PC, o bat de autostart do tracker começa a esperar o Docker. Hoje o limite é 15 minutos. Se Docker Desktop demorar mais (PC lento, SSD ocupado, update do Docker), o bat morre e o server fica down até tu subir na mão.

**Aconteceu:** 20/05/2026 09:13 — Patrick reiniciou PC, Docker bootou lento, bat estourou 15min em `ERRO: Docker não iniciou apos 15 minutos`.

**Solução:**
1. Subir limite de 15 → 30 minutos (mudança trivial em 1 linha do bat).
2. Garantir Docker Desktop sobe com Windows (`AutoStart: true` em settings-store.json + registry HKCU\Run). **JÁ APLICADO 20/05/2026** — reduz cenário do problema mas não elimina.
3. Opcional futuro: bat detecta Docker não-rodando e tenta forçar start via `Docker Desktop.exe -Autostart` antes de desistir.

**Por quê:** Docker auto-start no Windows nem sempre respeita config. Tracker depende dele. Sem ele = server down até intervenção manual.

**Gravidade pra ti solo:** MÉDIA. Já te pegou 1x, tu nota porque app não responde.
**Gravidade pra prod público:** N/A (em VPS Linux Docker tá ativo via systemd, não tem esse problema).

**Status:** MITIGADO PARCIAL (Docker autostart fixado), PENDENTE bat timeout bump

---

## Decisões pendentes Patrick

1. **Disparar Fase A (Onda 10):** aguardando "vai".
2. **Domínio Fase C:** sub-domain de `ciatotech.com` (ex: `tokens.ciatotech.com`)? Patrick confirmar.

---

## Como usar este doc

**Sessões futuras:** ler este arquivo + `resolucoes-erros.md` no início pra ter contexto completo do que já foi feito e o que falta.

**Quando concluir uma ação:** mover entry pra `resolucoes-erros.md` com data + worker + arquivos tocados + validação. Atualizar status aqui pra `RESOLVIDO`.

**Quando descobrir bug novo:** adicionar entry nova com numeração sequencial (X23, X24, etc, prefixo X = extra fora das fases).

**Auto-pacing:** se houver +10 ações abertas, considerar nova onda. Manter ondas focadas em 1 tema (segurança, perf, UX, etc).
