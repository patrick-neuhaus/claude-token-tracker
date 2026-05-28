# Codex xhigh PRD Validation — 2026-05-26

Segunda opinião independente sobre roles + LGPD + content storage + sources genéricos + ambientes + tracker×supply-mep + waves order. Codex gpt-5.5 reasoning xhigh, read-only.

## 1. Roles + LGPD

Recomendação: **3 roles de produto + grants temporários**, não 4+ roles granulares.

| Papel | Permissões recomendadas |
|---|---|
| `user` | Vê, exporta e apaga os próprios dados. Cria/revoga próprios webhook tokens. |
| `manager` | Vê agregados do time/org, custos, tendências e health. Não vê raw prompts, cwd, paths ou sessões individuais por padrão. Willy entra aqui. |
| `admin` | Gerencia usuários, pricing, fontes, retenção, tokens revogados e auditoria. Raw cross-user só via suporte/grant/break-glass. Patrick entra aqui. |
| `support_grant` | Não é role fixa. É permissão temporária, com escopo, motivo, expiração e audit log. |

Confronto: **"Patrick admin vê tudo de todos" é produto ruim e LGPD frágil**. Tecnicamente o operador do banco sempre pode acessar, mas a UI/API não deve tratar isso como permissão normal.

Decisões:

- Admin vê agregados cross-user por padrão.
- Raw data de outro usuário exige `support_access_grants(user_id, granted_to, scopes, reason, expires_at, revoked_at)`.
- Willy não deve ser admin. Manager comercial/operacional, sem secrets e sem raw user data.
- Webhook token não é role. É credencial com scopes: `ingest:tokens`, `ingest:skills`, `ingest:tools`, `ingest:compactions`, `read:own-metrics`, `admin:replay` etc.
- Todo token deve ter `user_id`, `source_id`, `scopes`, `expires_at`, `revoked_at`, `last_used_at`, `rate_limit`.
- Sim, precisa audit log de visualização sensível: raw event view, export, impersonation, support grant, deletion, token creation/revocation.
- Corrigindo premissa: **LGPD Art. 9 não é "dados sensíveis"**. Dados sensíveis estão no Art. 5º, II; tratamento de sensíveis no Art. 11; direitos do titular no Art. 18. Art. 9 trata de informação/transparência ao titular.
- Contexto de conversa, cwd, nome de cliente, path de repo e primeira mensagem podem ser dado pessoal e podem conter dado sensível. Trate como dado pessoal por padrão.
- Right to erasure: hard delete dos dados brutos pessoais; anonimização para rollups históricos. Audit log mínimo pode ficar se houver base legal/segurança, mas sem payload bruto.

## 2. Content Storage

Armazenar "metadados ricos" sim. Mas cuidado: metadado aqui é quase telemetria comportamental.

**Campos que valem armazenar:**

