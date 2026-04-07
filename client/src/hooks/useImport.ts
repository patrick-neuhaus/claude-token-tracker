import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ImportResult {
  status: string;
  imported: number;
  errors: number;
  total: number;
  error_details: string[];
}

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csvText: string) =>
      api.post<ImportResult>("/import", { csv_text: csvText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}
