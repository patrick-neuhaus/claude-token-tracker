import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Match {
  line: number;
  text: string;
}

interface Props {
  body: string;
  skillName: string;
}

export function SkillSearch({ body, skillName }: Props) {
  const [query, setQuery] = useState("");

  const lines = useMemo(() => {
    return body.split("\n").map((text, i) => ({ line: i + 1, text }));
  }, [body]);

  const fuse = useMemo(
    () =>
      new Fuse(lines, {
        keys: ["text"],
        threshold: 0.3,
        ignoreLocation: true,
        includeMatches: true,
      }),
    [lines],
  );

  const results: Match[] = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query.trim()).slice(0, 50).map((r) => r.item);
  }, [query, fuse]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Buscar dentro de ${skillName}/SKILL.md...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {query.trim() && (
        <div className="text-xs text-muted-foreground">
          {results.length === 0
            ? "Nenhum resultado."
            : `${results.length} ${results.length === 1 ? "resultado" : "resultados"}`}
        </div>
      )}

      <div className="space-y-2">
        {results.map((m) => (
          <div
            key={m.line}
            className="border border-border bg-card rounded-md px-3 py-2 text-xs font-mono"
          >
            <span className="text-muted-foreground tabular-nums mr-3">L{m.line}</span>
            <span className="text-foreground whitespace-pre-wrap">{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
