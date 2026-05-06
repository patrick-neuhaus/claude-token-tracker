# Claude Token Tracker

Dashboard local para rastrear uso de tokens do Claude e Codex/OpenAI.

## Pre-requisitos

- Node.js 22+
- Docker Desktop

## Setup rapido

```bash
# 1. Clone e entre na pasta
cd D:/DOCUMENTOS/Github/claude-token-tracker

# 2. Suba o PostgreSQL
npm run db:up

# 3. Instale dependencias
npm install --workspaces
npm install --save-dev concurrently --ignore-workspace-root-check

# 4. Crie o .env (copie o exemplo)
cp .env.example .env

# 5. Rode as migrations
npm run migrate

# 6. Inicie em modo dev (server + client)
npm run dev
```

Acesse `http://localhost:5173` (dev) ou `http://localhost:3001` (producao).

## Primeiro acesso

1. Abra o app e clique "Criar conta"
2. O **primeiro usuario** registrado vira `super_admin` automaticamente
3. Va em **Configuracoes** e copie seu **Webhook Token**
4. Cole o token nos coletores (veja abaixo)

## Configurar coletores

### Tampermonkey (claude.ai)

Edite `scripts/tampermonkey.js`:

```javascript
const WEBHOOK_URL = 'http://localhost:3001/api/webhook/track-tokens';
const WEBHOOK_TOKEN = 'cole-seu-token-aqui';
```

Instale o script no Tampermonkey.

### Claude Code (Python hook)

Defina as variaveis de ambiente:

```bash
export TOKEN_TRACKER_WEBHOOK=http://localhost:3001/api/webhook/track-tokens
export TOKEN_TRACKER_TOKEN=cole-seu-token-aqui
```

Ou edite diretamente `scripts/claude_code_hook.py`.

### Codex (collector)

Rode o setup do SkillForge para instalar o coletor:

```powershell
cd "C:\Users\Patrick Neuhaus\Documents\Github\skillforge-arsenal"
powershell -ExecutionPolicy Bypass -File codex/scripts/setup-codex-runtime.ps1
python codex/scripts/codex-token-collector.py --dry-run --limit 5
```

Para envio real, defina:

```powershell
$env:TOKEN_TRACKER_WEBHOOK="http://localhost:3002/api/webhook/track-tokens"
$env:TOKEN_TRACKER_TOKEN="cole-seu-token-aqui"
python codex/scripts/codex-token-collector.py
```

O payload usa `source: "codex"` e modelos OpenAI como `gpt-5.5`.

## Comandos

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Inicia server (3001) + client (5173) em modo dev |
| `npm run build` | Build de producao (client + server) |
| `npm start` | Inicia server de producao (serve tudo na porta 3001) |
| `npm run migrate` | Roda migrations do banco |
| `npm run db:up` | Sobe PostgreSQL via Docker |
| `npm run db:down` | Para o PostgreSQL |

## Stack

- **Frontend:** React 19 + TypeScript + Vite + shadcn/ui + Recharts
- **Backend:** Express 5 + TypeScript
- **Banco:** PostgreSQL 16 (Docker)
- **Auth:** bcrypt + JWT

## Estrutura

```
├── server/          # API Express
│   ├── src/
│   │   ├── routes/      # Endpoints da API
│   │   ├── services/    # Logica de negocio
│   │   ├── middleware/  # Auth, webhook, errors
│   │   └── config/      # DB, env, pricing
│   └── migrations/      # SQL migrations
├── client/          # React app
│   └── src/
│       ├── pages/       # Dashboard, Sessions, Entries, Settings, Admin
│       ├── components/  # UI components
│       ├── hooks/       # React Query hooks
│       └── contexts/    # Auth context
└── scripts/         # Coletores (Tampermonkey + Python hook)
```
