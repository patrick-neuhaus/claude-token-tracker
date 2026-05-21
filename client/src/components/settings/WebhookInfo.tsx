import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";

interface Props {
  webhookToken: string;
}

interface PayloadField {
  campo: string;
  tipo: string;
  desc: string;
}

const payloadFields: PayloadField[] = [
  { campo: "source", tipo: "string", desc: "Ex: claude-code, claude.ai, codex" },
  { campo: "model", tipo: "string", desc: "Nome do modelo usado" },
  { campo: "input_tokens", tipo: "int", desc: "Tokens de entrada" },
  { campo: "output_tokens", tipo: "int", desc: "Tokens de saída" },
  { campo: "cache_read_tokens", tipo: "int", desc: "Tokens lidos do cache (opcional)" },
  { campo: "cache_write_tokens", tipo: "int", desc: "Tokens escritos no cache (opcional)" },
  { campo: "session_id", tipo: "string", desc: "ID da sessão (opcional, agrupa entries)" },
  { campo: "timestamp", tipo: "ISO8601", desc: "Quando ocorreu (opcional, usa now() se omitido)" },
  { campo: "auto_name", tipo: "string", desc: "Nome automático da sessão (opcional)" },
];

const payloadColumns: AppTableColumn<PayloadField>[] = [
  {
    key: "campo",
    header: "Campo",
    width: "minmax(160px,1fr)",
    mono: true,
    render: (v) => <span className="text-xs">{v}</span>,
  },
  {
    key: "tipo",
    header: "Tipo",
    width: "120px",
    render: (v) => <span className="text-xs text-muted-foreground">{v}</span>,
  },
  {
    key: "desc",
    header: "Descrição",
    width: "minmax(220px,2fr)",
    render: (v) => <span className="text-xs text-muted-foreground">{v}</span>,
  },
];

interface PricingRow {
  model: string;
  input: string;
  output: string;
  cacheRead: string;
  cacheWrite: string;
  badge?: string;
  badgeVariant?: "info" | "warning";
  legacy?: boolean;
}

const pricingRows: PricingRow[] = [
  { model: "gpt-5.5", badge: "Codex", input: "$5.00", output: "$30.00", cacheRead: "$0.50", cacheWrite: "$5.00" },
  { model: "gpt-5.4-mini", input: "$0.75", output: "$4.50", cacheRead: "$0.075", cacheWrite: "$0.75" },
  { model: "claude-opus-4-7", badge: "atual", input: "$5.00", output: "$25.00", cacheRead: "$0.50", cacheWrite: "$6.25" },
  { model: "claude-sonnet-4-6", badge: "atual", input: "$3.00", output: "$15.00", cacheRead: "$0.30", cacheWrite: "$3.75" },
  { model: "claude-haiku-4-5", badge: "atual", input: "$1.00", output: "$5.00", cacheRead: "$0.10", cacheWrite: "$1.25" },
  { model: "claude-opus-4-6", legacy: true, input: "$5.00", output: "$25.00", cacheRead: "$0.50", cacheWrite: "$6.25" },
  { model: "claude-opus-4-1", legacy: true, badge: "legacy", badgeVariant: "warning", input: "$15.00", output: "$75.00", cacheRead: "$1.50", cacheWrite: "$18.75" },
  { model: "claude-haiku-3-5", legacy: true, badge: "legacy", badgeVariant: "warning", input: "$0.80", output: "$4.00", cacheRead: "$0.08", cacheWrite: "$1.00" },
];

const pricingColumns: AppTableColumn<PricingRow>[] = [
  {
    key: "model",
    header: "Modelo",
    width: "minmax(220px,2fr)",
    render: (_v, r) => (
      <span className={`font-mono text-xs ${r.legacy ? "text-muted-foreground" : ""}`}>
        {r.model}
        {r.badge && (
          <span className={`ml-1 ${r.badgeVariant === "warning" ? "text-warning" : "text-muted-foreground"}`}>
            ({r.badge})
          </span>
        )}
      </span>
    ),
  },
  {
    key: "input",
    header: "Input/1M",
    width: "110px",
    align: "right",
    mono: true,
    render: (v, r) => <span className={r.legacy ? "text-muted-foreground" : ""}>{v}</span>,
  },
  {
    key: "output",
    header: "Output/1M",
    width: "110px",
    align: "right",
    mono: true,
    render: (v, r) => <span className={r.legacy ? "text-muted-foreground" : ""}>{v}</span>,
  },
  {
    key: "cacheRead",
    header: "Cache Read/1M",
    width: "130px",
    align: "right",
    mono: true,
    render: (v, r) => <span className={r.legacy ? "text-muted-foreground" : ""}>{v}</span>,
  },
  {
    key: "cacheWrite",
    header: "Cache Write 5m/1M",
    width: "150px",
    align: "right",
    mono: true,
    render: (v, r) => <span className={r.legacy ? "text-muted-foreground" : ""}>{v}</span>,
  },
];

