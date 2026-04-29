import { useState } from "react";
import { Folder, FolderOpen, FileText } from "lucide-react";
import type { SkillFile } from "@/hooks/useSkills";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children: TreeNode[];
  size?: number;
}

function buildTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();
  for (const f of files) {
    const parts = f.path.split("/");
    let parent: TreeNode[] = root;
    let pathSoFar = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
      const isLast = i === parts.length - 1;
      const type: "file" | "dir" = isLast ? f.type : "dir";
      let existing = parent.find((n) => n.name === part);
      if (!existing) {
        existing = { name: part, path: pathSoFar, type, children: [], size: isLast ? f.size : undefined };
        parent.push(existing);
        if (type === "dir") dirMap.set(pathSoFar, existing);
      }
      parent = existing.children;
    }
  }
  // Sort: dirs first, then alpha
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(root);
  return root;
}

interface NodeProps {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string, type: "file" | "dir") => void;
  depth: number;
}

function NodeView({ node, selectedPath, onSelect, depth }: NodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected = selectedPath === node.path;
  const padding = `${0.5 + depth * 0.75}rem`;

  if (node.type === "dir") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 py-1 text-xs hover:bg-muted/40 transition-colors text-left"
          style={{ paddingLeft: padding, paddingRight: "0.5rem" }}
        >
          {open ? <FolderOpen className="h-3.5 w-3.5 text-info shrink-0" /> : <Folder className="h-3.5 w-3.5 text-info shrink-0" />}
          <span className="truncate text-foreground">{node.name}</span>
        </button>
        {open && node.children.map((c) => (
          <NodeView key={c.path} node={c} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path, "file")}
      className={`w-full flex items-center gap-1.5 py-1 text-xs transition-colors text-left ${
        isSelected ? "bg-info/15 text-info" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
      style={{ paddingLeft: padding, paddingRight: "0.5rem" }}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate flex-1">{node.name}</span>
      {node.size !== undefined && (
        <span className="text-[10px] tabular-nums opacity-60">{formatSize(node.size)}</span>
      )}
    </button>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface Props {
  files: SkillFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function SkillFileTree({ files, selectedPath, onSelect }: Props) {
  const tree = buildTree(files);
  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Arquivos
      </div>
      <div className="max-h-[60vh] overflow-y-auto py-1">
        {tree.map((n) => (
          <NodeView key={n.path} node={n} selectedPath={selectedPath} onSelect={(p, t) => t === "file" && onSelect(p)} depth={0} />
        ))}
      </div>
    </div>
  );
}
