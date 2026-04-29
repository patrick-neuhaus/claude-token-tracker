import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type SkillSource = "skillforge" | "omc" | "builtin";

export interface SkillSummary {
  name: string;
  description: string;
  lockedAt: string | null;
  fileCount: number;
  category: string | null;
  source: SkillSource;
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
  source: SkillSource;
}

export function useSkillsList() {
  return useQuery<SkillSummary[]>({
    queryKey: ["skills", "list"],
    queryFn: () => api.get("/skills"),
    staleTime: 60_000,
  });
}

export function useSkillDetail(name: string | undefined, source?: SkillSource) {
  return useQuery<SkillDetail>({
    queryKey: ["skills", "detail", name, source ?? "auto"],
    queryFn: () => api.get(`/skills/${name}${source ? `?source=${source}` : ""}`),
    staleTime: 60_000,
    enabled: !!name,
  });
}

/** Loads a raw text file inside the skill folder (e.g. references/foo.md). */
export function useSkillFile(name: string | undefined, filePath: string | null, source?: SkillSource) {
  return useQuery<string>({
    queryKey: ["skills", "file", name, filePath, source ?? "auto"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const qs = new URLSearchParams({ path: filePath! });
      if (source) qs.set("source", source);
      const res = await fetch(
        `/api/skills/${name}/file?${qs.toString()}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(`Failed to load ${filePath}`);
      return res.text();
    },
    staleTime: 60_000,
    enabled: !!name && !!filePath,
  });
}