export function WebhookInfo({ webhookToken }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showClaudeAiGuide, setShowClaudeAiGuide] = useState(false);
  const timerRef = useRef<number | null>(null);

  function copyText(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }
        setCopied(label);
        timerRef.current = window.setTimeout(() => {
          setCopied(null);
          timerRef.current = null;
        }, 2000);
      })
      .catch((err) => {
        console.error("[WebhookInfo] copy failed:", err);
      });
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const webhookUrl = `${window.location.origin}/api/webhook/track-tokens`;

  const claudeAiCurlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: ${webhookToken}" \\
  -d '{
    "source": "claude.ai",
    "model": "claude-opus-4-6",
    "input_tokens": 1500,
    "output_tokens": 800,
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
    "session_id": "minha-sessao-123",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'`;

  const codexCurlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: ${webhookToken}" \\
  -d '{
    "source": "codex",
    "model": "gpt-5.5",
    "input_tokens": 1500,
    "output_tokens": 800,
    "cache_read_tokens": 400,
    "cache_write_tokens": 0,
    "session_id": "codex-session-123",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'`;

  return (
    <>
      <Section title="Webhook">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">URL do Webhook</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 text-sm break-all">{webhookUrl}</code>
              <Button size="icon" variant="outline" onClick={() => copyText(webhookUrl, "url")}>
                {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Token (header X-Webhook-Token)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 text-sm font-mono">{webhookToken}</code>
              <Button size="icon" variant="outline" onClick={() => copyText(webhookToken, "token")}>
                {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Claude Code Setup */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Configuração — Claude Code</p>
            <p className="text-sm text-muted-foreground mb-3">
              Configure o hook no <code className="rounded bg-muted px-1 py-0.5">~/.claude/settings.json</code> apontando para o script Python:
            </p>
            <div className="rounded bg-muted p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
{`{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /caminho/para/claude_code_hook.py"
          }
        ]
      }
    ]
  }
}`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Configure as variáveis de ambiente <code className="rounded bg-muted px-1">TOKEN_TRACKER_WEBHOOK</code> e{" "}
              <code className="rounded bg-muted px-1">TOKEN_TRACKER_TOKEN</code> no seu sistema.
            </p>
          </div>

          {/* Guia claude.ai */}
          <div className="border-t pt-4">
            <button
              className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors text-muted-foreground w-full text-left"
              onClick={() => setShowClaudeAiGuide(!showClaudeAiGuide)}
            >
              {showClaudeAiGuide ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Configuração — claude.ai / API Anthropic
            </button>

            {showClaudeAiGuide && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Para rastrear uso da API Anthropic diretamente ou via scripts externos, envie um POST para o webhook após cada chamada:
                </p>

                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Exemplo com cURL:</p>
                  <div className="rounded bg-muted p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto relative">
                    {claudeAiCurlExample}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => copyText(claudeAiCurlExample, "curl")}
                    >
                      {copied === "curl" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Exemplo Codex:</p>
                  <div className="rounded bg-muted p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto relative">
                    {codexCurlExample}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => copyText(codexCurlExample, "codex-curl")}
                    >
                      {copied === "codex-curl" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Campos do payload:</p>
                  <AppTable<PayloadField>
                    rowKey="campo"
                    data={payloadFields}
                    columns={payloadColumns}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  💡 O webhook é stateless — cada chamada registra 1 entry. Para agrupar em sessões, use o mesmo <code className="rounded bg-muted px-1">session_id</code> em todas as calls da mesma conversa.
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Referência de Preços por Modelo"
        description={<span>Atualizado 2026-04-29 · fontes: <a href="https://platform.claude.com/docs/en/about-claude/pricing" target="_blank" rel="noopener" className="text-info hover:underline">Claude</a> e <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noopener" className="text-info hover:underline">OpenAI</a></span>}
      >
        <AppTable<PricingRow>
          rowKey="model"
          data={pricingRows}
          columns={pricingColumns}
        />
      </Section>
    </>
  );
}