- `ingestion_event_id`, `source_event_id`, `idempotency_key_hash`, `collector_version`.
- `user_id`, `org_id` opcional, `source_id`, `provider`, `raw_model`, `canonical_model_key`.
- `event_type`: `token_entry`, `skill_invocation`, `tool_invocation`, `compaction`.
- Tokens canônicos: `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `reasoning_tokens`, `thinking_tokens`, `total_tokens`.
- `token_extras jsonb` para campos raros: audio, image, web search, server-side tools, provider quirks.
- `pricing_snapshot_id`, `pricing_status`, `cost_usd`, `cost_brl`, `fx_rate_snapshot`.
- `timestamp`, `received_at`, `processed_at`, `latency_ms`, `queue_latency_ms`.
- `session_id`, `project_id`, `conversation_ref`.
- `tool_names`, `tool_counts`, `tool_duration_ms`, `tool_error_count`.
- `skill_name`, `skill_version`, `duration_ms`, `success`, `error_classification`.
- `finish_reason`, `stop_reason`, `http_status`, `retry_count`, `dlq_reason`.
- `privacy_level`: `normal`, `personal`, `sensitive_possible`, `redacted`.

**Não armazenar por default:**

- Full messages.
- Tool args brutos.
- Bash command completo.
- Full file paths.
- Prompt summary gerado da primeira mensagem para usuários externos.

Sobre `cwd`: sensível. Use HMAC por usuário para agrupamento e um alias editável pelo usuário. Exemplo: `cwd_hash`, `cwd_basename_redacted`, `project_alias`. Full path só client-side ou criptografado e visível apenas ao dono.

Sobre `auto_name` pela primeira mensagem: útil, mas é PII esperando acontecer. Para Patrick-only, aceitável com flag. Para multi-user externo, default off ou title local-only. Detector de PII ajuda, mas não resolve juridicamente.

Sobre pointer local tipo `~/.codex/sessions/...jsonl`: boa feature, mas **owner-only**. No servidor, guarde referência redatada ou hash; o collector/local app resolve o caminho.

## 3. Sources Genéricos

Não use enum estendido. Vai virar manutenção infinita.

**Pattern recomendado:**

- `source` = de onde veio o evento: `claude-code`, `codex-cli`, `claude-ai-tampermonkey`, `openwebui`, `custom-webhook`.
- `provider` = quem cobra/modela: `anthropic`, `openai`, `google`, `xai`, `deepseek`, `mistral`, `moonshot`, `ollama`, `bedrock`, `azure-openai`, `vertex-ai`, `openrouter`.
- `model` = `raw_model` + `canonical_model_key`.
- `adapter` = parser/normalizador versionado por source/provider.

**Contrato:**

```ts
CanonicalUsageEvent {
  source_id
  provider
  raw_model
  canonical_model_key | null
  event_type
  token_breakdown
  cost_breakdown
  session_ref
  project_ref
  privacy_labels
  raw_payload_ref
}
```

Schema: colunas canônicas para o comum + `jsonb` para extras. Não faça tudo blob; dashboard precisa indexar.

**Normalização:**

- Não detectar source por prefixo do modelo. Bedrock, Azure, OpenRouter e proxies quebram isso.
- Unknown model deve gravar com `pricing_status='unknown'`, custo zero/quarentena, e aparecer em tela de revisão.
- Pricing precisa ser componentizado, não `input/output` fixo.

**Componentes mínimos de pricing:**

- `input_uncached`
- `input_cached_read`
- `input_cache_write`
- `output`
- `reasoning_output`
- `thinking_output`
- `tool_invocation`
- `web_search`
- `batch_discount`
- `local_zero_cost`

**Lista de mercado que importa para tracker em 2026:**

| Provider/source | Campos importantes |
|---|---|
| Anthropic Claude / Claude Code / API | input, output, cache creation/write, cache read, possível thinking. Anthropic diferencia cache read/write em pricing. |
| OpenAI / Codex / Azure OpenAI | input, output, cached input, reasoning tokens. OpenAI expõe `cached_tokens`; reasoning tokens são tratados como parte relevante de uso/custo. |
| Google Gemini / Vertex | input, output, cache, `thoughtsTokenCount`/thinking. |
| xAI Grok | prompt/output/cached prompt tokens e server-side tool invocations. |
| DeepSeek | cache hit/miss prompt tokens, output. |
| Mistral | prompt/completion/total e cached tokens. |
| Moonshot/Kimi | input/output, cache hit, web search fee. |
| Ollama/local | `prompt_eval_count`, `eval_count`, durations; custo marginal zero, mas dá para estimar hardware depois. |
| AWS Bedrock | wrapper: input/output/cache read/cache write; provider real pode ser Anthropic/Mistral/etc. |
| Azure OpenAI | deployment + OpenAI-like usage, cached tokens. |

## 4. Ambientes

Recomendação: **4 nomes, 3 runtimes persistentes no máximo**.

| Ambiente | O que é |
|---|---|
| `dev` | Local Docker do Patrick. Dados fake ou cópia pequena anonimizada. |
| `test` | Ephemeral CI com Testcontainers. Não é ambiente persistente. |
| `homolog` / `staging` | Docker profile simulando prod. Local no começo; VPS staging depois se houver usuário externo. |
| `prod` | VPS real. |

Confronto: criar "test DB persistente" para solo founder é desperdício e fonte de drift.

**DB strategy:**

- Um Postgres separado por ambiente. Pode ser no mesmo host, mas DB/container/volume/user/secrets separados.
- Não use schemas `dev/staging/prod` dentro do mesmo banco de produção.
- Homolog usa snapshot anonimizado de prod ou subset real do Patrick.
- Migrations: CI roda em banco limpo; homolog roda com snapshot; prod só depois de backup + dry-run/backfill batch-safe.

## 5. Tracker x Supply-MEP-V2

Compartilhar **padrão**, não acoplar produto.

Recomendação:

- Pode usar a mesma VPS/plataforma base: Traefik, Grafana, GlitchTip, GHCR, backups.
- Não compartilhar banco, secrets, migrations, domínio operacional ou deploy stack.
- Supply-MEP é projeto com risco de cliente. Tracker não pode derrubar ou consumir recurso dele.
- Use Docker stacks separadas, networks separadas, Postgres separado, resource limits e backups separados.
- Não crie agora `@artemis/observability`. Parece elegante, mas vai virar dependência cross-repo antes de ter maturidade.
- Copy-adapt de skills/agents por enquanto está correto.
- Extraia pacote compartilhado só quando existir o mesmo código real usado por 2-3 projetos e um processo de versionamento claro.

## 6. Waves Order

Sim, multi-user day-1 muda a ordem. Ele não pode ficar Wave 7 se houver qualquer usuário externo.

**Sequência recomendada:**

1. **Wave 0: decisões bloqueantes antes do PRD**
   Roles, privacy model, support grant, retention, source/provider/model registry, definição de "multi-user day-1". ADRs curtas.

2. **Wave 1: hardening legado imediato**
   Zod strict, CSRF, `normalizeModel`, timestamps com offset, zero-token reject, dedup NULL. Isso reduz risco antes de mexer em arquitetura.

3. **Wave 2: fundação V2 multi-user**
   Monorepo, users, auth, `user_id` obrigatório, webhook tokens com scopes, audit/privacy log, testcontainers, CI, pino.

4. **Wave 3: ingestion_events + idempotência universal**
   Queue Postgres com `user_id`, scopes, idempotency, DLQ. Ainda pode não ter todas as features migradas.

5. **Wave 4: worker transacional para `token_entry`**
   Primeiro fluxo vertical completo: webhook → queue → worker → canonical usage → sessions/projects.

6. **Wave 5: source registry + pricing snapshots**
   Adapters para 3 iniciais: Claude, Codex/OpenAI, generic custom webhook. Depois Gemini/Ollama/Kimi etc. Não tentar "todos os providers" antes do pipeline estar estável.

7. **Wave 6: features mantidas**
   Skill invocations, tool invocations, compactions, achievements. Achievements devem ser derivadas/recalculáveis, não parte crítica da ingestão.

8. **Wave 7: dashboards multi-user + LGPD**
   User dashboard, manager aggregate, admin ops, export, erase/anonymize, support grant UI, privacy audit.

9. **Wave 8: backfill + cutover**
   Não backfill full na Wave 0. Faça sample cedo, full em homolog, depois prod. Legacy fica fonte viva até V2 passar smoke real.

Estrangulamento: por **fluxo vertical**, não por camada abstrata. Primeiro `token_entry` ponta a ponta. Depois skills/tools/compactions.

## 7. Tracker-Specific Risks

1. **Multi-user falso**
   Se Patrick disser "multi-user" mas adiar privacy, export, erasure, audit e access control, o produto nasce com dívida regulatória. Melhor admitir "multi-user compatible" do que fingir SaaS.

2. **Source genérico infinito**
   "Toda IA do mercado" é armadilha. O produto precisa aceitar unknown bem, não suportar tudo perfeitamente. Registry + unknown pricing review é a defesa.

3. **Metadado vira vigilância**
   cwd, tool usage, skill names, primeira mensagem e paths revelam cliente, projeto, rotina e erro operacional. Se Willy/manager/admin enxergar isso sem grant, você criou um problema de confiança antes de criar valor.
