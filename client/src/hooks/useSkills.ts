import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SkillSummary {
  name: string;
  description: string;
  lockedAt: string | null;
  fileCount: number;
  category: string | null;
}

export interface SkillFile {
  path: string;
  type: "file" | "dir";
  size?: number;
}

export interface SkillDetail {
  name: string;
  description: string;
  body: string;
  lockedAt: string | null;
  files: SkillFile[];
}

export function useSkillsList() {
  return useQuery<SkillSummary[]>({
    queryKey: ["skills", "list"],
    queryFn: () => api.get("/skills"),
    staleTime: 60_000,
  });
}

export function useSkillDetail(name: string | undefined) {
  return useQuery<SkillDetail>({
    queryKey: ["skills", "detail", name],
    queryFn: () => api.get(`/skills/${name}`),
    staleTime: 60_000,
    enabled: !!name,
  });
}

/** Loads a raw text file inside the skill folder (e.g. references/foo.md). */
export function useSkillFile(name: string | undefined, filePath: string | null) {
  return useQuery<string>({
    queryKey: ["skills", "file", name, filePath],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/skills/${name}/file?path=${encodeURIComponent(filePath!)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(`Failed to load ${filePath}`);
      return res.text();
    },
    staleTime: 60_000,
    enabled: !!name && !!filePath,
  });
}
