import { useState, useRef, type DragEvent } from "react";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useImportCsv } from "@/hooks/useImport";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface PreviewRow {
  timestamp: string;
  source: string;
  model: string;
  inputTokens: string;
  outputTokens: string;
  costUsd: string;
}

function parseCsvPreview(text: string): { headers: string[]; rows: PreviewRow[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: PreviewRow[] = [];

  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const fields = lines[i].split(",").map((f) => f.trim());
    rows.push({
      timestamp: fields[0] || "",
      source: fields[1] || "",
      model: fields[2] || "",
      inputTokens: fields[3] || "0",
      outputTokens: fields[4] || "0",
      costUsd: fields[8] || "0",
    });
  }

  return { headers, rows };
}

export function CsvImport() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; rows: PreviewRow[] } | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportCsv();

  // B7.9 (P3.1 react-patterns): useCallback removed — none of these handlers are
  // passed to memoized children. Plain function declarations are simpler + lighter.
  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("Selecione um arquivo .csv");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      const previewData = parseCsvPreview(text);
      setPreview(previewData);
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      setTotalRows(Math.max(0, lines.length - 1));
    };
    reader.readAsText(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleImport() {
    if (!csvText) return;
    importMutation.mutate(csvText, {
      onSuccess: (data) => {
        toast.success(`${data.imported} entradas importadas com sucesso!`);
        if (data.errors > 0) {
          toast.warning(`${data.errors} linhas com erro foram ignoradas`);
        }
      },
      onError: (err) => {
        toast.error(`Erro na importacao: ${err.message}`);
      },
    });
  }

  function handleReset() {
    setCsvText(null);
    setFileName("");
    setPreview(null);
    setTotalRows(0);
    importMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const isSuccess = importMutation.isSuccess;
  const result = importMutation.data;

  return (
    <Section title={<span className="flex items-center gap-2"><Upload className="h-5 w-5" /> Importar CSV</span>}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importe dados históricos de uso a partir de um arquivo CSV exportado do Google Sheets.
        </p>

        {/* Drop zone */}
        {!csvText && !isSuccess && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8
              cursor-pointer transition-colors duration-200
              ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
              }
            `}
          >
            <Upload
              className={`h-10 w-10 transition-colors ${
                isDragging ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div className="text-center">
              <p className="text-sm font-medium">Arraste um arquivo CSV aqui</p>
              <p className="text-xs text-muted-foreground mt-1">
                ou clique para selecionar
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* File info + preview */}
        {csvText && !isSuccess && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{totalRows} linhas</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Remover
              </Button>
            </div>

            {/* Preview table */}
            {preview && preview.rows.length > 0 && (
              <div className="rounded-lg border">
                <div className="px-4 py-2 border-b">
                  <p className="text-xs text-muted-foreground font-medium">
                    Pre-visualizacao (primeiras {preview.rows.length} linhas)
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Input</TableHead>
                      <TableHead className="text-right">Output</TableHead>
                      <TableHead className="text-right">Cost (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">
                          {row.timestamp.length > 19
                            ? row.timestamp.slice(0, 19).replace("T", " ")
                            : row.timestamp}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {row.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{row.model}</TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {Number(row.inputTokens).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {Number(row.outputTokens).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {row.costUsd}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {totalRows} entradas
                </>
              )}
            </Button>
          </div>
        )}

        {/* Result */}
        {isSuccess && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-muted/50 p-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">{result.imported} entradas importadas</p>
                {result.errors > 0 && (
                  <p className="text-sm text-yellow-500 mt-1">
                    <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                    {result.errors} linhas com erro
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Total processado: {result.total} linhas
                </p>
              </div>
            </div>

            {result.error_details && result.error_details.length > 0 && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                <p className="text-xs font-medium text-yellow-500 mb-2">Detalhes dos erros:</p>
                <ul className="space-y-1">
                  {result.error_details.map((detail, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-mono">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="outline" onClick={handleReset} className="w-full">
              Importar outro arquivo
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
