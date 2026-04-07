import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateUserRole } from "@/hooks/useSettings";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

interface Props {
  users: UserRow[];
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  super_admin: "default",
  admin: "secondary",
  user: "outline",
  pending: "destructive",
};

export function UserManagement({ users }: Props) {
  const updateRole = useUpdateUserRole();

  function handleApprove(id: string) {
    updateRole.mutate({ id, role: "user" }, { onSuccess: () => toast.success("Usuario aprovado!") });
  }

  function handleReject(id: string) {
    updateRole.mutate({ id, role: "pending" }, { onSuccess: () => toast.success("Usuario rejeitado") });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead>Acoes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{u.email}</TableCell>
            <TableCell>{u.display_name || "-"}</TableCell>
            <TableCell>
              <Badge variant={roleBadgeVariant[u.role] || "outline"}>{u.role}</Badge>
            </TableCell>
            <TableCell className="text-sm">{formatDate(u.created_at)}</TableCell>
            <TableCell>
              {u.role === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(u.id)}>
                    Aprovar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)}>
                    Rejeitar
                  </Button>
                </div>
              )}
              {u.role === "user" && (
                <Button size="sm" variant="outline" onClick={() => updateRole.mutate({ id: u.id, role: "admin" })}>
                  Promover
                </Button>
              )}
              {u.role === "super_admin" && <span className="text-xs text-muted-foreground">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
