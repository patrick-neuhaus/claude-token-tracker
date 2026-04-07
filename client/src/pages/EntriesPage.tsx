import { useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { EntriesTable } from "@/components/entries/EntriesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { NativeSelect } from "@/components/shared/NativeSelect";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";

async function downloadCsv(params: URLSearchParams) {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/entries/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `entries-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EntriesPage() {
  const [page, setPage] = useState(1);
  const [model, setModel] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useEntries({ page, model, source, from, to });
  const d = data as any;

  function clearFilters() {
    setModel("");
    setSource("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Entradas</h1>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <Label className="text-xs">Modelo</Label>
          <Input
            placeholder="opus, sonnet..."
            value={model}
            onChange={(e) => { setModel(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fonte</Label>
          <NativeSelect
            sizing="default"
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
          >
            <option value="">Todas</option>
            <option value="claude-code">claude-code</option>
            <option value="claude.ai">claude.ai</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Limpar filtros
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            const p = new URLSearchParams();
            if (model) p.set("model", model);
            if (source) p.set("source", source);
            if (from) p.set("from", from);
            if (to) p.set("to", to);
            downloadCsv(p);
          }}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : d?.entries?.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <EntriesTable entries={d.entries} />
          </div>
          <Pagination page={page} pages={d.pages} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState message="Nenhuma entrada encontrada." />
      )}
    </div>
  );
}
