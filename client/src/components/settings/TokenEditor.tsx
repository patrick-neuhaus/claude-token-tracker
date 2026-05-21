import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Copy, FileJson, Link2, RotateCcw, Save, Upload } from "lucide-react";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── HSL/HEX utils ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function hexToHsl(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return `${h} ${s}% ${l}%`;
}
function hslToHex(str: string): string {
  const m = String(str).trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return "#000000";
  const [r, g, b] = hslToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  return rgbToHex(r, g, b);
}
function relLum(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relLum(...hexToRgb(hex1));
  const l2 = relLum(...hexToRgb(hex2));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function safeBtoa(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// ── Token registry ──
interface TokenDef {
  id: string;
  label: string;
  helper?: string;
  contrastWith?: string;
}
const TOKEN_SECTIONS: Array<{ title: string; description?: string; tokens: TokenDef[] }> = [
  {
    title: "Marca",
    description: "Cores principais usadas em CTAs, botões, destaques.",
    tokens: [
      { id: "--primary", label: "Primária", helper: "Botões e links", contrastWith: "--primary-foreground" },
      { id: "--accent", label: "Acento", helper: "Highlights" },
      { id: "--ring", label: "Foco (ring)", helper: "Anel de foco em inputs" },
    ],
  },
  {
    title: "Sidebar",
    description: "Cores da barra lateral fixa.",
    tokens: [
      { id: "--sidebar-background", label: "Fundo" },
      { id: "--sidebar-accent", label: "Item ativo / hover" },
      { id: "--sidebar-indicator", label: "Indicador (barrinha)" },
    ],
  },
  {
    title: "Superfícies",
    description: "Fundos da aplicação e cartões.",
    tokens: [
      { id: "--background", label: "Fundo da página" },
      { id: "--card", label: "Fundo do card" },
      { id: "--foreground", label: "Texto principal", contrastWith: "--background" },
      { id: "--muted-foreground", label: "Texto secundário", contrastWith: "--background" },
      { id: "--border", label: "Bordas" },
    ],
  },
  {
    title: "Status semânticos",
    tokens: [
      { id: "--success", label: "Sucesso" },
      { id: "--warning", label: "Aviso" },
      { id: "--destructive", label: "Erro" },
    ],
  },
];

const COLOR_PRESETS: Record<string, Record<string, string>> = {
  "CRM Dark": {
    "--primary": "220 90% 55%",
    "--accent": "280 60% 50%",
    "--ring": "220 90% 55%",
    "--background": "222 20% 10%",
    "--foreground": "220 15% 92%",
    "--card": "222 20% 14%",
    "--border": "222 20% 22%",
    "--muted-foreground": "220 15% 72%",
    "--sidebar-background": "222 20% 7%",
    "--sidebar-accent": "222 20% 15%",
    "--sidebar-indicator": "220 90% 65%",
    "--success": "152 70% 45%",
    "--warning": "38 90% 55%",
    "--destructive": "0 85% 55%",
  },
  "Ops Default": {
    "--primary": "184 100% 18%",
    "--accent": "12 65% 55%",
    "--ring": "184 100% 18%",
    "--background": "30 33% 96%",
    "--foreground": "16 38% 12%",
    "--card": "0 0% 100%",
    "--border": "30 20% 87%",
    "--muted-foreground": "20 29% 33%",
    "--sidebar-background": "184 100% 18%",
    "--sidebar-accent": "184 80% 25%",
    "--sidebar-indicator": "12 65% 55%",
    "--success": "152 85% 30%",
    "--warning": "38 92% 50%",
    "--destructive": "0 100% 43%",
  },
  "Wiki Sage": {
    "--primary": "145 40% 35%",
    "--accent": "38 80% 55%",
    "--ring": "145 40% 35%",
    "--background": "120 10% 96%",
    "--foreground": "130 25% 12%",
    "--card": "0 0% 100%",
    "--border": "120 10% 85%",
    "--muted-foreground": "130 15% 40%",
    "--sidebar-background": "145 40% 30%",
    "--sidebar-accent": "145 40% 38%",
    "--sidebar-indicator": "38 80% 60%",
    "--success": "152 80% 32%",
    "--warning": "38 90% 50%",
    "--destructive": "0 90% 45%",
  },
};

const STORAGE_KEY = "ds-tokens-override";
type Tab = "editor" | "presets" | "export";

function readDefaultTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const root = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const sec of TOKEN_SECTIONS) {
    for (const t of sec.tokens) {
      const v = root.getPropertyValue(t.id).trim();
      if (v) out[t.id] = v;
    }
  }
  return out;
}
function readOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function applyAll(overrides: Record<string, string>, defaults: Record<string, string>) {
  for (const [k, v] of Object.entries(overrides)) {
    document.documentElement.style.setProperty(k, v);
  }
  for (const k of Object.keys(defaults)) {
    if (!(k in overrides)) document.documentElement.style.removeProperty(k);
  }
}

