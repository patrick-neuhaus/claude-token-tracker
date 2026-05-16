import { Button } from "@/components/ui/button";
import { Pill, type PillVariant } from "@/components/shared/Pill";
import { AppTable, type AppTableColumn } from "@/components/data/AppTable";
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

const rolePillVariant: Record<string, PillVariant> = {
  super_admin: "ok",
  admin: "info",
  user: "neutral",
  pending: "warn",
};

export function UserManagement({ users }: Props) {
  const updateRole = useUpdateUserRole();

  function handleApprove(id: string) {
    updateRole.mutate({ id, role: "user" }, { onSuccess: () => toast.success("Usuario aprovado!") });
  }

  function handleReject(id: string) {
    updateRole.mutate({ id, role: "pending" }, { onSuccess: () => toast.success("Usuario rejeitado") });
  }

  const columns: AppTableColumn<UserRow>[] = [
    {
      key: "email",
      header: "Email",
      width: "minmax(200px,2fr)",
      render: (v) => <span className="truncate" title={v}>{v}</span>,
    },
    {
      key: "display_name",
      header: "Nome",
      width: "minmax(140px,1.5fr)",
      render: (v) => <span className="truncate">{v || "-"}</span>,
    },
    {
      key: "role",
      header: "Role",
      width: "120px",
      render: (v) => <Pill variant={rolePillVariant[v] || "neutral"}>{v}</Pill>,
    },
    {
      key: "created_at",
      header: "Criado em",
      width: "150px",
      render: (v) => <span className="text-muted-foreground tabular-nums">{formatDate(v)}</span>,
    },
    {
      key: "_actions",
      header: "Ações",
      width: "minmax(180px,1fr)",
      render: (_v, u) => (
        <>
          {u.role === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleApprove(u.id)}>Aprovar</Button>
              <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)}>Rejeitar</Button>
            </div>
          )}
          {u.role === "user" && (
            <Button size="sm" variant="outline" onClick={() => updateRole.mutate({ id: u.id, role: "admin" })}>
              Promover
            </Button>
          )}
          {u.role === "super_admin" && <span className="text-xs text-muted-foreground">—</span>}
        </>
      ),
    },
  ];

  return <AppTable<UserRow> columns={columns} data={users} rowKey="id" />;
}
