import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, onPageChange }: Props) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        {page} / {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        Próxima
      </Button>
    </div>
  );
}