export function TokenEditor() {
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("editor");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const defs = readDefaultTokens();
    setDefaults(defs);
    const saved = readOverrides();
    setOverrides(saved);
    for (const [k, v] of Object.entries(saved)) {
      document.documentElement.style.setProperty(k, v);
    }
  }, []);

  const valueOf = (id: string) => overrides[id] ?? defaults[id] ?? "";
  const isOverridden = (id: string) => id in overrides;

  function commit(next: Record<string, string>) {
    setOverrides(next);
    applyAll(next, defaults);
  }
  function handleChange(id: string, hex: string) {
    commit({ ...overrides, [id]: hexToHsl(hex) });
  }
  function handleResetToken(id: string) {
    const next = { ...overrides };
    delete next[id];
    commit(next);
  }
  function handleResetAll() {
    commit({});
    toast.success("Tokens restaurados ao padrão");
  }
  function applyPreset(name: string) {
    const preset = COLOR_PRESETS[name];
    if (!preset) return;
    commit({ ...preset });
    toast.success(`Preset "${name}" aplicado`);
  }

  function handleSave() {
    const bg = hslToHex(valueOf("--background"));
    const fg = hslToHex(valueOf("--foreground"));
    const ratio = contrastRatio(bg, fg);
    if (ratio < 3) {
      toast.error(`Contraste text/bg ${ratio.toFixed(1)}:1 abaixo de 3:1 — salvar bloqueado`);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    toast.success("Tema salvo");
  }
  function handleExportCss() {
    const lines = [":root {"];
    for (const [k, v] of Object.entries(overrides)) lines.push(`  ${k}: ${v};`);
    lines.push("}");
    const blob = new Blob([lines.join("\n")], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tokens-override.css";
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleExportJson() {
    const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(String(ev.target?.result));
        commit(data);
        toast.success("Tema importado");
      } catch {
        toast.error("JSON inválido");
      }
    };
    reader.readAsText(f);
  }
  function handleShareUrl() {
    try {
      const b64 = safeBtoa(JSON.stringify(overrides));
      const u = new URL(window.location.href);
      u.searchParams.set("theme", b64);
      navigator.clipboard?.writeText(u.toString());
      toast.success("Link do tema copiado");
    } catch {
      toast.error("Clipboard indisponível");
    }
  }

  // Global contrast banner
  const bgHex = hslToHex(valueOf("--background"));
  const fgHex = hslToHex(valueOf("--foreground"));
  const globalRatio = contrastRatio(bgHex, fgHex);
  const globalOk = globalRatio >= 4.5;
  const globalWarn = globalRatio >= 3 && globalRatio < 4.5;

  const TABS: Array<[Tab, string]> = [
    ["editor", "Editor"],
    ["presets", "Presets"],
    ["export", "Export / Import"],
  ];

  return (
    <Section
      title="Design System"
      description="Editor de tokens de cor com WCAG, presets, export/import."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleResetAll} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5" disabled={globalRatio < 3}>
            <Save className="h-3.5 w-3.5" />
            Salvar
          </Button>
        </>
      }
    >
      {/* WCAG banner */}
      {!globalOk && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-xs mb-3",
            globalWarn
              ? "bg-warning/10 text-warning border border-warning/30"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {globalWarn
            ? `Contraste text/bg ${globalRatio.toFixed(1)}:1 — abaixo de WCAG AA (4.5). Corrija antes de produção.`
            : `Contraste text/bg ${globalRatio.toFixed(1)}:1 — CRÍTICO (<3). Salvar bloqueado.`}
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 border-b border-border mb-4">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "px-3 py-2 text-sm transition-colors -mb-px border-b-2",
              tab === k
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "editor" && (
        <div className="space-y-4">
          {TOKEN_SECTIONS.map((sec) => (
            <div key={sec.title} className="rounded-md border border-border/60 bg-card/40 p-3">
              <h4 className="text-sm font-semibold">{sec.title}</h4>
              {sec.description && (
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">{sec.description}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {sec.tokens.map((t) => (
                  <TokenRow
                    key={t.id}
                    token={t}
                    value={valueOf(t.id)}
                    overridden={isOverridden(t.id)}
                    contrastValue={t.contrastWith ? valueOf(t.contrastWith) : null}
                    onChange={(hex) => handleChange(t.id, hex)}
                    onReset={() => handleResetToken(t.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "presets" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(COLOR_PRESETS).map(([name, preset]) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className="text-left rounded-md border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex gap-1 mb-2">
                {["--primary", "--accent", "--background", "--sidebar-background"].map((tk) => (
                  <span
                    key={tk}
                    className="h-7 w-7 rounded border border-border/30"
                    style={{ background: preset[tk] ? `hsl(${preset[tk]})` : "transparent" }}
                  />
                ))}
              </div>
              <div className="text-sm font-medium">{name}</div>
              <div className="text-xs text-muted-foreground">Clique para aplicar</div>
            </button>
          ))}
        </div>
      )}

      {tab === "export" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCss} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              Exportar CSS
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJson} className="gap-1.5">
              <FileJson className="h-3.5 w-3.5" />
              Exportar JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Importar JSON
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={handleShareUrl} className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Copiar link
            </Button>
          </div>
          <pre className="rounded-md bg-muted/40 border border-border/60 p-3 text-xs font-mono overflow-auto max-h-72">
            {Object.keys(overrides).length === 0
              ? "// Nenhum override ativo — tema padrão em uso"
              : JSON.stringify(overrides, null, 2)}
          </pre>
        </div>
      )}
    </Section>
  );
}

