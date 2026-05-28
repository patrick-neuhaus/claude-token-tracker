# Audit W-B1 - Filters & constants

## Status

Read-only audit concluído. Não achei P0.

**Todos os `<option>` em `NativeSelect/select`:**
- `EntriesPage.tsx:72/85`: sentinels `value=""`; modelo/fonte dinâmicos via `/entries/distinct` OK.
- `DashboardFilters.tsx:68/81`: sentinels `value=""`; fonte/projeto dinâmicos OK.
- `SessionsPage.tsx:132`: sentinel projeto; projetos dinâmicos OK.
- `SkillUsagePage.tsx:138`: sentinel projeto; projetos dinâmicos OK.
- `PricingDrawer.tsx:178`: opções vêm de `SUPPORTED_MODELS` hardcoded.
- `SettingsForm.tsx:214`: opções vêm de `DOW_OPTIONS` hardcoded 0-6, aceitável como enum de calendário.

**Projetos:** dropdowns OK, todos vêm de `useProjects()`.

**FilterChip:** componente aceita label genérico corretamente; problema está em callers que passam `cat` bruto ou arrays fixos.

## Findings (P0-P3) — severity / descricao / file:line / fix

| Sev | Descrição | file:line | Fix |
|---|---|---:|---|
| P1 | `SUPPORTED_MODELS` do pricing é hardcoded no frontend e já diverge do backend `PRICING` (`gpt-5.5-pro`, `gpt-5.4-nano`, legacy etc. ficam fora do override). | `client/src/components/settings/PricingDrawer.tsx:22`, `:177` | Expor endpoint de modelos efetivos (`PRICING` + modelos observados + overrides) e popular o select por API. |
| P1 | Tabela "Referência de Preços por Modelo" duplica pricing hardcoded e está stale: UI diz atualizado `2026-04-29`, backend pricing diz `2026-05-19`. | `client/src/components/settings/WebhookInfo.tsx:62`, `:306` | Renderizar a tabela a partir do mesmo pricing source do backend. |
| P1 | Narrativa de fonte está errada para qualquer fonte que não seja `claude-code`: `codex` vira "claude.ai". | `client/src/components/dashboard/MonthNarrative.tsx:33` | Usar `displayLabel(topSource.source)` ou mapa dinâmico. |
| P2 | Presets de data duplicados em vários lugares, com listas/ordem diferentes. | `DateRangeFilter.tsx:22`, `DashboardFilters.tsx:16`, `SessionsPage.tsx:116`, `AnalyticsPage.tsx:145`, `ProjectDetailPage.tsx:32` | Centralizar presets em um módulo único e permitir subset por prop. |
| P2 | `SessionTimeFilters` reimplementa presets manualmente; "Hoje" usa `applyPreset(1)`, que é últimas 24h, não começo do dia. | `client/src/components/sessions/SessionTimeFilters.tsx:29`, `:48` | Reusar `DateRangeFilter/presetToRange` ou corrigir semântica de hoje. |
| P2 | `DashboardFilters` carrega `distinct` mas só usa `sources`; modelo virou input livre, sem dropdown/descoberta dinâmica. | `client/src/components/dashboard/DashboardFilters.tsx:26`, `:28`, `:56` | Usar `distinct.models` em select/combobox com `displayModelName`. |
| P2 | Categorias de Skills são hardcoded; skill nova com categoria fora da lista aparece em "all", mas não é filtrável. | `client/src/pages/SkillsPage.tsx:15`, `:197` | Derivar categorias de `skills.map(s.category)` ou endpoint metadata. |
| P2 | Sources/status de Skills estão codificados no client e repetidos no roteamento de detalhe. | `client/src/pages/SkillsPage.tsx:20`, `:22`; `client/src/pages/SkillDetailPage.tsx:103` | Derivar sources/status do backend ou exportar metadados de domínio. |
| P2 | Analytics model trend renderiza label bruto (`label: name`), diferente de `EntriesPage`/`ModelCostBars`. | `client/src/pages/AnalyticsPage.tsx:185` | Usar `displayModelName(name)` no label, mantendo key bruto. |
| P2 | Tabelas principais ainda mostram `source`/`model` bruto, apesar de dropdowns usarem `displayLabel/displayModelName`. | `EntriesTable.tsx:57`, `:63`; `SessionsTable.tsx:66`; `ProjectDetailPage.tsx:212`; `AddSessionDialog.tsx:93` | Aplicar `displayLabel` e `displayModelName` nas renderizações user-facing. |
| P3 | `FilterChipGroup` recebe categoria bruta (`label: cat`), então UI mostra `code-review`, `implementation` etc. | `client/src/pages/SkillsPage.tsx:197` | Criar formatter/label map derivado ou vindo da API. |
| P3 | `MODEL_COLORS`/`SOURCE_COLORS` em `constants.ts` são OK como visual constants, mas `SOURCE_COLORS` dá fallback muted para fonte nova. | `client/src/lib/constants.ts:27`, `:35` | Para fontes dinâmicas, usar paleta por índice/hash em vez de mapa fechado. |
| P3 | `displayModelName("gpt-5.5")` vira "Gpt 5.5"; labels ficam menos consistentes. | `client/src/lib/constants.ts:81` | Preservar acrônimos conhecidos: GPT, API, CLI etc. |

## Resumo executivo

O buraco quente não é mais `EntriesPage` modelo/fonte: ali está dinâmico. O que sobrou mais perigoso é **pricing/modelos hardcoded** (`PricingDrawer` + `WebhookInfo`) e **labels brutos/inconsistentes** espalhados depois que os filtros foram corrigidos.

A correção com maior ROI: criar uma camada única de metadata/formatters para `models`, `sources`, `date presets`, `skill categories/sources/status`, e fazer os componentes renderizarem label formatado sem perder o value bruto para query/API.