// ── TokenRow ──
interface TokenRowProps {
  token: TokenDef;
  value: string;
  overridden: boolean;
  contrastValue: string | null;
  onChange: (hex: string) => void;
  onReset: () => void;
}
function TokenRow({ token, value, overridden, contrastValue, onChange, onReset }: TokenRowProps) {
  const hex = value ? hslToHex(value) : "#000000";
  const contrastHex = contrastValue ? hslToHex(contrastValue) : null;
  const ratio = contrastHex ? contrastRatio(hex, contrastHex) : null;
  const ratioCrit = ratio !== null && ratio < 3;
  const ratioWarn = ratio !== null && ratio >= 3 && ratio < 4.5;
  const ratioOk = ratio !== null && ratio >= 4.5;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-card/60",
        ratioCrit ? "border-destructive/40" : "border-border/60"
      )}
    >
      <label
        className="relative shrink-0 h-9 w-9 rounded-md border border-border/60 cursor-pointer overflow-hidden"
        style={{ background: value ? `hsl(${value})` : "transparent" }}
      >
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={`Cor ${token.label}`}
        />
      </label>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium">{token.label}</span>
          {overridden && (
            <span className="text-[9px] font-semibold uppercase px-1 py-px rounded bg-accent/15 text-accent tracking-wider">
              custom
            </span>
          )}
          {ratio !== null && (
            <span
              title={`${ratio.toFixed(2)}:1 vs ${token.contrastWith}`}
              className={cn(
                "text-[9px] font-bold px-1 py-px rounded",
                ratioCrit
                  ? "bg-destructive/15 text-destructive"
                  : ratioWarn
                  ? "bg-warning/15 text-warning"
                  : "bg-success/15 text-success"
              )}
            >
              {ratioCrit ? `✗ ${ratio.toFixed(1)}` : ratioWarn ? `⚠ ${ratio.toFixed(1)}` : ratioOk ? `AA ${ratio.toFixed(1)}` : ""}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {hex} · {value}
        </div>
        {token.helper && <div className="text-[10px] text-muted-foreground">{token.helper}</div>}
      </div>
      {overridden && (
        <button
          type="button"
          onClick={onReset}
          aria-label={`Restaurar ${token.label}`}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
